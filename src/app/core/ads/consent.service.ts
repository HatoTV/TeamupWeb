import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, NgZone, PLATFORM_ID, inject } from '@angular/core';

const PUBLISHER = 'pub-1406760133839037';
const CMP_URL = `https://fundingchoicesmessages.google.com/i/${PUBLISHER}?ers=1`;
const ADSENSE_URL = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${PUBLISHER}`;
/** The consent message is loaded on the first interaction, or after this delay at the latest. */
const CMP_FALLBACK_DELAY_MS = 4000;
const TCF_WAIT_MS = 15000;

interface TcData {
  gdprApplies?: boolean;
  eventStatus?: 'tcloaded' | 'cmpuishown' | 'useractioncomplete';
  purpose?: { consents?: Record<string, boolean> };
}

type TcfApi = (command: string, version: number, callback: (data: TcData, success: boolean) => void) => void;

/**
 * Consent-first ad loading:
 *  1. Google's certified CMP ("Privacy & messaging", TCF v2.2) is loaded after the first user
 *     interaction (or a short delay) so it never competes with the first paint.
 *  2. AdSense (auto ads) is injected only once the TCF signal allows it: GDPR does not apply,
 *     or the visitor granted purpose 1 (store/access information on a device).
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private started = false;
  private adsLoaded = false;

  init(): void {
    if (!this.isBrowser || this.started) return;
    this.started = true;
    this.zone.runOutsideAngular(() => {
      const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
      let timer: ReturnType<typeof setTimeout>;
      const start = () => {
        events.forEach((e) => window.removeEventListener(e, start));
        clearTimeout(timer);
        this.loadCmp();
      };
      events.forEach((e) => window.addEventListener(e, start, { once: true, passive: true }));
      timer = setTimeout(start, CMP_FALLBACK_DELAY_MS);
    });
  }

  private loadCmp(): void {
    this.injectScript(CMP_URL);
    this.signalGooglefcPresent();
    this.waitForTcf(Date.now());
  }

  /** Google's documented "googlefcPresent" frame signal for the Funding Choices tag. */
  private signalGooglefcPresent(): void {
    const win = window as unknown as { frames: Record<string, unknown> };
    if (win.frames['googlefcPresent']) return;
    const iframe = this.document.createElement('iframe');
    iframe.name = 'googlefcPresent';
    iframe.title = 'googlefcPresent';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.cssText = 'display:none;width:0;height:0;border:0';
    this.document.body.appendChild(iframe);
  }

  private waitForTcf(startedAt: number): void {
    const api = (window as unknown as { __tcfapi?: TcfApi }).__tcfapi;
    if (!api) {
      if (Date.now() - startedAt < TCF_WAIT_MS) setTimeout(() => this.waitForTcf(startedAt), 250);
      return; // CMP blocked or unavailable: no ads without a consent signal.
    }
    api('addEventListener', 2, (data, success) => {
      if (!success || !data || data.eventStatus === 'cmpuishown') return;
      if (data.gdprApplies === false || data.purpose?.consents?.['1']) this.loadAds();
    });
  }

  private loadAds(): void {
    if (this.adsLoaded) return;
    this.adsLoaded = true;
    this.injectScript(ADSENSE_URL, true);
  }

  private injectScript(src: string, crossOrigin = false): void {
    const script = this.document.createElement('script');
    script.async = true;
    script.src = src;
    if (crossOrigin) script.crossOrigin = 'anonymous';
    this.document.head.appendChild(script);
  }
}
