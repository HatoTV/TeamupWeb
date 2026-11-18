import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

@Pipe({
  name: 'safeHtml',
  standalone: true
})
export class SafeHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly translate = inject(TranslateService, { optional: true });

  transform(text: string): SafeHtml {
    const formattedText = (text ?? '')
      .replace(/<bold>(.*?)<\/bold>/g, '<span class="bold-text">$1</span>')
      .replace(/<italic>(.*?)<\/italic>/g, '<span class="italic-text">$1</span>')
      .replace(/<term k="([A-Z0-9_]+)">(.*?)<\/term>/g, (_, key: string, word: string) => this.term(key, word))
      // Images embedded in translations are decorative icons: give them an empty alt.
      .replace(/<img(?![^>]*\balt=)/gi, '<img alt=""');
    return this.sanitizer.bypassSecurityTrustHtml(formattedText);
  }

  /**
   * `<term k="TRINKET">trinket</term>` → word with its GLOSSARY.TRINKET definition, shown on hover / focus / tap
   * (styles: .term in _guide-prose.scss). The definition is in the flow, so screen readers read it too.
   */
  private term(key: string, word: string): string {
    const glossaryKey = `GLOSSARY.${key}`;
    const definition = this.translate?.instant(glossaryKey);
    if (!definition || definition === glossaryKey) return word;
    return (
      `<dfn class="term" tabindex="0">${word}` +
      `<span class="term__tip" role="tooltip"><span class="sr-only"> : </span>${escapeHtml(definition)}</span></dfn>`
    );
  }
}
