import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable, map } from 'rxjs';

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
 */
@Injectable()
export class TransformInterceptor<T = any> implements NestInterceptor<T, ApiResponse<T>> {
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
          return {
            status: true,
            statusCode,
            message,
            data: returnData,
            meta: meta ?? null,
          };
        }

        // Default: wrap entire return value in data with 'Success' message
        return {
          status: true,
          statusCode,
          message: 'Success',
          data: data ?? null,
          meta: null,
        };
      }),
    );
  }
}
