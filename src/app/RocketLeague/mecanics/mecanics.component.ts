import { CommonModule } from '@angular/common';
import { Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../../safe-html.pipe';
import { ScrollService } from '../../scroll.service';

@Component({
  selector: 'app-mecanics',
  standalone: true,
  imports: [CommonModule, TranslateModule, SafeHtmlPipe],
  templateUrl: './mecanics.component.html',
  styleUrl: './mecanics.component.css'
})
export class MecanicsComponent {
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
      'linear-gradient(to top, var(--rl-bkg-gradient-1),var(--rl-bkg-gradient-2))';
  }
}
