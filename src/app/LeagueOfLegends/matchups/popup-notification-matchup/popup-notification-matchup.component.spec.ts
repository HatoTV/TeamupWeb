import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../../testing/test-providers';

import { PopupNotificationMatchupComponent } from './popup-notification-matchup.component';

describe('PopupNotificationMatchupComponent', () => {
  let component: PopupNotificationMatchupComponent;
  let fixture: ComponentFixture<PopupNotificationMatchupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopupNotificationMatchupComponent],
      providers: testProviders,
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopupNotificationMatchupComponent);
    component = fixture.componentInstance;
    component.selectedChampion = [{ name: 'Ahri', icon: 'ahri' }];
    component.selectedChampion2 = [{ name: 'Zed', icon: 'zed' }];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
