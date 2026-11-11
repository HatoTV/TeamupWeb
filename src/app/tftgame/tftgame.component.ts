import { ImgFallbackPipe, SrcsetPipe } from '../core/images/image-utils';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { YouTubePlayer } from '@angular/youtube-player';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { startWith, switchMap } from 'rxjs';
import { GuideBulletsComponent, keys } from '../LeagueOfLegends/guide-shared/guide-blocks';
import { LeadPipe, LinesPipe, ParagraphsPipe } from '../LeagueOfLegends/guide-shared/guide-text';
import { SafeHtmlPipe } from '../safe-html.pipe';
import { CalloutComponent } from '../shared/ui/callout.component';
import { GuideLayoutComponent, TocEntry } from '../shared/ui/guide-layout/guide-layout.component';

const SECTIONS: { id: string; key: string; level: 1 | 2; marker?: string }[] = [
  { id: 'WhatIsTFT', key: 'TFT.TITLE0', level: 1, marker: '01' },
  { id: 'Structure', key: 'TFT.TITLE1', level: 1, marker: '02' },
  { id: 'Concepts', key: 'TFT.TITLE2', level: 1, marker: '03' },
  { id: 'Concepts_Champions', key: 'TFT.SUBTITLE3', level: 2 },
  { id: 'Concepts_Objets', key: 'TFT.SUBTITLE4', level: 2 },
  { id: 'Concepts_Synergies', key: 'TFT.SUBTITLE5', level: 2 },
  { id: 'Concepts_Economy', key: 'TFT.SUBTITLE6', level: 2 },
  { id: 'Tips', key: 'TFT.TITLE9', level: 1, marker: '04' },
];

@Component({
  selector: 'app-tftgame',
  standalone: true,
  imports: [SrcsetPipe, ImgFallbackPipe, 
    TranslateModule,
    SafeHtmlPipe,
    YouTubePlayer,
    GuideLayoutComponent,
    GuideBulletsComponent,
    CalloutComponent,
    LeadPipe,
    LinesPipe,
    ParagraphsPipe,
  ],
  templateUrl: './tftgame.component.html',
  styleUrl: './tftgame.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TFTGameComponent {
  private readonly translate = inject(TranslateService);

  protected readonly facts = [
    { value: 'TFTPAGE.FACT_PLAYERS_VALUE', label: 'TFTPAGE.FACT_PLAYERS' },
    { value: 'TFTPAGE.FACT_HP_VALUE', label: 'TFTPAGE.FACT_HP' },
    { value: 'TFTPAGE.FACT_TOP4_VALUE', label: 'TFTPAGE.FACT_TOP4' },
  ];
  /** Round phases (TFT.LIST1.CONTENT0…3) with their accent: PvP, carousel, PvP, PvE. */
  protected readonly phases = ['tft', 'gold', 'tft', 'pve'].map((tone, i) => ({ key: `TFT.LIST1.CONTENT${i}`, tone }));
  protected readonly tiers = [0, 1, 2, 3, 4].map((i) => ({ key: `TFT.LIST3.CONTENT${i}`, tier: i + 1 }));
  protected readonly interest = [10, 20, 30, 40, 50].map((gold, i) => ({ gold, bonus: i + 1, last: gold === 50 }));
  protected readonly interestNotes = keys('TFT.LIST6.CONTENT', 0, 1);
  protected readonly streaks = keys('TFT.LIST7.CONTENT', 0, 2);
  protected readonly tips = keys('TFT.LIST9.CONTENT', 0, 5);

  private readonly labels = toSignal(
    this.translate.onLangChange.pipe(
      startWith(null),
      switchMap(() => this.translate.get(SECTIONS.map((s) => s.key)))
    ),
    { initialValue: {} as Record<string, string> }
  );

  protected readonly toc = computed<TocEntry[]>(() =>
    SECTIONS.map((s) => ({ id: s.id, level: s.level, marker: s.marker, label: this.labels()[s.key] ?? '' }))
  );
}
