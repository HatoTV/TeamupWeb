import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, untracked } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouteContextService } from './route-context.service';
import { SUPPORTED_LANGS } from './site.config';

export const SITE_URL = 'https://www.teamupp.app';
const SITE_NAME = 'TeamUpp';
const DEFAULT_IMAGE = '/assets/img/og-default.jpg';

export interface PageSeo {
  /** Page title (without the site name). */
  title: string;
  description: string;
  /** Absolute or root-relative image for social cards. */
  image?: string;
  /** Path without language prefix; defaults to the current route. */
  path?: string;
}

/** Title, meta description, Open Graph / Twitter cards, canonical and hreflang alternates. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly ctx = inject(RouteContextService);

  setPage(page: PageSeo): void {
    const lang = this.ctx.lang();
    const path = page.path ?? this.ctx.path();
    const url = `${SITE_URL}/${lang}${path}`;
    const fullTitle = page.title ? `${page.title} · ${SITE_NAME}` : SITE_NAME;
    const image = this.absolute(page.image ?? DEFAULT_IMAGE);

    this.title.setTitle(fullTitle);
    this.setName('description', page.description);
    this.setProperty('og:type', 'website');
    this.setProperty('og:site_name', SITE_NAME);
    this.setProperty('og:title', fullTitle);
    this.setProperty('og:description', page.description);
    this.setProperty('og:url', url);
    this.setProperty('og:image', image);
    this.setProperty('og:locale', lang === 'fr' ? 'fr_FR' : 'en_US');
    this.setName('twitter:card', 'summary_large_image');
    this.setName('twitter:title', fullTitle);
    this.setName('twitter:description', page.description);
    this.setName('twitter:image', image);

    this.setLink('canonical', url);
    for (const alt of SUPPORTED_LANGS) {
      this.setLink('alternate', `${SITE_URL}/${alt}${path}`, alt);
    }
    this.setLink('alternate', `${SITE_URL}/fr${path}`, 'x-default');
  }

  private absolute(url: string): string {
    return /^https?:\/\//.test(url) ? url : `${SITE_URL}/${url.replace(/^\//, '')}`;
  }

  private setName(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private setProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content });
  }

  private setLink(rel: string, href: string, hreflang?: string): void {
    const head = this.document.head;
    const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`;
    let link = head.querySelector<HTMLLinkElement>(selector);
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', rel);
      if (hreflang) link.setAttribute('hreflang', hreflang);
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}

/**
 * Sets the page SEO from translation keys and keeps it in sync with the language.
 * Must be called in an injection context (component constructor / field initializer).
 */
export function injectPageSeo(page: () => { titleKey: string; descriptionKey: string; params?: object; image?: string } | null): void {
  const seo = inject(SeoService);
  const translate = inject(TranslateService);
  const ctx = inject(RouteContextService);
  effect(() => {
    ctx.lang();
    const p = page();
    if (!p) return;
    untracked(() =>
      translate
        .get([p.titleKey, p.descriptionKey], p.params)
        .subscribe((t: Record<string, string>) => seo.setPage({ title: t[p.titleKey], description: t[p.descriptionKey], image: p.image }))
    );
  });
}
