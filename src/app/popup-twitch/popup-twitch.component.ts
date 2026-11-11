import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, inject, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { TWITCH_URL } from '../core/site.config';

/** "I'm live" dialog with the Twitch player, opened from the top bar live badge. */
@Component({
  selector: 'popup-twitch',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './popup-twitch.component.html',
  styleUrl: './popup-twitch.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopupTwitchComponent {
  @Input() streamUrl = '';
  @Input() streamTitle = '';

  protected isVisible = false;
  protected safeStreamUrl: SafeResourceUrl | null = null;
  protected readonly twitchUrl = TWITCH_URL;

  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private opener: HTMLElement | null = null;

  showPopup(): void {
    if (!this.streamUrl) return;
    this.opener = document.activeElement as HTMLElement | null;
    this.safeStreamUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.streamUrl);
    this.isVisible = true;
    this.cdr.markForCheck();
    setTimeout(() => this.closeButton()?.nativeElement.focus());
  }

  closePopup(): void {
    this.isVisible = false;
    this.cdr.markForCheck();
    this.opener?.focus();
  }
}
