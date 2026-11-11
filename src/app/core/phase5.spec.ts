import { TestBed } from '@angular/core/testing';
import { FetchBackend, HttpRequest, HttpResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { firstValueFrom, of } from 'rxjs';
import { testProviders } from '../../testing/test-providers';
import { SERVER_ASSET_READER, ServerAssetsBackend } from './server-assets';
import { SeoService } from './seo.service';
import { fallbackFor, srcsetFor, teamuppImageLoader } from './images/image-utils';

describe('ServerAssetsBackend', () => {
  const fetchBackend = { handle: jasmine.createSpy('handle').and.returnValue(of(new HttpResponse({ status: 200 }))) };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ServerAssetsBackend,
        { provide: FetchBackend, useValue: fetchBackend },
        { provide: SERVER_ASSET_READER, useValue: (path: string) => (path === 'assets/i18n/fr.json' ? '{"A":"b"}' : null) },
      ],
    });
  });

  it('serves JSON assets from disk', async () => {
    const backend = TestBed.inject(ServerAssetsBackend);
    const res = (await firstValueFrom(backend.handle(new HttpRequest('GET', './assets/i18n/fr.json')))) as HttpResponse<unknown>;
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ A: 'b' });
  });

  it('answers 404 for missing assets and delegates other requests', async () => {
    const backend = TestBed.inject(ServerAssetsBackend);
    const missing = (await firstValueFrom(backend.handle(new HttpRequest('GET', 'assets/data/none.json')))) as HttpResponse<unknown>;
    expect(missing.status).toBe(404);
    await firstValueFrom(backend.handle(new HttpRequest('GET', 'https://example.com/a.json')));
    expect(fetchBackend.handle).toHaveBeenCalled();
  });
});

describe('SeoService', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders }));

  it('sets title, description, canonical and hreflang alternates', () => {
    TestBed.inject(SeoService).setPage({ title: 'Picker', description: 'Desc', path: '/lol/picker' });
    const doc = TestBed.inject(DOCUMENT);
    expect(TestBed.inject(Title).getTitle()).toBe('Picker · TeamUpp');
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Desc');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.teamupp.app/fr/lol/picker');
    expect(doc.querySelector('link[hreflang="en"]')?.getAttribute('href')).toBe('https://www.teamupp.app/en/lol/picker');
    expect(doc.querySelector('link[hreflang="x-default"]')?.getAttribute('href')).toBe('https://www.teamupp.app/fr/lol/picker');
  });
});

describe('Image helpers', () => {
  it('builds AVIF/WebP srcsets for optimised images', () => {
    expect(srcsetFor('assets/img/site/bkgHome.webp', 'avif')).toContain('assets/img/opt/site/bkgHome-640.avif 640w');
    expect(fallbackFor('assets/img/site/bkgHome.webp')).toMatch(/opt\/site\/bkgHome-\d+\.webp$/);
    expect(srcsetFor('assets/img/unknown.png', 'webp')).toBe('');
  });

  it('loader keeps Data Dragon URLs and picks the closest local variant', () => {
    const ddragon = 'https://ddragon.leagueoflegends.com/cdn/1/img/champion/Ahri.png';
    expect(teamuppImageLoader({ src: ddragon, width: 96 })).toBe(ddragon);
    expect(teamuppImageLoader({ src: 'assets/img/site/bkgHome.webp', width: 700 })).toBe('assets/img/opt/site/bkgHome-1024.webp');
  });
});
