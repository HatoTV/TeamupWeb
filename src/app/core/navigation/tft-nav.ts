import type { LolGuideGroup, LolTool } from './lol-nav';

/** TFT tools (the « TFT » tab of the top bar opens the first one). */
export const TFT_TOOLS: readonly LolTool[] = [
  { id: 'comps', labelKey: 'TFTDATA.NAV.COMPS', path: '/tft/compositions', icon: 'list' },
  { id: 'champions', labelKey: 'TFTDATA.NAV.CHAMPIONS', path: '/tft/champions', icon: 'star-line' },
  { id: 'items', labelKey: 'TFTDATA.NAV.ITEMS', path: '/tft/objets', icon: 'sword' },
  { id: 'builder', labelKey: 'TFTDATA.NAV.BUILDER', path: '/tft/team-builder', icon: 'hexagon' },
];

/** The beginner's guide (`/tft`): fragments match its section ids. */
export const TFT_GUIDE_GROUPS: readonly LolGuideGroup[] = [
  {
    id: 'guide',
    labelKey: 'TFTDATA.NAV.GUIDE',
    path: '/tft',
    items: [
      { fragment: 'WhatIsTFT', labelKey: 'TFT.TITLE0' },
      { fragment: 'Structure', labelKey: 'TFT.TITLE1' },
      { fragment: 'Concepts', labelKey: 'TFT.TITLE2' },
      { fragment: 'Concepts_Economy', labelKey: 'TFT.SUBTITLE6' },
      { fragment: 'Tips', labelKey: 'TFT.TITLE9' },
    ],
  },
];
