import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../../safe-html.pipe';
import { CalloutComponent } from '../../shared/ui/callout.component';
import { ProsConsComponent } from '../../shared/ui/pros-cons.component';
import { StepListComponent } from '../../shared/ui/step-list.component';
import { GuideConfig, GuidePageComponent } from '../guide-shared/guide-page.component';
import { LeadPipe, LinesPipe, ParagraphsPipe, SequencePipe } from '../guide-shared/guide-text';

const K = 'LOL.WAVEMANAGEMENT';

@Component({
  selector: 'app-wavemanagement',
  standalone: true,
  imports: [
    TranslateModule,
    SafeHtmlPipe,
    GuidePageComponent,
    CalloutComponent,
    StepListComponent,
    ProsConsComponent,
    LeadPipe,
    LinesPipe,
    ParagraphsPipe,
    SequencePipe,
  ],
  templateUrl: './wavemanagement.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WavemanagementComponent {
  protected readonly config: GuideConfig = {
    groupId: 'wavemanagement',
    heroImage: 'assets/img/site/bkgContent_Wavemanagement.webp',
    titleKey: `${K}.TITLE0`,
    subtitleKey: `${K}.SUBTITLE0`,
    i18nRoot: K,
    sections: [
      { id: 'Fondamentals', titleKey: 'LOL.LEFTBAR.FONDAMENTALS', level: 1 },
      { id: 'wm-definition', titleKey: `${K}.TITLE1`, level: 2 },
      { id: 'wm-spawn', titleKey: `${K}.TITLE2`, level: 2 },
      { id: 'wm-back', titleKey: `${K}.TITLE4`, level: 2 },
      { id: 'Freeze', titleKey: `${K}.TITLE5`, level: 1 },
      { id: 'freeze-what', titleKey: `${K}.SUBTITLE5`, level: 2 },
      { id: 'freeze-how', titleKey: `${K}.SUBTITLE6`, level: 2 },
      { id: 'freeze-when', titleKey: `${K}.SUBTITLE7`, level: 2 },
      { id: 'freeze-proscons', titleKey: `${K}.SUBTITLE8`, level: 2 },
      { id: 'SlowPush', titleKey: `${K}.TITLE9`, level: 1 },
      { id: 'slowpush-what', titleKey: `${K}.SUBTITLE9`, level: 2 },
      { id: 'slowpush-how', titleKey: `${K}.SUBTITLE10`, level: 2 },
      { id: 'slowpush-when', titleKey: `${K}.SUBTITLE11`, level: 2 },
      { id: 'FastPush', titleKey: `${K}.TITLE12`, level: 1 },
      { id: 'fastpush-what', titleKey: `${K}.SUBTITLE12`, level: 2 },
      { id: 'fastpush-how', titleKey: `${K}.SUBTITLE13`, level: 2 },
      { id: 'fastpush-when', titleKey: `${K}.SUBTITLE14`, level: 2 },
    ],
  };

  protected readonly waveTypes = [1, 2, 3].map((i) => `${K}.CONTENT2.LIST${i}`);
  protected readonly cycle = [5, 6, 7, 8].map((i) => `${K}.CONTENT2.LIST${i}`);
  protected readonly backTips = [1, 2, 3, 4, 5].map((i) => `${K}.CONTENT4.LIST${i}`);
  protected readonly freezeSteps = [1, 2, 3, 4].map((i) => `${K}.CONTENT6.LIST${i}`);
  protected readonly freezeWhen = [1, 2, 3].map((i) => `${K}.CONTENT7.LIST${i}`);
  protected readonly slowPushWhen = [1, 2, 3].map((i) => `${K}.CONTENT11.LIST${i}`);
  protected readonly fastPushSteps = [1, 2, 3, 4].map((i) => `${K}.CONTENT13.LIST${i}`);
  protected readonly fastPushWhen = [1, 2, 3, 4].map((i) => `${K}.CONTENT14.LIST${i}`);

  /** Chip style of a wave name in the spawn timeline. */
  protected waveKind(label: string): 'super' | 'canon' | 'standard' {
    if (/super/i.test(label)) return 'super';
    if (/canon|cannon|siege/i.test(label)) return 'canon';
    return 'standard';
  }
}
