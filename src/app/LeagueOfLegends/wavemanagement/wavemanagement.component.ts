import { Component, ElementRef, Pipe, ViewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { SafeHtmlPipe } from '../../safe-html.pipe';
import { ScrollService } from '../../scroll.service';

@Component({
  selector: 'app-wavemanagement',
  standalone: true,
  imports: [CommonModule, TranslateModule ,SafeHtmlPipe ],
  templateUrl: './wavemanagement.component.html',
  styleUrl: './wavemanagement.component.css'
})

export class WavemanagementComponent {
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

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
}
