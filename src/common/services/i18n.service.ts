import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { MESSAGES, MessageKey, LanguageCode } from '../constants/messages.js';

@Injectable({ scope: Scope.REQUEST })
export class I18nService {
  private language: LanguageCode = 'en';

  constructor(@Inject(REQUEST) private request: Request) {
    this.detectLanguage();
  }

  /**
   * Detect language from request headers
   * Checks: Accept-Language, X-Language, lang query param (in order of priority)
   */
  private detectLanguage(): void {
    // Check X-Language header first (custom header for explicit language selection)
    const xLanguage = (this.request.headers['x-language'] as string)?.toLowerCase();
    if (xLanguage === 'ru' || xLanguage === 'en') {
      this.language = xLanguage as LanguageCode;
      return;
    }

    // Check Accept-Language header (standard HTTP header)
    const acceptLanguage = this.request.headers['accept-language'] as string;
    if (acceptLanguage) {
      // Extract primary language code (e.g., 'ru' from 'ru-RU,ru;q=0.9')
      const match = acceptLanguage.match(/^(en|ru)/i);
      if (match) {
        this.language = match[1].toLowerCase() as LanguageCode;
        return;
      }
    }

    // Default to English
    this.language = 'en';
  }

  /**
   * Translate a message key to the detected language
   * Falls back to EN if key or language not found
   */
  translate(key: MessageKey | string): string {
    const translations = MESSAGES[key as MessageKey];

    if (!translations) {
      // If message key doesn't exist, return the key itself
      return key;
    }

    return translations[this.language] || translations.en || key;
  }

  /**
   * Get current language
   */
  getLanguage(): LanguageCode {
    return this.language;
  }

  /**
   * Manually set language
   */
  setLanguage(lang: LanguageCode): void {
    if (lang === 'en' || lang === 'ru') {
      this.language = lang;
    }
  }
}
