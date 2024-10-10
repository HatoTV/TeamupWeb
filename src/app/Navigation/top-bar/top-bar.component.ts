import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, Inject, Renderer2,PLATFORM_ID, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';
import { LanguageService } from '../../language.service';
import { LeftBarComponent } from '../left-bar/left-bar.component';
import { isDevMode } from '@angular/core'; // Import nécessaire pour détecter le mode dev
import { TwitchService } from '../../twitch-service.service';
import { PopupTwitchComponent } from '../../popup-twitch/popup-twitch.component';

@Component({
  selector: 'top-bar',
  standalone: true,
  imports: [CommonModule,LeftBarComponent,TranslateModule, PopupTwitchComponent],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.css',
})
export class TopBarComponent {
  constructor(private router: Router, private translate: TranslateService,private languageService: LanguageService,private el: ElementRef,private renderer: Renderer2,
    private twitchService: TwitchService, @Inject(PLATFORM_ID) private platformId: Object, private changeDetector: ChangeDetectorRef) {}
  itemsSections = [
    { logoUrl: 'assets/img/icons/League of Legends.png', title: 'League Of Legends', isSelected:false, url:'/lol/matchups' },
    { logoUrl: 'assets/img/icons/TFT.png', title: 'Teamfight Tactics', isSelected:false,  url:'/tft' },
    { logoUrl: 'assets/img/icons/Rocket League.png', title: 'Rocket League', isSelected:false,  url:'/rocket/mecanics' }
  ];
  lang : string = "fr";  
  isMenuOpen = false;
  currentUrl: string = '';
  imgTranslation : string = 'assets/img/translationIcon_Fr.png'
  isContactSelected = false
  isLive = false;
  isPopupLive = false;
  @ViewChild(PopupTwitchComponent) popupComponent!: PopupTwitchComponent;

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

  goToUrlWithoutParam(url:string,){
    const defaultLang : string = this.translate.defaultLang || 'fr'
    this.router.navigate([`/${defaultLang}` + url]);
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
    this.renderer.removeClass(mainElement, 'homecolor');
    this.renderer.removeClass(mainElement, 'tftcolor');
    this.renderer.removeClass(navElement, 'rlcolor');
    this.renderer.removeClass(navElement, 'lolcolor');
    this.renderer.removeClass(navElement, 'homecolor');
    this.renderer.removeClass(navElement, 'tftcolor');
    if(hamburgerElement){
      this.renderer.removeClass(hamburgerElement, 'nonedisplay');
      this.renderer.removeClass(hamburgerElement, 'blockdisplay');
    }
    this.itemsSections[0].isSelected=false
    this.itemsSections[1].isSelected=false
    this.itemsSections[2].isSelected=false

    if (url.includes('/lol')) {
      this.itemsSections[0].isSelected=true
      this.renderer.addClass(mainElement, 'lolcolor');
      this.renderer.addClass(navElement, 'lolcolor');
      if(hamburgerElement){
        this.renderer.addClass(hamburgerElement, 'blockdisplay');
      }
    } else if (url.includes('/rocket')) {
      this.itemsSections[2].isSelected=true
      this.renderer.addClass(mainElement, 'rlcolor');
      this.renderer.addClass(navElement, 'rlcolor');
      if(hamburgerElement){
        this.renderer.addClass(hamburgerElement, 'nonedisplay');
      }
    } else if (url.includes('/home') || url.includes('/contact')  ) {
      this.renderer.addClass(mainElement, 'homecolor');
      this.renderer.addClass(navElement, 'homecolor');
      if(hamburgerElement){
        this.renderer.addClass(hamburgerElement, 'nonedisplay');
      }
    }else if (url.includes('/tft')) {
      this.itemsSections[1].isSelected=true
      this.renderer.addClass(mainElement, 'tftcolor');
      this.renderer.addClass(navElement, 'tftcolor');
      if(hamburgerElement){
        this.renderer.addClass(hamburgerElement, 'blockdisplay');
      }
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
      this.isContactSelected = this.currentUrl.includes('contact');
    });
  }

  ngAfterViewInit(): void {
    this.applyClassesBasedOnUrl(this.currentUrl);
    // Ne pas exécuter ce code lors du rendu côté serveur
    if (isPlatformBrowser(this.platformId)) {
      this.twitchService.checkLiveStatus().subscribe(({ isLive, streamUrl, streamTitle }) => {
        // Simule le live en mode développement
        const forceLive = isDevMode(); // Si on est en mode dev, force le live
    
        // Assure que les valeurs ne sont pas nulles
        streamUrl = streamUrl || '';
        streamTitle = streamTitle || '';
    
        if (isLive || forceLive) { // On force l'affichage du popup si on est en mode dev
          this.isLive = true
          this.popupComponent.streamUrl = streamUrl;
          this.popupComponent.streamTitle = streamTitle;
        }
      });
    }
  }

  showPopupLive(){
    this.isPopupLive = !this.isPopupLive
    if(this.isPopupLive){
      this.popupComponent.showPopup();
    }
    else{
      this.popupComponent.closePopup();
    }
    this.changeDetector.detectChanges();
  }
}
