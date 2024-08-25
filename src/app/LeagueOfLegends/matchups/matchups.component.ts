import { Component, ElementRef } from '@angular/core';

@Component({
  selector: 'lol-matchups',
  standalone: true,
  imports: [],
  templateUrl: './matchups.component.html',
  styleUrl: './matchups.component.css'
})
export class MatchupsComponent {
  constructor(private elementRef: ElementRef) {}
  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background = 'linear-gradient(to top, var(--lol-bkg-gradient-1),var(--lol-bkg-gradient-2))';
  }

}
