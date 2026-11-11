import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../testing/test-providers';

import { MecanicsComponent } from './mecanics.component';

describe('MecanicsComponent', () => {
  let component: MecanicsComponent;
  let fixture: ComponentFixture<MecanicsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MecanicsComponent],
      providers: testProviders,
    })
    .compileComponents();

    fixture = TestBed.createComponent(MecanicsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
