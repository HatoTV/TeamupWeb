import { TestBed } from '@angular/core/testing';
import { testProviders } from '../../testing/test-providers';

import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
    service = TestBed.inject(LanguageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('syncs the <html lang> attribute with the selected language', () => {
    service.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');
    service.changeLanguage('fr');
    expect(document.documentElement.lang).toBe('fr');
  });

  it('ignores unsupported languages', () => {
    service.changeLanguage('fr');
    service.changeLanguage('de');
    expect(document.documentElement.lang).toBe('fr');
  });
});
