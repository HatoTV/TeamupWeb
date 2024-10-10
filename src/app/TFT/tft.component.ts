import { Component, ElementRef, ViewChild } from '@angular/core';
import { ScrollService } from '../scroll.service';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { SafeHtmlPipe } from '../safe-html.pipe';
import { YouTubePlayerModule } from '@angular/youtube-player';

@Component({
  selector: 'app-tft',
  standalone: true,
  imports: [CommonModule, TranslateModule ,SafeHtmlPipe,YouTubePlayerModule],
  templateUrl: './tft.component.html',
  styleUrl: './tft.component.css'
})
export class TFTComponent {

  constructor(private elementRef: ElementRef,private scrollService: ScrollService) { }
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  scrollToElement(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element && this.scrollContainer) {
      const container = this.scrollContainer.nativeElement;
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const scrollTop = elementRect.top - containerRect.top + container.scrollTop;
      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      });
    }
  }

  ngOnInit() {
    this.scrollService.scrollToSection$.subscribe((sectionId: string | null) => {
      if (sectionId) {
        this.scrollToElement(sectionId);
      }
    });
  }
  

  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background =
    'linear-gradient(to top, var(--tft-bkg-gradient-1),var(--tft-bkg-gradient-2))';
  }
}
