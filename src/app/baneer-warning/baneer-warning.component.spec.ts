import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaneerWarningComponent } from './baneer-warning.component';

describe('BaneerWarningComponent', () => {
  let component: BaneerWarningComponent;
  let fixture: ComponentFixture<BaneerWarningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaneerWarningComponent]
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
