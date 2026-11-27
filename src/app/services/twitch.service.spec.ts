import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DOCUMENT } from '@angular/common';

import { POLL_INTERVAL_MS, TwitchLiveStatus, TwitchService } from './twitch.service';

describe('TwitchService', () => {
  let service: TwitchService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TwitchService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps a live response from the serverless function', fakeAsync(() => {
    let status: TwitchLiveStatus | undefined;
    const sub = service.checkLiveStatus().subscribe((s) => (status = s));
    tick();
    http.expectOne('/api/twitch-live').flush({ live: true, title: 'Ranked', viewers: 12 });

    expect(status?.isLive).toBeTrue();
    expect(status?.streamTitle).toBe('Ranked');
    expect(status?.viewers).toBe(12);
    expect(status?.streamUrl).toContain('channel=Hato_TV');
    sub.unsubscribe();
    discardPeriodicTasks();
  }));

  it('reports offline when the endpoint fails', fakeAsync(() => {
    let status: TwitchLiveStatus | undefined;
    const sub = service.checkLiveStatus().subscribe((s) => (status = s));
    tick();
    http.expectOne('/api/twitch-live').flush({ error: 'x' }, { status: 502, statusText: 'Bad Gateway' });

    expect(status).toEqual({ isLive: false });
    sub.unsubscribe();
    discardPeriodicTasks();
  }));

  it('never calls the Twitch API directly', fakeAsync(() => {
    const sub = service.checkLiveStatus().subscribe();
    tick();
    http.expectNone((req) => req.url.includes('api.twitch.tv'));
    http.expectOne('/api/twitch-live').flush({ live: false });
    sub.unsubscribe();
    discardPeriodicTasks();
  }));

  it('polls every 5 minutes and pauses while the tab is hidden', fakeAsync(() => {
    const doc = TestBed.inject(DOCUMENT);
    let visibility: DocumentVisibilityState = 'visible';
    spyOnProperty(doc, 'visibilityState').and.callFake(() => visibility);
    const sub = service.checkLiveStatus().subscribe();
    tick();
    http.expectOne('/api/twitch-live').flush({ live: false });
    tick(POLL_INTERVAL_MS - 1);
    http.expectNone('/api/twitch-live');
    tick(1);
    http.expectOne('/api/twitch-live').flush({ live: false });

    visibility = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    tick(3 * POLL_INTERVAL_MS);
    http.expectNone('/api/twitch-live');

    visibility = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    tick();
    http.expectOne('/api/twitch-live').flush({ live: false });
    sub.unsubscribe();
    discardPeriodicTasks();
  }));
});
