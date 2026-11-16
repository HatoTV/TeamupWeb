/**
 * Inline SVG icon registry (24×24 grid). Replaces Font Awesome.
 * Line icons are drawn with `currentColor` strokes; `fill` icons use `currentColor` fill.
 */
export type IconShape =
  | { tag: 'path'; d: string; filled?: boolean }
  | { tag: 'circle'; cx: number; cy: number; r: number; filled?: boolean }
  | { tag: 'rect'; x: number; y: number; width: number; height: number; rx?: number };

export interface IconDefinition {
  mode: 'stroke' | 'fill';
  strokeWidth?: number;
  shapes: IconShape[];
}

export const ICONS = {
  search: {
    mode: 'stroke',
    shapes: [
      { tag: 'circle', cx: 11, cy: 11, r: 7 },
      { tag: 'path', d: 'M20 20l-3.5-3.5' },
    ],
  },
  'arrow-right': { mode: 'stroke', strokeWidth: 2.5, shapes: [{ tag: 'path', d: 'M5 12h14M13 6l6 6-6 6' }] },
  'arrow-left': { mode: 'stroke', strokeWidth: 2.5, shapes: [{ tag: 'path', d: 'M19 12H5M11 6l-6 6 6 6' }] },
  'arrow-up-right': { mode: 'stroke', shapes: [{ tag: 'path', d: 'M7 17L17 7M8 7h9v9' }] },
  'chevron-down': { mode: 'stroke', shapes: [{ tag: 'path', d: 'M6 9l6 6 6-6' }] },
  'chevron-up': { mode: 'stroke', shapes: [{ tag: 'path', d: 'M6 15l6-6 6 6' }] },
  'chevron-left': { mode: 'stroke', shapes: [{ tag: 'path', d: 'M15 6l-6 6 6 6' }] },
  'chevron-right': { mode: 'stroke', shapes: [{ tag: 'path', d: 'M9 6l6 6-6 6' }] },
  swap: { mode: 'stroke', shapes: [{ tag: 'path', d: 'M7 7h13l-4-4M17 17H4l4 4' }] },
  play: { mode: 'fill', shapes: [{ tag: 'path', d: 'M8 5v14l11-7z' }] },
  dice: {
    mode: 'stroke',
    shapes: [
      { tag: 'rect', x: 3, y: 3, width: 18, height: 18, rx: 4 },
      { tag: 'circle', cx: 8.5, cy: 8.5, r: 1.2, filled: true },
      { tag: 'circle', cx: 15.5, cy: 15.5, r: 1.2, filled: true },
      { tag: 'circle', cx: 12, cy: 12, r: 1.2, filled: true },
    ],
  },
  bulb: { mode: 'stroke', shapes: [{ tag: 'path', d: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9V16h7v-2.1A6 6 0 0012 3z' }] },
  info: {
    mode: 'stroke',
    shapes: [
      { tag: 'circle', cx: 12, cy: 12, r: 9 },
      { tag: 'path', d: 'M12 11v5M12 8h.01' },
    ],
  },
  warning: {
    mode: 'stroke',
    shapes: [
      { tag: 'path', d: 'M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z' },
      { tag: 'path', d: 'M12 9v4M12 17h.01' },
    ],
  },
  star: {
    mode: 'fill',
    shapes: [{ tag: 'path', d: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z' }],
  },
  'star-outline': {
    mode: 'stroke',
    shapes: [{ tag: 'path', d: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z' }],
  },
  swords: {
    mode: 'stroke',
    shapes: [
      { tag: 'path', d: 'M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2' },
      { tag: 'path', d: 'M14.5 6.5L18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2' },
    ],
  },
  'tier-bars': { mode: 'stroke', shapes: [{ tag: 'path', d: 'M4 6h16M4 12h11M4 18h6' }] },
  bag: {
    mode: 'stroke',
    shapes: [
      { tag: 'path', d: 'M9 2.5c2 .8 4 .8 6 0l-1.5 4h-3zM9.5 6.5h5' },
      { tag: 'path', d: 'M10.5 6.5C6.8 8.5 4 12 4 15.5 4 19 6.5 21 12 21s8-2 8-5.5c0-3.5-2.8-7-6.5-9' },
    ],
  },
  'star-line': {
    mode: 'stroke',
    shapes: [{ tag: 'path', d: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z' }],
  },
  close: { mode: 'stroke', shapes: [{ tag: 'path', d: 'M6 6l12 12M18 6L6 18' }] },
  menu: { mode: 'stroke', shapes: [{ tag: 'path', d: 'M4 7h16M4 12h16M4 17h16' }] },
  check: { mode: 'stroke', strokeWidth: 2.5, shapes: [{ tag: 'path', d: 'M5 12.5l4.5 4.5L19 7.5' }] },
  plus: { mode: 'stroke', shapes: [{ tag: 'path', d: 'M12 5v14M5 12h14' }] },
  minus: { mode: 'stroke', shapes: [{ tag: 'path', d: 'M5 12h14' }] },
  home: { mode: 'stroke', shapes: [{ tag: 'path', d: 'M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1z' }] },
  user: {
    mode: 'stroke',
    shapes: [
      { tag: 'circle', cx: 12, cy: 8, r: 4 },
      { tag: 'path', d: 'M4 21a8 8 0 0116 0' },
    ],
  },
  clock: {
    mode: 'stroke',
    shapes: [
      { tag: 'circle', cx: 12, cy: 12, r: 9 },
      { tag: 'path', d: 'M12 7v5l3 2' },
    ],
  },
  book: { mode: 'stroke', shapes: [{ tag: 'path', d: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16M8 7h7' }] },
  // Game marks. LoL: Simple Icons v13.21.0 (CC0 1.0). TFT and RL: original glyphs.
  'game-lol': {
    mode: 'fill',
    shapes: [
      {
        tag: 'path',
        d: 'm1.912 0 1.212 2.474v19.053L1.912 24h14.73l1.337-4.682H8.33V0ZM12 1.516c-.913 0-1.798.112-2.648.312v1.74a9.738 9.738 0 0 1 2.648-.368c5.267 0 9.536 4.184 9.536 9.348a9.203 9.203 0 0 1-2.3 6.086l-.273.954-.602 2.112c2.952-1.993 4.89-5.335 4.89-9.122C23.25 6.468 18.213 1.516 12 1.516Zm0 2.673c-.924 0-1.814.148-2.648.414v13.713h8.817a8.246 8.246 0 0 0 2.36-5.768c0-4.617-3.818-8.359-8.529-8.359zM2.104 7.312A10.858 10.858 0 0 0 .75 12.576c0 1.906.492 3.7 1.355 5.266z',
      },
    ],
  },
  'game-tft': {
    mode: 'stroke',
    shapes: [
      { tag: 'path', d: 'M12 2.5l8.25 4.75v9.5L12 21.5l-8.25-4.75v-9.5z' },
      { tag: 'path', d: 'M8 15.5h8M8 15.5l-.6-6 2.9 2.4L12 8.5l1.7 3.4 2.9-2.4-.6 6' },
    ],
  },
  'game-rl': {
    mode: 'stroke',
    shapes: [
      { tag: 'circle', cx: 14.5, cy: 12, r: 7 },
      { tag: 'path', d: 'M7.6 10.8c2.3 1.3 4.6 1.9 6.9 1.9s4.6-.6 6.9-1.9M14.5 5c-1.9 2-2.8 4.4-2.8 7s.9 5 2.8 7M1.5 8h3M1.5 12h2.5M1.5 16h3' },
    ],
  },
  repeat: { mode: 'stroke', shapes: [{ tag: 'path', d: 'M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3' }] },
} satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICONS;
