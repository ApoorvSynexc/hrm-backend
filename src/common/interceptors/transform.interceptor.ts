import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Observable, map } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator.js';

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
 * If controller returns { data, meta }, meta is promoted to top-level
 * Otherwise, meta defaults to null and entire return value goes into data
 */
@Injectable()
export class TransformInterceptor<T = any> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();
    const handler = context.getHandler();

    // Get custom message from @ResponseMessage() decorator, default to 'Success'
    const customMessage = this.reflector.get<string>(RESPONSE_MESSAGE_KEY, handler);
    const message = customMessage ?? 'Success';

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode || 200;

        // Check if data has { data, meta } shape (paginated/structured response)
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'meta' in data &&
          Object.keys(data).length === 2
        ) {
          const { data: paginatedData, meta } = data as {
            data: T;
            meta: Record<string, any> | null;
          };
          return {
            status: true,
            statusCode,
            message,
            data: paginatedData,
            meta,
          };
        }

        // Standard response: wrap entire return value in data
        return {
          status: true,
          statusCode,
          message,
          data: data ?? null,
          meta: null,
        };
      }),
    );
  }
}
