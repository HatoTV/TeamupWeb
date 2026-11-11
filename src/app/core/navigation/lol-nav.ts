import { IconName } from '../../shared/ui/icon/icons';

export interface LolTool {
  id: string;
  labelKey: string;
  path: string;
  icon: IconName;
}

export interface LolGuideItem {
  /** Anchor id of the section in the guide page. */
  fragment: string;
  labelKey: string;
}

export interface LolGuideGroup {
  id: string;
  labelKey: string;
  path: string;
  items: LolGuideItem[];
}

export const LOL_TOOLS: readonly LolTool[] = [
  { id: 'matchups', labelKey: 'NAV.MATCHUPS', path: '/lol/matchups', icon: 'swords' },
  { id: 'builds', labelKey: 'NAV.BUILDS', path: '/lol/builds', icon: 'book' },
  { id: 'picker', labelKey: 'NAV.PICKER', path: '/lol/picker', icon: 'star-line' },
];

/** Gameplay guides menu. Fragments match the section ids of each guide page. */
export const LOL_GUIDE_GROUPS: readonly LolGuideGroup[] = [
  {
    id: 'game',
    labelKey: 'LOL.GAME.GAME',
    path: '/lol/game',
    items: [
      { fragment: 'Stats', labelKey: 'LOL.GAME.TITLE1' },
      { fragment: 'Buffs', labelKey: 'LOL.GAME.TITLE2' },
    ],
  },
  {
    id: 'laning',
    labelKey: 'NAV.LOL_LANING',
    path: '/lol/laning',
    items: [
      { fragment: 'Introduction', labelKey: 'LOL.LEFTBAR.INTRODUCTION' },
      { fragment: 'LastHit', labelKey: 'LOL.LANING.TITLE2' },
      { fragment: 'Trading', labelKey: 'LOL.LANING.TITLE3' },
      { fragment: 'Bait', labelKey: 'LOL.LANING.TITLE6' },
      { fragment: 'Roaming', labelKey: 'LOL.LANING.TITLE9' },
    ],
  },
  {
    id: 'wavemanagement',
    labelKey: 'NAV.LOL_WAVEMANAGEMENT',
    path: '/lol/wavemanagement',
    items: [
      { fragment: 'Fondamentals', labelKey: 'LOL.LEFTBAR.FONDAMENTALS' },
      { fragment: 'Freeze', labelKey: 'LOL.WAVEMANAGEMENT.TITLE5' },
      { fragment: 'SlowPush', labelKey: 'LOL.WAVEMANAGEMENT.TITLE9' },
      { fragment: 'FastPush', labelKey: 'LOL.WAVEMANAGEMENT.TITLE12' },
    ],
  },
  {
    id: 'jungle',
    labelKey: 'NAV.LOL_JUNGLE',
    path: '/lol/jungle',
    items: [
      { fragment: 'Introduction', labelKey: 'LOL.LEFTBAR.FONDAMENTALS' },
      { fragment: 'Pathing', labelKey: 'LOL.JUNGLE.TITLE2' },
      { fragment: 'Objectives', labelKey: 'LOL.JUNGLE.TITLE4' },
      { fragment: 'Ganks', labelKey: 'LOL.JUNGLE.TITLE6' },
      { fragment: 'Tips', labelKey: 'LOL.JUNGLE.TITLE8' },
    ],
  },
];
