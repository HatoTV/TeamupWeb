// French gender agreement around the glossary terms (ult, hook, CD, wave…).
// Heuristics, kept narrow to avoid false alarms:
// - determiner before the term: « la ult », « un wave » ;
// - participle / adjective right after the term (and its key): « ton ult (R) chargée » ;
// - pronoun that picks the term up after « : » or « , »: « son ult (R) : elle projette… ».

export type Gender = 'm' | 'f';

/** Reads the « Terme | Genre » table of section 8 of the glossary (Markdown). */
export function parseGenders(markdown: string): Map<string, Gender> {
  const section = markdown.split(/^## /m).find((s) => s.startsWith('8. Genre')) ?? '';
  const genders = new Map<string, Gender>();
  for (const line of section.split(/\r?\n/)) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*([mf])\s*\|$/);
    if (m) genders.set(m[1]!, m[2] as Gender);
  }
  return genders;
}

const MASC_DET = ['le', 'un', 'ce', 'cet', 'du', 'au', 'tout'];
const FEM_DET = ['la', 'une', 'cette', 'ma', 'ta', 'sa', 'toute'];
const L = '\\p{L}';
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Returns one message per agreement problem found in a French tip. */
export function agreementIssues(text: string, genders: Map<string, Gender>): string[] {
  const issues: string[] = [];
  for (const [term, gender] of genders) {
    // Acronyms (CD, CC, AA, CS) are matched case-sensitively, words in any case.
    const flags = term === term.toUpperCase() ? 'gu' : 'giu';
    const t = escape(term);
    const key = String.raw`(?:\s*\([AZERDF]\))?`;
    const wrongDet = gender === 'm' ? FEM_DET : MASC_DET;
    // « tu la dive », « il le zone » : la / le are object pronouns there, not determiners.
    const notPronoun = String.raw`(?<!(?:^|[^\p{L}])(?:tu|il|elle|on|je|ne|nous|vous|ils|elles)\s+)`;
    for (const m of text.matchAll(new RegExp(`${notPronoun}(?<![${L}'’])(${wrongDet.join('|')})\\s+${t}(?![${L}-])`, flags))) {
      issues.push(`« ${m[0]} » : ${term} est ${gender === 'm' ? 'masculin' : 'féminin'}`);
    }
    const wrongEnding = gender === 'm' ? `[${L}]+ées?` : `[${L}]+és?`;
    for (const m of text.matchAll(new RegExp(`(?<![${L}])${t}${key}\\s+(${wrongEnding})(?![${L}])`, flags))) {
      issues.push(`« ${m[0]} » : accord avec ${term} (${gender === 'm' ? 'masculin' : 'féminin'})`);
    }
    const wrongPronoun = gender === 'm' ? 'elle' : 'il';
    for (const m of text.matchAll(new RegExp(`(?<![${L}])${t}${key}\\s*[:,]\\s*(${wrongPronoun})(?![${L}])`, flags))) {
      issues.push(`« ${m[0]} » : reprise de ${term} par « ${m[1]} »`);
    }
  }
  return issues;
}
