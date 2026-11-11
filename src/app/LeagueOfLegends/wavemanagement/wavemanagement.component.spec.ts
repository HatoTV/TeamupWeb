import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../testing/test-providers';

import { WavemanagementComponent } from './wavemanagement.component';

describe('WavemanagementComponent', () => {
  let component: WavemanagementComponent;
  let fixture: ComponentFixture<WavemanagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WavemanagementComponent],
      providers: testProviders,
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
