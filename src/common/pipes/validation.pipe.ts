import {
  Injectable,
  ValidationPipe as NestValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';

@Injectable()
export class ValidationPipe extends NestValidationPipe {
  createExceptionFactory() {
    return (errors: ValidationError[]) => {
      if (!errors || errors.length === 0) {
        return new BadRequestException('Validation failed');
      }

      // Get only the first error message
      const firstErrorMessage = this.getFirstErrorMessage(errors[0]);

      return new BadRequestException({
        statusCode: 400,
        message: firstErrorMessage,
        error: 'Bad Request',
      });
    };
  }

  private getFirstErrorMessage(error: ValidationError): string {
    // If constraints exist, return the first constraint message
    if (error.constraints) {
      const messages = Object.values(error.constraints);
      return messages[0] || `Validation failed for ${error.property}`;
    }

    // If no constraints but has children, recurse into first child
    if (error.children && error.children.length > 0) {
      return this.getFirstErrorMessage(error.children[0]);
    }

    // Default fallback
    return `Validation failed for ${error.property}`;
  }
}
