import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../testing/test-providers';

import { LaningComponent } from './laning.component';

describe('LaningComponent', () => {
  let component: LaningComponent;
  let fixture: ComponentFixture<LaningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LaningComponent],
      providers: testProviders,
    })
    .compileComponents();

    fixture = TestBed.createComponent(LaningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
