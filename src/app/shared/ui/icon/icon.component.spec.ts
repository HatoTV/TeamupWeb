import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';

describe('IconComponent', () => {
  let fixture: ComponentFixture<IconComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(IconComponent);
  });

  it('renders a decorative svg by default', () => {
    fixture.componentRef.setInput('name', 'search');
    fixture.detectChanges();
    const svg: SVGElement = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelectorAll('circle, path').length).toBe(2);
  });

  it('exposes an accessible name when a label is given', () => {
    fixture.componentRef.setInput('name', 'star');
    fixture.componentRef.setInput('label', 'Difficulty');
    fixture.detectChanges();
    const svg: SVGElement = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Difficulty');
    expect(svg.getAttribute('aria-hidden')).toBeNull();
  });
});
