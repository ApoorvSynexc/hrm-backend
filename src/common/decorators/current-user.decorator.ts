import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;         // user ID
  email: string;
  tenantId: string;
  role: string;
  iat?: number;
  exp?: number;
}

declare module 'express' {
  interface Request {
    user?: JwtPayload;
    tenantId?: string;
  }
}

/**
 * Extracts the authenticated user from the request.
 *
 * @example
 * // Get full user payload
 * @Get('profile')
 * getProfile(@CurrentUser() user: JwtPayload) { ... }
 *
 * // Get specific field
 * @Get('me')
 * getMe(@CurrentUser('email') email: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (field: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
