/**
 * Response messages in multiple languages
 * Key format: 'action.subject' or descriptive key
 */
export const MESSAGES = {
  // Auth
  'auth.login_success': {
    en: 'Login successful',
    ru: 'Успешный вход',
  },
  'auth.token_refreshed': {
    en: 'Token refreshed',
    ru: 'Токен обновлен',
  },
  'auth.logout_success': {
    en: 'Logout successful',
    ru: 'Выход выполнен',
  },

  // Generic
  'common.success': {
    en: 'Success',
    ru: 'Успешно',
  },
  'common.created': {
    en: 'Created successfully',
    ru: 'Успешно создано',
  },
  'common.updated': {
    en: 'Updated successfully',
    ru: 'Успешно обновлено',
  },
  'common.deleted': {
    en: 'Deleted successfully',
    ru: 'Успешно удалено',
  },
  'common.fetched': {
    en: 'Data fetched successfully',
    ru: 'Данные успешно получены',
  },

  // Errors
  'error.unauthorized': {
    en: 'Unauthorized',
    ru: 'Неавторизованный',
  },
  'error.forbidden': {
    en: 'Insufficient permissions',
    ru: 'Недостаточно прав',
  },
  'error.not_found': {
    en: 'Resource not found',
    ru: 'Ресурс не найден',
  },
  'error.bad_request': {
    en: 'Invalid request',
    ru: 'Неверный запрос',
  },
  'error.internal_server': {
    en: 'Internal server error',
    ru: 'Внутренняя ошибка сервера',
  },
} as const;

export type MessageKey = keyof typeof MESSAGES;
export type LanguageCode = 'en' | 'ru';
