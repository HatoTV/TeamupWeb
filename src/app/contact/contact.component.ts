import { CommonModule } from '@angular/common';
import { Component, ElementRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../safe-html.pipe';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [TranslateModule,CommonModule,SafeHtmlPipe],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  constructor(private elementRef: ElementRef) { }
  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background =
    'linear-gradient(to top, var(--home-bkg-gradient-1),var(--home-bkg-gradient-2))';
  }
}
