import { parseUrl } from './route-context.service';
import { normalizeForSearch, slugify } from './slug';

describe('parseUrl', () => {
  it('extracts language, path, fragment and section', () => {
    expect(parseUrl('/en/lol/laning?x=1#Trading')).toEqual({
      lang: 'en',
      path: '/lol/laning',
      fragment: 'Trading',
      section: 'lol',
    });
  });

  it('maps hubs and pages to sections', () => {
    expect(parseUrl('/fr/rocket/mecanics/pinch').section).toBe('rl');
    expect(parseUrl('/fr/tft').section).toBe('tft');
    expect(parseUrl('/fr/contact').section).toBe('about');
    expect(parseUrl('/fr/privacy').section).toBe('legal');
    expect(parseUrl('/fr/home').section).toBe('home');
  });

  it('falls back to French and home', () => {
    expect(parseUrl('/')).toEqual({ lang: 'fr', path: '/home', fragment: null, section: 'home' });
  });
});

describe('slug helpers', () => {
  it('slugifies mechanic names', () => {
    expect(slugify('Ceiling Shot')).toBe('ceiling-shot');
    expect(slugify('Flick Diagonal (Backflip)')).toBe('flick-diagonal-backflip');
    expect(slugify('Kai’Sa')).toBe('kai-sa');
  });

  it('normalizes accents and case for search', () => {
    expect(normalizeForSearch('  Stratégie Élevée ')).toBe('strategie elevee');
  });
});
