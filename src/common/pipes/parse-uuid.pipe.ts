import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates that a route param/query is a valid UUID v4.
 *
 * @example
 * @Get(':id')
 * getOne(@Param('id', ParseUUIDPipe) id: string) { ... }
 */
@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!UUID_REGEX.test(value)) {
      throw new BadRequestException(`Validation failed: "${value}" is not a valid UUID`);
    }
    return value;
  }
}
