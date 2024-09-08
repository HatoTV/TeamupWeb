import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'safeHtml',
  standalone: true 
})
export class SafeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string): SafeHtml {
    const formattedText = text.replace(/<bold>(.*?)<\/bold>/g, '<span class="bold-text">$1</span>').replace(/<italic>(.*?)<\/italic>/g, '<span class="italic-text">$1</span>');
    return this.sanitizer.bypassSecurityTrustHtml(formattedText);
  }
}
