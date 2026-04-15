import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable, map } from 'rxjs';
import { I18nService } from '../services/i18n.service.js';

export interface ApiResponse<T> {
  status: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  meta?: Record<string, any> | null;
}

/**
 * Wraps all successful responses in a consistent envelope:
 * { status: true, statusCode, message, data, meta? }
 *
 * Controller can return in two ways:
 * 1. Plain data → wrapped as { message: 'Success', data: <value>, meta: null }
 * 2. { message: '...', data: ... } → extracted and wrapped
 * 3. { message: '...', data: ..., meta: {...} } → extracted with meta
 *
 * Messages are translated based on Accept-Language or X-Language header
 */
@Injectable()
export class TransformInterceptor<T = any> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private i18n: I18nService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode || 200;

        // Check if data has { message, data } shape
        if (
          data &&
          typeof data === 'object' &&
          'message' in data &&
          'data' in data
        ) {
          const { message, data: returnData, meta } = data as {
            message: string;
            data: T;
            meta?: Record<string, any> | null;
          };

          // Translate message if it's a message key, otherwise use as-is
          const translatedMessage = this.i18n.translate(message as any);

          return {
            status: true,
            statusCode,
            message: translatedMessage,
            data: returnData,
            meta: meta ?? null,
          };
        }

        // Default: wrap entire return value in data with 'Success' message
        const defaultMessage = this.i18n.translate('common.success');
        return {
          status: true,
          statusCode,
          message: defaultMessage,
          data: data ?? null,
          meta: null,
        };
      }),
    );
  }
}
