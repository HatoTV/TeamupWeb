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
  repeat: { mode: 'stroke', shapes: [{ tag: 'path', d: 'M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3' }] },
} satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICONS;
