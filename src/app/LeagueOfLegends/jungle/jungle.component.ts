import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../../safe-html.pipe';
import { CalloutComponent } from '../../shared/ui/callout.component';
import { GuideBulletsComponent, GuideCardsComponent, keys } from '../guide-shared/guide-blocks';
import { GuideConfig, GuidePageComponent } from '../guide-shared/guide-page.component';
import { LeadPipe } from '../guide-shared/guide-text';

const K = 'LOL.JUNGLE';

@Component({
  selector: 'app-jungle',
  standalone: true,
  imports: [TranslateModule, SafeHtmlPipe, GuidePageComponent, GuideCardsComponent, GuideBulletsComponent, CalloutComponent, LeadPipe],
  templateUrl: './jungle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JungleComponent {
  protected readonly config: GuideConfig = {
    groupId: 'jungle',
    heroImage: 'assets/img/site/bkgContent_Jungle.webp',
    titleKey: `${K}.TITLE0`,
    subtitleKey: `${K}.SUBTITLE0`,
    i18nRoot: K,
    sections: [
      { id: 'Introduction', titleKey: 'LOL.LEFTBAR.FONDAMENTALS', level: 1 },
      { id: 'Pathing', titleKey: `${K}.TITLE2`, level: 1 },
      { id: 'bot-or-top', titleKey: `${K}.SUBTITLE3`, level: 2 },
      { id: 'Objectives', titleKey: `${K}.TITLE4`, level: 1 },
      { id: 'Ganks', titleKey: `${K}.TITLE6`, level: 1 },
      { id: 'gank-types', titleKey: `${K}.CONTENT7.INTRO1`, level: 2 },
      { id: 'Tips', titleKey: `${K}.TITLE8`, level: 1 },
    ],
  };

  protected readonly missions = keys(`${K}.CONTENT1.LIST`, 1, 4);
  protected readonly paths = [
    { key: `${K}.CONTENT2.LIST1`, image: 'assets/img/jungle_FullClear.jpg' },
    { key: `${K}.CONTENT2.LIST2`, image: 'assets/img/jungle_3camps.jpg' },
    { key: `${K}.CONTENT2.LIST3`, image: 'assets/img/jungle_Invade.jpg' },
  ];
  protected readonly sideChecks = keys(`${K}.CONTENT3.LIST`, 1, 3);
  protected readonly objectives = keys(`${K}.CONTENT4.LIST`, 1, 2);
  protected readonly gankTypes = keys(`${K}.CONTENT7.LIST`, 1, 3);
  protected readonly tips = keys(`${K}.CONTENT8.LIST`, 1, 6);
}
