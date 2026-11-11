import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { SUPPORTED_LANGS } from '../core/site.config';

/** Applies the route language to translations and to `<html lang>`. Navigation is handled by links. */
@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  constructor(
    public translate: TranslateService,
    @Inject(DOCUMENT) private document: Document
  ) {}

  changeLanguage(lang: string): void {
    if (!(SUPPORTED_LANGS as readonly string[]).includes(lang)) return;
    this.translate.use(lang);
    this.translate.defaultLang = lang;
    this.document.documentElement.lang = lang;
  }
}
