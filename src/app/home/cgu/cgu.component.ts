import { Component, ElementRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-cgu',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './cgu.component.html',
  styleUrl: './cgu.component.css'
})
export class CguComponent {

  constructor(private elementRef: ElementRef) { }

  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background = 'linear-gradient(to top, var(--home-bkg-gradient-1),var(--home-bkg-gradient-2))';
  }
}
