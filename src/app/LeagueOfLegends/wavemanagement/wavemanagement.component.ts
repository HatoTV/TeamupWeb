import { Component, ElementRef, Pipe } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { SafeHtmlPipe } from '../../safe-html.pipe';

@Component({
  selector: 'app-wavemanagement',
  standalone: true,
  imports: [CommonModule, TranslateModule ,SafeHtmlPipe ],
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
