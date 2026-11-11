import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../testing/test-providers';

import { BaneerWarningComponent } from './baneer-warning.component';

describe('BaneerWarningComponent', () => {
  let component: BaneerWarningComponent;
  let fixture: ComponentFixture<BaneerWarningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaneerWarningComponent],
      providers: testProviders,
    })
    .compileComponents();

    fixture = TestBed.createComponent(BaneerWarningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
