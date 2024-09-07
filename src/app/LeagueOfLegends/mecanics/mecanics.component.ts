import { Component, ElementRef } from '@angular/core';

@Component({
  selector: 'app-mecanics',
  standalone: true,
  imports: [],
  templateUrl: './mecanics.component.html',
  styleUrl: './mecanics.component.css'
})
export class MecanicsComponent {
  constructor(private elementRef: ElementRef) { }
  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background =
      'linear-gradient(to top, var(--lol-bkg-gradient-1),var(--lol-bkg-gradient-2))';
  }
}
