import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'response_message';

/**
 * Sets a custom success message for the response
 * If not set, defaults to 'Success'
 *
 * Usage:
 * @ResponseMessage('User created successfully')
 * create() { ... }
 */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
