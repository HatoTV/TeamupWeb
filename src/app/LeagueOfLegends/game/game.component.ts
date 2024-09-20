import { CommonModule } from '@angular/common';
import { Component, ElementRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../../safe-html.pipe';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, TranslateModule, SafeHtmlPipe],
  templateUrl: './game.component.html',
  styleUrl: './game.component.css'
})
export class GameComponent {
  constructor(private elementRef: ElementRef) { }
  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background =
      'linear-gradient(to top, var(--lol-bkg-gradient-1),var(--lol-bkg-gradient-2))';
  }
}
