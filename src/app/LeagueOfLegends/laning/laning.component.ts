import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../../safe-html.pipe';
import { CalloutComponent } from '../../shared/ui/callout.component';
import { GuideBulletsComponent, GuideCardsComponent, keys } from '../guide-shared/guide-blocks';
import { GuideConfig, GuidePageComponent } from '../guide-shared/guide-page.component';
import { LeadPipe, ParagraphsPipe } from '../guide-shared/guide-text';

const K = 'LOL.LANING';

@Component({
  selector: 'app-laning',
  standalone: true,
  imports: [
    TranslateModule,
    SafeHtmlPipe,
    GuidePageComponent,
    GuideCardsComponent,
    GuideBulletsComponent,
    CalloutComponent,
    LeadPipe,
    ParagraphsPipe,
  ],
  templateUrl: './laning.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaningComponent {
  protected readonly config: GuideConfig = {
    groupId: 'laning',
    heroImage: 'assets/img/site/bkgContent_Laning.webp',
    titleKey: `${K}.TITLE0`,
    subtitleKey: `${K}.SUBTITLE0`,
    i18nRoot: K,
    sections: [
      { id: 'Introduction', titleKey: 'LOL.LEFTBAR.INTRODUCTION', level: 1 },
      { id: 'LastHit', titleKey: `${K}.TITLE2`, level: 1 },
      { id: 'Trading', titleKey: `${K}.TITLE3`, level: 1 },
      { id: 'trading-how', titleKey: `${K}.SUBTITLE4`, level: 2 },
      { id: 'Bait', titleKey: `${K}.TITLE6`, level: 1 },
      { id: 'bait-how', titleKey: `${K}.SUBTITLE7`, level: 2 },
      { id: 'Roaming', titleKey: `${K}.TITLE9`, level: 1 },
      { id: 'roaming-how', titleKey: `${K}.SUBTITLE10`, level: 2 },
    ],
  };

  protected readonly roles = keys(`${K}.CONTENT1.LIST`, 1, 3);
  protected readonly tradeTips = keys(`${K}.CONTENT4.LIST`, 1, 5);
  protected readonly baitTips = keys(`${K}.CONTENT7.LIST`, 1, 4);
  protected readonly roamTips = keys(`${K}.CONTENT10.LIST`, 1, 4);
}
