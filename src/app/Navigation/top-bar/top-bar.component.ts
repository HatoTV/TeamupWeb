import { CommonModule } from '@angular/common';
import { Component, ElementRef, Renderer2 } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';
import { LanguageService } from '../../language.service';
import { LeftBarComponent } from '../left-bar/left-bar.component';

@Component({
  selector: 'top-bar',
  standalone: true,
  imports: [CommonModule,LeftBarComponent],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.css',
})
export class TopBarComponent {
  constructor(private router: Router, private translate: TranslateService,private languageService: LanguageService,private el: ElementRef,private renderer: Renderer2) {}
  itemsSections = [
    { logoUrl: 'assets/img/icons/League of Legends.png', title: 'League Of Legends', isSelected:false, url:'/lol/matchups' },
    { logoUrl: 'assets/img/icons/Rocket League.png', title: 'Rocket League', isSelected:false,  url:'/rocket/mecanics' },
  ];
  lang : string = "fr";  
  isMenuOpen = false;
  currentUrl: string = '';
  imgTranslation : string = 'assets/img/translationIcon_Fr.png'

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  goToUrl(url:string,index : any){
    const defaultLang : string = this.translate.defaultLang || 'fr'
    this.router.navigate([`/${defaultLang}` + url]);

    for(let item of this.itemsSections){
      if(item === this.itemsSections[index])
      {
        item.isSelected = true
      }
      else{
        item.isSelected=false
      }
    }
  }
  
  onChangeLanguage() {
    if(this.lang==="fr"){
      this.lang = "en"
      this.imgTranslation ='assets/img/translationIcon_Eng.png'
    }
    else 
    if(this.lang==="en"){
      this.lang = "fr"
      this.imgTranslation ='assets/img/translationIcon_Fr.png'
    }
    this.languageService.changeLanguage(this.lang);
  }

  applyClassesBasedOnUrl(url: string) {
    const mainElement = this.el.nativeElement.querySelector('.topBar');
    const navElement = this.el.nativeElement.querySelector('.navbar');
    const hamburgerElement = this.el.nativeElement.querySelector('.hamburger');
    // Supprimer toutes les classes avant d'en ajouter une nouvelle
    this.renderer.removeClass(mainElement, 'rlcolor');
    this.renderer.removeClass(mainElement, 'lolcolor');
    this.renderer.removeClass(navElement, 'rlcolor');
    this.renderer.removeClass(navElement, 'lolcolor');
    this.renderer.removeClass(hamburgerElement, 'nonedisplay');
    this.renderer.removeClass(hamburgerElement, 'blockdisplay');
    this.itemsSections[0].isSelected=false
    this.itemsSections[1].isSelected=false

    if (url.includes('/lol')) {
      this.itemsSections[0].isSelected=true
      this.renderer.addClass(mainElement, 'lolcolor');
      this.renderer.addClass(navElement, 'lolcolor');
      this.renderer.addClass(hamburgerElement, 'blockdisplay');
    } else if (url.includes('/rocket')) {
      this.itemsSections[1].isSelected=true
      this.renderer.addClass(mainElement, 'rlcolor');
      this.renderer.addClass(navElement, 'rlcolor');
      this.renderer.addClass(hamburgerElement, 'nonedisplay');
    }
  }

  ngOnInit() {
    // Appel initial pour appliquer les classes en fonction de l'URL actuelle
    this.currentUrl = this.router.url;
    this.applyClassesBasedOnUrl(this.currentUrl);

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentUrl = event.urlAfterRedirects;
      this.applyClassesBasedOnUrl(this.currentUrl);
    });
  }
}
