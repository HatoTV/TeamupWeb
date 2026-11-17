/** Abbreviations whose period never ends a tip (« Dr. Mundo », « e.g. », « vs. », « lvl. 6 »). */
const ABBREVIATION = /(?:^|[^\p{L}])(?:dr|mr|mrs|vs|e\.g|i\.e|cf|ex|env|approx|lvl|lv|niv)$/iu;

const count = (text: string, char: string) => text.split(char).length - 1;

/**
 * Splits a raw matchup tip into one line per advice: sentences, « | » or line-break separated items and numbered
 * lists. Leading bullets and list numbers are removed and each line starts with a capital letter.
 */
export function splitTips(raw: string): string[] {
  let listNumber = 0;
  const text = raw
    .replace(/\r\n?/g, '\n')
    .replace(/\|/g, '\n')
    // « (Recommended Items: …) (Sustained 1v1 Trades: …) » blocks.
    .replace(/\)\s*\(/g, ')\n(')
    // « Conqueror/Grasp] [Ignite + TP] Start W. »: each bracketed group on its own line.
    .replace(/\]\s*\[/g, ']\n[')
    .replace(/(\[[^\]\n]*\])\s+(?=\p{Lu})/gu, '$1\n')
    // Smiley closing a tip: « … do this :) If you … ».
    .replace(/(:\)|:D)\s+(?=\p{Lu})/gu, '$1\n')
    // « 1. », « 2) » list markers: « 1 » opening a line or a sentence, then the following numbers of that list.
    .replace(/(^|\n|[.!?:;)]\s+|\s)(\d{1,2})[.)]\s+(?=\p{L})/gu, (match, before: string, n: string, offset: number) => {
      const atStart = offset === 0 || before === '\n' || before.trim() !== '';
      const number = Number(n);
      if ((atStart && number === 1) || (listNumber > 0 && number === listNumber + 1)) {
        listNumber = number;
        return `${before.trimEnd()}\n`;
      }
      return match;
    })
    // Sentence glued to the next one (« Bel'Veth.Recommended »).
    .replace(/(?<=\p{Ll}{2})([.!?])(?=\p{Lu}\p{Ll})/gu, '$1\n')
    // End of sentence; an ellipsis followed by a lowercase word goes on.
    .replace(/([.!?…]+)(["'”’)\]]*)[ \t]+(?=\S)/gu, (match, end: string, close: string, offset: number, all: string) => {
      const next = all.charAt(offset + match.length);
      if (end.startsWith('.') && ABBREVIATION.test(all.slice(Math.max(0, offset - 8), offset))) return match;
      if ((end.length > 1 || end === '…' || /etc$/i.test(all.slice(offset - 3, offset))) && /\p{Ll}/u.test(next)) {
        return match;
      }
      return `${end}${close}\n`;
    });
  return text
    .split('\n')
    .map((line) => line.replace(/^[^\p{L}\p{N}]+/u, '').trim())
    .map((line) =>
      line.endsWith(')') && !line.endsWith(':)') && count(line, ')') > count(line, '(') ? line.slice(0, -1).trim() : line,
    )
    .map((line) => (line.endsWith(']') && count(line, ']') > count(line, '[') ? line.slice(0, -1).trim() : line))
    .filter((line) => /\p{L}/u.test(line))
    .map((line) => line.charAt(0).toUpperCase() + line.slice(1));
}
