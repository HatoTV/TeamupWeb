import { FetchBackend, HttpBackend, HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

/** Reads a public asset (e.g. "assets/i18n/fr.json", "data/lol/builds/meta.json") as text. Provided on the server only. */
export type ServerAssetReader = (path: string) => string | null;

export const SERVER_ASSET_READER = new InjectionToken<ServerAssetReader>('SERVER_ASSET_READER');

/**
 * Server-side HttpBackend: during prerendering there is no HTTP server for relative URLs, so JSON
 * assets are read from disk. Being the backend (not an interceptor), responses still go through
 * Angular's HTTP transfer cache and are reused by the browser during hydration.
 */
@Injectable()
export class ServerAssetsBackend implements HttpBackend {
  private readonly read = inject(SERVER_ASSET_READER);
  private readonly fallback = inject(FetchBackend);

  handle(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    const path = req.url.replace(/^\.?\//, '').split('?')[0];
    if (req.method !== 'GET' || /^[a-z]+:\/\//i.test(req.url) || !(path.startsWith('assets/') || path.startsWith('data/')) || !path.endsWith('.json')) {
      return this.fallback.handle(req);
    }
    const text = this.read(path);
    return text === null
      ? of(new HttpResponse({ status: 404, statusText: 'Not Found', url: req.url }))
      : of(new HttpResponse({ status: 200, statusText: 'OK', body: JSON.parse(text), url: req.url }));
  }
}
