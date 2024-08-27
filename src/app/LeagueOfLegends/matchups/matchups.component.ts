import { CommonModule } from '@angular/common';
import { Component, ElementRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'lol-matchups',
  standalone: true,
  imports: [CommonModule, TranslateModule],
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
