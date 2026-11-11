import { Pipe, PipeTransform } from '@angular/core';

/**
 * Helpers that restructure existing i18n guide strings for display only (cards, timelines,
 * callouts, pros/cons) without rewriting their content.
 */

export interface Lead {
  /** Label without its trailing colon ("Wave standard"). */
  label: string;
  /** Label as written, colon included ("Important :"). */
  rawLabel: string;
  body: string;
}

/** "<bold>Label :</bold> rest" → { label: "Label", rawLabel: "Label :", body: "rest" } (also <italic>, <strong>). */
export function splitLead(html: string): Lead {
  const match = /^\s*<(bold|italic|strong)>(.*?)<\/\1>\s*/i.exec(html ?? '');
  if (!match) return { label: '', rawLabel: '', body: html ?? '' };
  const rawLabel = match[2].trim();
  return { label: rawLabel.replace(/\s*:\s*$/, '').trim(), rawLabel, body: html.slice(match[0].length).trim() };
}

/** Splits on blank-line breaks (<br><br>). */
export function splitParagraphs(html: string): string[] {
  return (html ?? '')
    .split(/(?:<br\s*\/?>\s*){2,}/i)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Splits on any line break (<br> or newline). */
export function splitLines(html: string): string[] {
  return (html ?? '')
    .split(/<br\s*\/?>|\n/i)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** "A -> B -> C." → ["A", "B", "C"]; empty when there is no sequence. */
export function splitSequence(text: string): string[] {
  if (!/->/.test(text ?? '')) return [];
  return text
    .split('->')
    .map((s) => s.replace(/\.$/, '').trim())
    .filter(Boolean);
}

/** Estimated reading time (minutes, 200 words/min) of every string in a translation subtree. */
export function readingMinutes(tree: unknown): number {
  const words = (value: unknown): number => {
    if (typeof value === 'string') return value.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    if (value && typeof value === 'object') return Object.values(value).reduce((sum: number, v) => sum + words(v), 0);
    return 0;
  };
  return Math.max(1, Math.round(words(tree) / 200));
}

@Pipe({ name: 'lead', standalone: true })
export class LeadPipe implements PipeTransform {
  transform(html: string): Lead {
    return splitLead(html);
  }
}

@Pipe({ name: 'paragraphs', standalone: true })
export class ParagraphsPipe implements PipeTransform {
  transform(html: string): string[] {
    return splitParagraphs(html);
  }
}

@Pipe({ name: 'lines', standalone: true })
export class LinesPipe implements PipeTransform {
  transform(html: string): string[] {
    return splitLines(html);
  }
}

@Pipe({ name: 'sequence', standalone: true })
export class SequencePipe implements PipeTransform {
  transform(text: string): string[] {
    return splitSequence(text);
  }
}
