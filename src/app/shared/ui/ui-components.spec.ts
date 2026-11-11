import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { testProviders } from '../../../testing/test-providers';
import { DifficultyBadgeComponent } from './difficulty-badge.component';
import { MeterComponent } from './meter.component';
import { StepListComponent } from './step-list.component';
import { ChampionChipComponent } from './champion-chip.component';

describe('Shared UI components', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('fr', {
      UI: { DIFFICULTY: { LABEL: 'Difficulté', 1: 'Très facile', 5: 'Extrême' }, METER: '{{label}} : {{value}} sur {{max}}' },
    });
    translate.use('fr');
  });

  it('DifficultyBadge shows the label and clamps the level', () => {
    const fixture = TestBed.createComponent(DifficultyBadgeComponent);
    fixture.componentRef.setInput('level', 9);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Extrême');
    expect(fixture.nativeElement.getAttribute('style')).toContain('--diff-5');
  });

  it('DifficultyBadge dot variant has an accessible name', () => {
    const fixture = TestBed.createComponent(DifficultyBadgeComponent);
    fixture.componentRef.setInput('level', 1);
    fixture.componentRef.setInput('variant', 'dot');
    fixture.detectChanges();
    const dot = fixture.nativeElement.querySelector('[role="img"]');
    expect(dot.getAttribute('aria-label')).toBe('Difficulté : Très facile');
  });

  it('Meter renders value segments and an accessible summary', () => {
    const fixture = TestBed.createComponent(MeterComponent);
    fixture.componentRef.setInput('value', 3);
    fixture.componentRef.setInput('label', 'Utilité');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.meter__segment').length).toBe(5);
    expect(fixture.nativeElement.querySelectorAll('.is-on').length).toBe(3);
    expect(fixture.nativeElement.querySelector('[role="img"]').getAttribute('aria-label')).toBe('Utilité : 3 sur 5');
  });

  it('StepList numbers its steps', () => {
    const fixture = TestBed.createComponent(StepListComponent);
    fixture.componentRef.setInput('steps', ['A', '<bold>B</bold>']);
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('li');
    expect(items.length).toBe(2);
    expect(items[1].querySelector('.bold-text').textContent).toBe('B');
  });

  it('ChampionChip marks the side and keeps a decorative icon', () => {
    const fixture = TestBed.createComponent(ChampionChipComponent);
    fixture.componentRef.setInput('name', 'Janna');
    fixture.componentRef.setInput('iconSrc', 'x.webp');
    fixture.componentRef.setInput('side', 'enemy');
    fixture.detectChanges();
    expect(fixture.nativeElement.classList).toContain('chip--enemy');
    expect(fixture.nativeElement.querySelector('img').getAttribute('alt')).toBe('');
  });
});
