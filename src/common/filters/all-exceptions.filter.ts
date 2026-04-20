import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request } from 'express';
import { Prisma } from '../../../generated/prisma/client.js';
import { MESSAGES, LanguageCode } from '../constants/messages.js';

interface ErrorResponse {
  status: false;
  statusCode: number;
  message: string | string[];
  data: null;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  /**
   * Detect language from request headers
   * Checks: X-Language header, then Accept-Language header
   * Defaults to 'en'
   */
  private detectLanguage(request: Request): LanguageCode {
    const xLanguage = (request.headers['x-language'] as string)?.toLowerCase();
    if (xLanguage === 'ru' || xLanguage === 'en') {
      return xLanguage as LanguageCode;
    }

    const acceptLanguage = request.headers['accept-language'] as string;
    if (acceptLanguage) {
      const match = acceptLanguage.match(/^(en|ru)/i);
      if (match) {
        return match[1].toLowerCase() as LanguageCode;
      }
    }

    return 'en';
  }

  /**
   * Translate message key to the detected language
   */
  private translate(key: string, language: LanguageCode): string {
    const translations = MESSAGES[key as keyof typeof MESSAGES];
    if (!translations) {
      return key;
    }
    return translations[language] || translations.en || key;
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { url: string; method: string }>();
    const language = this.detectLanguage(request);

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let messageKey: string = 'error.internal_server';
    let customMessage: string | null = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const response = exception.getResponse();

      // Map HTTP status to message keys first
      if (statusCode === HttpStatus.UNAUTHORIZED) {
        messageKey = 'error.unauthorized';
      } else if (statusCode === HttpStatus.FORBIDDEN) {
        messageKey = 'error.forbidden';
      } else if (statusCode === HttpStatus.NOT_FOUND) {
        messageKey = 'error.not_found';
      } else if (statusCode === HttpStatus.BAD_REQUEST) {
        messageKey = 'error.bad_request';
      }

      // Get custom message if it exists and it's not a 404 with default Express message
      if (typeof response === 'string') {
        // For 404, ignore default Express messages like "Cannot GET /path"
        if (!(statusCode === HttpStatus.NOT_FOUND && response.startsWith('Cannot'))) {
          customMessage = response;
        }
      } else if (typeof response === 'object' && response !== null) {
        const res = response as Record<string, unknown>;
        const msg = (res['message'] as string | string[]) as string ?? exception.message;
        // For 404, ignore default Express messages
        if (!(statusCode === HttpStatus.NOT_FOUND && msg.startsWith('Cannot'))) {
          customMessage = msg;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma-specific errors
      statusCode = HttpStatus.BAD_REQUEST;
      messageKey = 'error.bad_request';

      switch (exception.code) {
        case 'P2002':
          customMessage = `Unique constraint violation on field: ${(exception.meta?.['target'] as string[])?.join(', ')}`;
          break;
        case 'P2025':
          statusCode = HttpStatus.NOT_FOUND;
          messageKey = 'error.not_found';
          break;
        case 'P2003':
          customMessage = 'Foreign key constraint violation';
          break;
        case 'P2014':
          customMessage = 'Required relation violation';
          break;
        default:
          customMessage = `Database error: ${exception.code}`;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      messageKey = 'error.bad_request';
      customMessage = 'Invalid data provided to database';
    } else if (exception instanceof Error) {
      customMessage = exception.message;
    }

    // Get translated message, or use custom message if set
    // If customMessage looks like a message key (contains a dot), try to translate it
    let message = customMessage || this.translate(messageKey, language);
    if (customMessage && customMessage.includes('.')) {
      const translated = this.translate(customMessage, language);
      if (translated !== customMessage) {
        message = translated;
      }
    }

    const responseBody: ErrorResponse = {
      status: false,
      statusCode,
      message,
      data: null,
    };

    // Log server errors
    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${statusCode}: ${message}`);
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, statusCode);
  }
}
