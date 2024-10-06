import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopupNotificationMatchupComponent } from './popup-notification-matchup.component';

describe('PopupNotificationMatchupComponent', () => {
  let component: PopupNotificationMatchupComponent;
  let fixture: ComponentFixture<PopupNotificationMatchupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopupNotificationMatchupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopupNotificationMatchupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
