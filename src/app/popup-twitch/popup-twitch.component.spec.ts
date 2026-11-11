import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../testing/test-providers';

import { PopupTwitchComponent } from './popup-twitch.component';

describe('PopupTwitchComponent', () => {
  let component: PopupTwitchComponent;
  let fixture: ComponentFixture<PopupTwitchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopupTwitchComponent],
      providers: testProviders,
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopupTwitchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
