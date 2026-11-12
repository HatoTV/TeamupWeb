import { isPlatformBrowser } from '@angular/common';
import { ApplicationRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { first, switchMap } from 'rxjs';
import { TwitchLiveStatus, TwitchService } from '../services/twitch.service';

/** Shared Twitch live status, polled once for the whole app (browser only). */
@Injectable({ providedIn: 'root' })
export class LiveStatusService {
  readonly status = signal<TwitchLiveStatus>({ isLive: false });
  /** False until the first answer from `api/twitch-live`. */
  readonly known = signal(false);

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const twitch = inject(TwitchService);
      // Start polling once the app is stable: a pending interval would keep it unstable forever, and
      // hydration only removes the prerendered views the client does not reuse once the app is stable.
      inject(ApplicationRef)
        .isStable.pipe(
          first((stable) => stable),
          switchMap(() => twitch.checkLiveStatus()),
        )
        .subscribe((status) => {
          this.status.set(status);
          this.known.set(true);
        });
    }
  }
}
