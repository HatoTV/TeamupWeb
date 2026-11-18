import { PictureComponent } from '../../core/images/image-utils';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../../safe-html.pipe';
import { GuideBulletsComponent, keys } from '../guide-shared/guide-blocks';
import { GuideConfig, GuidePageComponent } from '../guide-shared/guide-page.component';
import { LeadPipe, LinesPipe, ParagraphsPipe } from '../guide-shared/guide-text';

const K = 'LOL.GAME';

/** Stat icons, in the order of LOL.GAME.CONTENT1.LIST1…12. */
const STAT_ICONS: string[][] = [
  ['attackDamage'],
  ['abilityPower'],
  ['attackSpeed'],
  ['haste'],
  ['criticalChance'],
  ['movementSpeed'],
  ['tenacity'],
  ['pvRegeneration', 'manaRegeneration'],
  ['lifesteal', 'omnivamp'],
  ['armor', 'magicResistance'],
  ['armorPenetration'],
  ['magicPenetration'],
];

const DRAKE_ICONS = {
  INFERNAL: 'drakeInfernal',
  MOUNTAIN: 'drakeMountain',
  OCEAN: 'drakeOcean',
  CLOUD: 'drakeCloud',
  HEXTECH: 'drakeHextech',
  CHEMTECH: 'drakeChemtech',
} as const;

interface ObjectiveBlock {
  id: string;
  titleKey: string;
  image: string;
  /** Bullet keys and / or a paragraph key (rendered after the bullets). */
  bullets?: string[];
  textKey?: string;
}

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [PictureComponent, TranslateModule, SafeHtmlPipe, GuidePageComponent, GuideBulletsComponent, LeadPipe, LinesPipe, ParagraphsPipe],
  templateUrl: './game.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent {
  protected readonly config: GuideConfig = {
    groupId: 'game',
    heroImage: 'assets/img/site/bkgContent_game.webp',
    titleKey: `${K}.GAME`,
    subtitleKey: `${K}.SUBTITLE0`,
    i18nRoot: K,
    sections: [
      { id: 'Stats', titleKey: `${K}.TITLE1`, level: 1 },
      { id: 'Buffs', titleKey: `${K}.TITLE2`, level: 1 },
      { id: 'red-buff', titleKey: `${K}.SUBTITLE2`, level: 2 },
      { id: 'blue-buff', titleKey: `${K}.SUBTITLE3`, level: 2 },
      { id: 'scuttle', titleKey: `${K}.SUBTITLE4`, level: 2 },
      { id: 'dragons', titleKey: `${K}.SUBTITLE5`, level: 2 },
      { id: 'grubs', titleKey: `${K}.SUBTITLE8`, level: 2 },
      { id: 'herald', titleKey: `${K}.SUBTITLE7`, level: 2 },
      { id: 'baron', titleKey: `${K}.SUBTITLE6`, level: 2 },
    ],
  };

  protected readonly stats = STAT_ICONS.map((icons, i) => ({
    key: `${K}.CONTENT1.LIST${i + 1}`,
    icons: icons.map((name) => `assets/img/icons/${name}.webp`),
  }));

  /** Drake cards under the dragons block (texts in LOL.GAME.DRAKES.<ID>). */
  protected readonly drakes = [
    ...(['INFERNAL', 'MOUNTAIN', 'OCEAN', 'CLOUD', 'HEXTECH', 'CHEMTECH'] as const).map((id) => ({
      key: `${K}.DRAKES.${id}`,
      icon: `assets/img/icons/${DRAKE_ICONS[id]}.webp`,
      facts: ['STACK', 'SOUL', 'TERRAIN'],
      elder: false,
    })),
    { key: `${K}.DRAKES.ELDER`, icon: 'assets/img/icons/drakeElder.webp', facts: ['SPAWN', 'BUFF'], elder: true },
  ];

  protected readonly objectives: ObjectiveBlock[] = [
    { id: 'red-buff', titleKey: `${K}.SUBTITLE2`, image: 'assets/img/site/redbuff.webp', bullets: keys(`${K}.CONTENT2.LIST`, 1, 4) },
    { id: 'blue-buff', titleKey: `${K}.SUBTITLE3`, image: 'assets/img/site/bluebuff.webp', bullets: keys(`${K}.CONTENT3.LIST`, 1, 3) },
    { id: 'scuttle', titleKey: `${K}.SUBTITLE4`, image: 'assets/img/scuttle.webp', bullets: keys(`${K}.CONTENT4.LIST`, 1, 2) },
    { id: 'dragons', titleKey: `${K}.SUBTITLE5`, image: 'assets/img/elder.jpg', textKey: `${K}.CONTENT5.TEXT` },
    { id: 'grubs', titleKey: `${K}.SUBTITLE8`, image: 'assets/img/grubs.webp', textKey: `${K}.CONTENT8` },
    { id: 'herald', titleKey: `${K}.SUBTITLE7`, image: 'assets/img/heralt.webp', textKey: `${K}.CONTENT7` },
    { id: 'baron', titleKey: `${K}.SUBTITLE6`, image: 'assets/img/site/nashor.webp', textKey: `${K}.CONTENT6` },
  ];
}
