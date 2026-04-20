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
    en: 'The resource you are looking for is not found',
    ru: 'Ресурс, который вы ищете, не найден',
  },
  'error.bad_request': {
    en: 'Invalid request',
    ru: 'Неверный запрос',
  },
  'error.internal_server': {
    en: 'Internal server error',
    ru: 'Внутренняя ошибка сервера',
  },

  // Working Schedule
  'working_schedule.duplicate_name': {
    en: 'Working schedule with this name already exists for this tenant',
    ru: 'График работы с этим названием уже существует для этого тенанта',
  },
  'working_schedule.not_found': {
    en: 'Working schedule not found',
    ru: 'График работы не найден',
  },
  'working_schedule.tenant_not_found': {
    en: 'Tenant not found',
    ru: 'Тенант не найден',
  },
  'working_schedule.invalid_working_days': {
    en: 'workingDays must be a non-empty array',
    ru: 'workingDays должна быть непустым массивом',
  },
  'working_schedule.invalid_day': {
    en: 'Invalid day: {day}. Must be one of: {days}',
    ru: 'Неверный день: {day}. Должен быть одним из: {days}',
  },
} as const;

export type MessageKey = keyof typeof MESSAGES;
export type LanguageCode = 'en' | 'ru';
