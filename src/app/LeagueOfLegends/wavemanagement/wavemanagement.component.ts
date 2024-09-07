import { Component, ElementRef } from '@angular/core';

@Component({
  selector: 'app-wavemanagement',
  standalone: true,
  imports: [],
  templateUrl: './wavemanagement.component.html',
  styleUrl: './wavemanagement.component.css'
})
export class WavemanagementComponent {
  constructor(private elementRef: ElementRef) { }
  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background =
      'linear-gradient(to top, var(--lol-bkg-gradient-1),var(--lol-bkg-gradient-2))';
  }
}
