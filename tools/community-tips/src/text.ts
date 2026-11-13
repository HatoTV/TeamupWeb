// Text helpers shared by the tips checks (anti-copy, word count, French keys).

/** Run of consecutive words shared with a source sentence that counts as copying. */
export const COPY_RUN_WORDS = 8;

/** A QWERTY-only ability key (Q, W) written as a word: forbidden in French (AZERTY: A, Z). */
export const qwertyRe = /(?<![\p{L}\d])[QW](?![\p{L}\d])/u;

export const words = (s: string): string[] => s.trim().split(/\s+/).filter(Boolean);

export const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** True when `tip` repeats `source` or shares a run of COPY_RUN_WORDS words with it. */
export function sharedRun(tip: string, source: string): boolean {
  if (normalize(tip) === normalize(source)) return true;
  const t = normalize(tip).split(' ');
  const s = ` ${normalize(source)} `;
  for (let i = 0; i + COPY_RUN_WORDS <= t.length; i++) {
    if (s.includes(` ${t.slice(i, i + COPY_RUN_WORDS).join(' ')} `)) return true;
  }
  return false;
}
