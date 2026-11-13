import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BuildDataService, ChampionStatic, StaticCore } from '../../../core/data/build-data.service';
import { Champion } from '../../../core/data/champion-data.service';
import { RouteContextService } from '../../../core/route-context.service';
import { GameIconComponent } from '../../../shared/ui/game-icon.component';
import { PlayCombo, PlayTipsFile, PlayTipsService, playCombos } from './play-tips.service';

/**
 * Build page block « Tips pour jouer {champion} »: combos (spell icons with their key, in cast order) and
 * mechanics tips, researched by TeamUpp. Sources stay in the data file. Hidden when the champion has no file.
 */
@Component({
  selector: 'app-play-tips',
  standalone: true,
  imports: [TranslateModule, GameIconComponent],
  templateUrl: './play-tips.component.html',
  styleUrl: './play-tips.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.display]': "view() ? null : 'none'" },
})
export class PlayTipsComponent {
  protected readonly ctx = inject(RouteContextService);
  private readonly data = inject(BuildDataService);
  private readonly service = inject(PlayTipsService);
  private readonly translate = inject(TranslateService);

  readonly champion = input.required<Champion>();
  /** Localised Data Dragon data already loaded by the build page. */
  readonly core = input<StaticCore | null>(null);
  readonly champStatic = input<ChampionStatic | null>(null);
  readonly version = input<string | null>(null);

  private readonly file = signal<PlayTipsFile | null>(null);

  protected readonly view = computed(() => {
    const file = this.file();
    const champ = this.champStatic();
    const core = this.core();
    const version = this.version();
    if (!file || !champ || !core || !version || champ.id !== file.champion) return null;
    const lang = this.ctx.lang();
    const combos = playCombos(file, champ, core, lang, (image) => this.data.spellIcon(version, image));
    const tips = file.tips.map((t) => ({ tag: t.tag, text: t.text[lang] }));
    if (!combos.length && !tips.length) return null;
    return { patch: file.patch, portrait: this.data.championIcon(version, file.champion), combos, tips };
  });

  constructor() {
    effect(() => {
      const id = this.champion().ddragonId;
      untracked(() => {
        this.file.set(null);
        if (id) void this.service.load(id).then((file) => this.champion().ddragonId === id && this.file.set(file));
      });
    });
  }

  /** « Combo : Libération spirituelle (E), puis Acier mortel (A) ». */
  protected sequenceLabel(combo: PlayCombo): string {
    this.ctx.lang();
    const then = `, ${this.translate.instant('PLAY_TIPS.THEN')} `;
    const steps = combo.steps.map((s) => `${s.name} (${s.key})`).join(then);
    return this.translate.instant('PLAY_TIPS.SEQUENCE', { steps }) as string;
  }
}
