import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Champion } from '../../core/data/champion-data.service';
import { EmailService, MatchupRequestType } from '../../services/email.service';
import { ChampionComboboxComponent, ChampionOption } from '../../shared/ui/champion-combobox/champion-combobox.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';

type SendState = 'idle' | 'sending' | 'sent' | 'error';

/**
 * "Update request" form. When one of the two champions is not chosen yet
 * (single-champion state), it is picked in the form itself.
 */
@Component({
  selector: 'app-matchup-report',
  standalone: true,
  imports: [TranslateModule, FormsModule, ChampionComboboxComponent, IconComponent],
  templateUrl: './matchup-report.component.html',
  styleUrl: './matchup-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchupReportComponent {
  private readonly email = inject(EmailService);

  readonly champion1 = input<Champion | null>(null);
  readonly champion2 = input<Champion | null>(null);
  /** Options for the missing champion. */
  readonly options = input<ChampionOption[]>([]);
  /** Whether the matchup already has tips (default request type). */
  readonly hasTips = input(false);
  /** Hides the title and intro (when the surrounding banner already shows them). */
  readonly bare = input(false);

  protected readonly picked = signal<Champion | null>(null);
  protected readonly requestType = signal<MatchupRequestType>('no_data');
  protected readonly message = signal('');
  protected readonly website = signal('');
  protected readonly sendState = signal<SendState>('idle');

  protected readonly missing = computed<'champion1' | 'champion2' | null>(() =>
    !this.champion1() ? 'champion1' : !this.champion2() ? 'champion2' : null
  );
  protected readonly pickedOption = computed(() => this.options().find((o) => o.champion.slug === this.picked()?.slug) ?? null);
  private readonly pair = computed(() => {
    const c1 = this.champion1() ?? this.picked();
    const c2 = this.champion2() ?? this.picked();
    return c1 && c2 ? { c1, c2 } : null;
  });
  protected readonly canSend = computed(() => !!this.pair() && this.sendState() !== 'sending');

  constructor() {
    // New matchup: reset the form, defaulting to "no data" when there is nothing to show.
    effect(() => {
      const hasTips = this.hasTips();
      this.champion1();
      this.champion2();
      untracked(() => {
        this.requestType.set(hasTips ? 'wrong_data' : 'no_data');
        this.sendState.set('idle');
        this.message.set('');
        this.picked.set(null);
      });
    });
  }

  protected send(): void {
    const pair = this.pair();
    if (!pair || this.sendState() === 'sending') return;
    this.sendState.set('sending');
    this.email
      .sendMatchupUpdateRequest({
        type: this.requestType(),
        champion1: pair.c1.name,
        champion2: pair.c2.name,
        message: this.message(),
        website: this.website(),
      })
      .subscribe({
        next: () => this.sendState.set('sent'),
        error: () => this.sendState.set('error'),
      });
  }
}
