import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto, RefreshTokenDto, LogoutDto } from './dto/index.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtPayload } from '../common/decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @Body() dto: LogoutDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.authService.logout(dto.refreshToken, userId);
  }
}
