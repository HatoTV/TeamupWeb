import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, fromEvent, of, timer } from 'rxjs';
import { catchError, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';

/** Shape returned by the serverless function `api/twitch-live`. */
export interface TwitchLiveResponse {
  live: boolean;
  title?: string;
  viewers?: number;
}

export interface TwitchLiveStatus {
  isLive: boolean;
  streamUrl?: string;
  streamTitle?: string;
  viewers?: number;
}

const CHANNEL = 'Hato_TV';
/** Every open tab calls the API: keep the interval long, the Worker free plan counts each call. */
export const POLL_INTERVAL_MS = 5 * 60_000;

@Injectable({
  providedIn: 'root',
})
export class TwitchService {
  private readonly apiUrl = '/api/twitch-live';

  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  /**
   * Polls the live status every 5 minutes while the tab is visible (paused when hidden, refreshed when shown
   * again). Errors are reported as "offline".
   */
  checkLiveStatus(): Observable<TwitchLiveStatus> {
    const visible$ = fromEvent(this.document, 'visibilitychange').pipe(
      startWith(null),
      map(() => this.document.visibilityState !== 'hidden'),
      distinctUntilChanged(),
    );
    return visible$.pipe(
      switchMap((visible) => (visible ? timer(0, POLL_INTERVAL_MS) : EMPTY)),
      switchMap(() =>
        this.http.get<TwitchLiveResponse>(this.apiUrl).pipe(
          catchError(() => of<TwitchLiveResponse>({ live: false }))
        )
      ),
      map(({ live, title, viewers }) =>
        live
          ? {
              isLive: true,
              streamUrl: `https://player.twitch.tv/?channel=${CHANNEL}&parent=teamupp.eu&parent=www.teamupp.eu`,
              streamTitle: title ?? '',
              viewers,
            }
          : { isLive: false }
      )
    );
  }
}
