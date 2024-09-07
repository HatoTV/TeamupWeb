import { Component, ElementRef } from '@angular/core';

@Component({
  selector: 'app-jungle',
  standalone: true,
  imports: [],
  templateUrl: './jungle.component.html',
  styleUrl: './jungle.component.css'
})
export class JungleComponent {
  constructor(private elementRef: ElementRef) { }
  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background =
      'linear-gradient(to top, var(--lol-bkg-gradient-1),var(--lol-bkg-gradient-2))';
  }
}
