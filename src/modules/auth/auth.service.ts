import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../user/repositories/user.repository.js';
import { TenantRepository } from '../tenant/repositories/tenant.repository.js';
import { RefreshTokenRepository } from './repositories/refresh-token.repository.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtPayload } from '../../common/decorators/current-user.decorator.js';

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private tenantRepository: TenantRepository,
    private refreshTokenRepository: RefreshTokenRepository,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    let user;

    if (!dto.tenantSlug) {
      // SUPER_ADMIN login — find user with tenantId = null
      user = await this.userRepository.findSuperAdmin(dto.email);
    } else {
      // Tenant user login
      const tenant = await this.tenantRepository.findBySlug(dto.tenantSlug);

      if (!tenant || tenant.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid or inactive tenant');
      }

      user = await this.userRepository.findByTenantAndEmail(tenant.id, dto.email);
    }

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId || '',
      role: user.role?.name ?? '',
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.generateRefreshToken(user.id, user.tenantId);

    return { accessToken, refreshToken };
  }

  async refreshTokens(
    dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { tokenId, secret } = this.parseRefreshToken(dto.refreshToken);

    // Find refresh token in database
    const refreshTokenRecord = await this.refreshTokenRepository.findById(tokenId);

    if (!refreshTokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if revoked or expired
    if (refreshTokenRecord.revokedAt || refreshTokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired or been revoked');
    }

    // Verify token secret
    const secretValid = await bcrypt.compare(secret, refreshTokenRecord.tokenHash);
    if (!secretValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Fetch user with role
    const user = await this.userRepository.findByIdWithRole(refreshTokenRecord.userId);

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is inactive or deleted');
    }

    // Revoke old token
    await this.refreshTokenRepository.revoke(tokenId);

    // Generate new tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId || '',
      role: user.role?.name ?? '',
    };

    const newAccessToken = await this.jwtService.signAsync(payload);
    const newRefreshToken = await this.generateRefreshToken(user.id, user.tenantId);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string, userId: string): Promise<void> {
    const { tokenId, secret } = this.parseRefreshToken(refreshToken);

    const refreshTokenRecord = await this.refreshTokenRepository.findById(tokenId);

    if (!refreshTokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify ownership
    if (refreshTokenRecord.userId !== userId) {
      throw new UnauthorizedException('Cannot revoke another user\'s token');
    }

    // Verify token secret
    const secretValid = await bcrypt.compare(secret, refreshTokenRecord.tokenHash);
    if (!secretValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke token
    await this.refreshTokenRepository.revoke(tokenId);
  }

  private async generateRefreshToken(userId: string, tenantId: string | null): Promise<string> {
    // Generate random secret (64 bytes = 128 hex chars)
    const secret = crypto.randomBytes(64).toString('hex');

    // Hash the secret for storage
    const tokenHash = await bcrypt.hash(secret, 10);

    // Calculate expiry (7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Store in database
    const record = await this.refreshTokenRepository.create({
      userId,
      tenantId,
      tokenHash,
      expiresAt,
    });

    // Return token as id.secret (format allows O(1) lookup)
    return `${record.id}.${secret}`;
  }

  private parseRefreshToken(token: string): { tokenId: string; secret: string } {
    const parts = token.split('.');
    if (parts.length !== 2) {
      throw new BadRequestException('Invalid refresh token format');
    }

    const [tokenId, secret] = parts;
    if (!tokenId || !secret) {
      throw new BadRequestException('Invalid refresh token format');
    }

    return { tokenId, secret };
  }
}
