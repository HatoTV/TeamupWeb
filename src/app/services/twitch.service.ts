import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

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
const POLL_INTERVAL_MS = 60_000;

@Injectable({
  providedIn: 'root',
})
export class TwitchService {
  private readonly apiUrl = '/api/twitch-live';

  constructor(private http: HttpClient) {}

  /** Polls the live status every minute. Errors are reported as "offline". */
  checkLiveStatus(): Observable<TwitchLiveStatus> {
    return timer(0, POLL_INTERVAL_MS).pipe(
      switchMap(() =>
        this.http.get<TwitchLiveResponse>(this.apiUrl).pipe(
          catchError(() => of<TwitchLiveResponse>({ live: false }))
        )
      ),
      map(({ live, title, viewers }) =>
        live
          ? {
              isLive: true,
              streamUrl: `https://player.twitch.tv/?channel=${CHANNEL}&parent=teamupp.app&parent=www.teamupp.app`,
              streamTitle: title ?? '',
              viewers,
            }
          : { isLive: false }
      )
    );
  }
}
