import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DEFAULT_LANG, SUPPORTED_LANGS } from '../core/site.config';

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
    // French stays the fallback: keys missing in en.json are shown in French rather than raw.
    this.translate.setDefaultLang(DEFAULT_LANG);
    this.translate.use(lang);
    this.document.documentElement.lang = lang;
  }
}
