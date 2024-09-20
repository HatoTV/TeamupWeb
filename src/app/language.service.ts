// src/app/language.service.ts
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  constructor(public translate: TranslateService, private router: Router) {}

  changeLanguage(lang: string) {
    const supportedLangs = ['en', 'fr'];
    const defaultLang = this.translate.defaultLang || 'fr';

    if (supportedLangs.includes(lang)) {
      this.translate.use(lang);

      // Rediriger vers l'URL avec la nouvelle langue
      const currentUrl = this.router.url.split('/').slice(2).join('/'); // URL sans la langue
      this.router.navigate([`/${lang}/${currentUrl}`]);
      this.translate.defaultLang=lang;
    } else {
      // Si la langue n'est pas supportée, utiliser la langue par défaut
      this.translate.use(defaultLang);
    }
  }
}