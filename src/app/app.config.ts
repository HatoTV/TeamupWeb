import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom, inject, provideZoneChangeDetection } from '@angular/core';
import { PlatformLocation } from '@angular/common';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { parseUrl } from './core/route-context.service';
import { DEFAULT_LANG } from './core/site.config';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { IMAGE_CONFIG, IMAGE_LOADER } from '@angular/common';
import { teamuppImageLoader } from './core/images/image-utils';

import { routes } from './app.routes.js';
import { provideClientHydration } from '@angular/platform-browser';
import { HttpClient, provideHttpClient, withFetch } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

export function createTranslateLoader(httpClient: HttpClient) {
  return new TranslateHttpLoader(httpClient, './assets/i18n/', '.json');
}

/**
 * Loads the route language (and the French fallback) before the first render, so prerendered
 * text and the hydrated app match (no empty strings / layout shift during hydration).
 */
function initTranslations(): () => Promise<unknown> {
  const translate = inject(TranslateService);
  const location = inject(PlatformLocation);
  return () => {
    const lang = parseUrl(location.pathname).lang;
    translate.setDefaultLang(DEFAULT_LANG);
    const fallback = lang === DEFAULT_LANG ? of(null) : translate.getTranslation(DEFAULT_LANG);
    return firstValueFrom(forkJoin([translate.use(lang), fallback]));
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      // Hydration needs the initial route resolved before the first render (no layout shift).
      withEnabledBlockingInitialNavigation(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })
    ),
    provideClientHydration(),
    { provide: IMAGE_LOADER, useValue: teamuppImageLoader },
    { provide: IMAGE_CONFIG, useValue: { breakpoints: [96, 640, 1024, 1600], disableImageSizeWarning: true } },
    provideHttpClient(withFetch()),
    { provide: APP_INITIALIZER, multi: true, useFactory: initTranslations },
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: createTranslateLoader,
          deps: [HttpClient],
        },
        defaultLanguage: 'fr',
      })
    ),
  ],
};
