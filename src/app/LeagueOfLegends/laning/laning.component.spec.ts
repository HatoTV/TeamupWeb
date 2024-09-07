import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaningComponent } from './laning.component';

describe('LaningComponent', () => {
  let component: LaningComponent;
  let fixture: ComponentFixture<LaningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LaningComponent]
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
