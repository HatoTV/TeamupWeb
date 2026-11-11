import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { testProviders } from '../../../testing/test-providers';
import { GlobalSearchComponent } from './global-search.component';

describe('GlobalSearchComponent', () => {
  let fixture: ComponentFixture<GlobalSearchComponent>;
  let input: HTMLInputElement;
  let router: Router;

  const key = (k: string) => input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const type = (value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({ imports: [GlobalSearchComponent], providers: testProviders });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('fr', { NAV: { LOL_LANING: 'Laning' }, LOL: { LANING: { TITLE3: 'Trading' } } });
    translate.use('fr');
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(GlobalSearchComponent);
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input');

    input.dispatchEvent(new Event('focus'));
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('assets/data/champions.json').flush({
      version: '1.0.0',
      champions: [
        { slug: 'ahri', name: 'Ahri', ddragonId: 'Ahri', roles: ['mid'], difficulty: 3, hasMatchups: true },
        { slug: 'akali', name: 'Akali', ddragonId: 'Akali', roles: ['mid'], difficulty: 4, hasMatchups: true },
        { slug: 'master-yi', name: 'Master Yi', ddragonId: 'MasterYi', roles: ['jungle'], difficulty: 1, hasMatchups: true, aliases: ['maitre yi'] },
      ],
    });
    http.expectOne('assets/rlmecanics.json').flush([{ name: 'Ceiling Shot', subname: '' }]);
    tick();
  }));

  it('exposes combobox semantics', () => {
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    type('ah');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    const listbox = fixture.nativeElement.querySelector('[role="listbox"]');
    expect(input.getAttribute('aria-controls')).toBe(listbox.id);
    expect(fixture.nativeElement.querySelectorAll('[role="option"]').length).toBe(1);
  });

  it('moves the active option with arrow keys and opens it with Enter', () => {
    type('a');
    key('ArrowDown');
    fixture.detectChanges();
    const active = input.getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    expect(fixture.nativeElement.querySelector(`#${active}`).getAttribute('aria-selected')).toBe('true');

    key('Enter');
    expect(router.navigate).toHaveBeenCalledWith(['/fr/lol/matchups'], {
      fragment: undefined,
      queryParams: { champion: 'ahri' },
    });
  });

  it('finds guides with their anchor and mechanics with their slug', () => {
    type('trading');
    key('Enter');
    expect(router.navigate).toHaveBeenCalledWith(['/fr/lol/laning'], { fragment: 'Trading', queryParams: undefined });

    type('ceiling');
    key('Enter');
    expect(router.navigate).toHaveBeenCalledWith(['/fr/rocket/mecanics/ceiling-shot'], {
      fragment: undefined,
      queryParams: undefined,
    });
  });

  it('matches alternative spellings', () => {
    type('maitre');
    key('Enter');
    expect(router.navigate).toHaveBeenCalledWith(['/fr/lol/matchups'], {
      fragment: undefined,
      queryParams: { champion: 'master-yi' },
    });
  });

  it('closes on Escape, then clears on a second Escape', () => {
    type('ah');
    key('Escape');
    fixture.detectChanges();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    key('Escape');
    fixture.detectChanges();
    expect(input.value).toBe('');
  });
});
