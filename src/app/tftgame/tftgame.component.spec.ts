import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TFTGameComponent } from './tftgame.component';

describe('TFTGameComponent', () => {
  let component: TFTGameComponent;
  let fixture: ComponentFixture<TFTGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TFTGameComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TFTGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
