import { Component, ElementRef } from '@angular/core';

@Component({
  selector: 'app-teamfights',
  standalone: true,
  imports: [],
  templateUrl: './teamfights.component.html',
  styleUrl: './teamfights.component.css'
})
export class TeamfightsComponent {
  constructor(private elementRef: ElementRef) { }
  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background =
      'linear-gradient(to top, var(--lol-bkg-gradient-1),var(--lol-bkg-gradient-2))';
  }
}
