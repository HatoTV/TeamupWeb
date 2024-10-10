import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TFTComponent } from './tft.component';

describe('TFTComponent', () => {
  let component: TFTComponent;
  let fixture: ComponentFixture<TFTComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TFTComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TFTComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
