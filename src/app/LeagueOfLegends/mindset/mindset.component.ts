import { Component, ElementRef } from '@angular/core';

@Component({
  selector: 'app-mindset',
  standalone: true,
  imports: [],
  templateUrl: './mindset.component.html',
  styleUrl: './mindset.component.css'
})
export class MindsetComponent {
  constructor(private elementRef: ElementRef) { }
  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background =
      'linear-gradient(to top, var(--lol-bkg-gradient-1),var(--lol-bkg-gradient-2))';
  }
}
