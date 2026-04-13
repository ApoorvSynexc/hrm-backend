import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Parses and validates pagination query params.
 * Defaults: page=1, limit=20. Max limit: 100.
 */
@Injectable()
export class ParsePaginationPipe
  implements PipeTransform<Record<string, string>, PaginationParams>
{
  transform(query: Record<string, string>): PaginationParams {
    const page = parseInt(query['page'] ?? '1', 10);
    const limit = parseInt(query['limit'] ?? '20', 10);

    if (isNaN(page) || page < 1) {
      throw new BadRequestException('page must be a positive integer');
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('limit must be between 1 and 100');
    }

    return { page, limit, skip: (page - 1) * limit };
  }
}
