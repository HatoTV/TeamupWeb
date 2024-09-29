import { CommonModule } from '@angular/common';
import { Component, ElementRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [TranslateModule,CommonModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  constructor(private elementRef: ElementRef) { }
  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background =
      'linear-gradient(to top, var(--lol-bkg-gradient-1),var(--lol-bkg-gradient-2))';
  }
}
