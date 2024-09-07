import { Component, ElementRef } from '@angular/core';

@Component({
  selector: 'app-laning',
  standalone: true,
  imports: [],
  templateUrl: './laning.component.html',
  styleUrl: './laning.component.css'
})
export class LaningComponent {
  constructor(private elementRef: ElementRef) { }
  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background =
      'linear-gradient(to top, var(--lol-bkg-gradient-1),var(--lol-bkg-gradient-2))';
  }
}
