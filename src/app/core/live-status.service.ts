import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { TwitchLiveStatus, TwitchService } from '../services/twitch.service';

/** Shared Twitch live status, polled once for the whole app (browser only). */
@Injectable({ providedIn: 'root' })
export class LiveStatusService {
  readonly status = signal<TwitchLiveStatus>({ isLive: false });
  /** False until the first answer from `api/twitch-live`. */
  readonly known = signal(false);

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      inject(TwitchService)
        .checkLiveStatus()
        .subscribe((status) => {
          this.status.set(status);
          this.known.set(true);
        });
    }
  }
}
