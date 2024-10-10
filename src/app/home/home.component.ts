import { CommonModule } from '@angular/common';
import { Component, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../safe-html.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [TranslateModule,CommonModule,SafeHtmlPipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

  constructor(private elementRef: ElementRef,private router: Router, private translate: TranslateService) { }
  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background =
      'linear-gradient(to top, var(--home-bkg-gradient-1),var(--home-bkg-gradient-2))';
  }

  goToUrl(url:string,){
    const defaultLang : string = this.translate.defaultLang || 'fr'
    this.router.navigate([`/${defaultLang}` + url]);
  }
  
}
