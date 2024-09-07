import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WavemanagementComponent } from './wavemanagement.component';

describe('WavemanagementComponent', () => {
  let component: WavemanagementComponent;
  let fixture: ComponentFixture<WavemanagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WavemanagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WavemanagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
