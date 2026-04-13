import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') ?? '';
    const tenantId = request.headers['x-tenant-id'] ?? '-';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<{ statusCode: number }>();
          const elapsed = Date.now() - start;
          this.logger.log(
            `${method} ${url} [tenant:${tenantId}] ${response.statusCode} +${elapsed}ms — ${ip} ${userAgent}`,
          );
        },
        error: (error: Error) => {
          const elapsed = Date.now() - start;
          this.logger.error(
            `${method} ${url} [tenant:${tenantId}] ERROR +${elapsed}ms — ${error.message}`,
          );
        },
      }),
    );
  }
}
