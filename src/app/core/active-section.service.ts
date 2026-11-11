import { Injectable, signal } from '@angular/core';

/** Section currently in view on a guide page (written by GuideLayout, read by the LoL sidebar). */
@Injectable({ providedIn: 'root' })
export class ActiveSectionService {
  readonly id = signal<string | null>(null);
}
