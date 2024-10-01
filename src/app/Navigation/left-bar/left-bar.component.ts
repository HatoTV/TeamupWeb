import { CommonModule } from '@angular/common';
import { Component, ElementRef, Renderer2 } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ScrollService } from '../../scroll.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'left-bar',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterModule],
  templateUrl: './left-bar.component.html',
  styleUrl: './left-bar.component.css',
})
export class LeftBarComponent {
  constructor(private router: Router, private translate: TranslateService,private scrollService: ScrollService,private el: ElementRef,private renderer: Renderer2) {}
  itemsPart1 : Array<
    {
      logoUrl: string,
      title: string,
      url: string
    }> = [];
  titlePart1: string = '';
  titlePart2: string = '';
  currentUrl: string = '';
  itemsPart2: Array<{
    logoUrl: string;
    title: string;
    subtitles: string[];
    fragments: string[];
    isOpen: boolean;
    url: string;
  }> = [
    {
      logoUrl: 'assets/img/icons/people.png',
      title: 'LOL.GAME.GAME',
      subtitles: [
        'LOL.GAME.TITLE1',
        'LOL.GAME.TITLE2',
        // 'LOL.GAME.TITLE3',
        // 'LOL.GAME.TITLE4'
      ],
      fragments: [
        'Stats',
        'Buffs'
      ],
      url: '/lol/game',
      isOpen: true,
    },
    {
      logoUrl: 'assets/img/icons/Journey.png',
      title: 'Laning',
      subtitles: [
        'LOL.LEFTBAR.INTRODUCTION',
        'LOL.LANING.TITLE2',
        'LOL.LANING.TITLE3',
        'LOL.LANING.TITLE6',
        'LOL.LANING.TITLE9',
      ],
      fragments: [
        'Introduction',
        'LastHit',
        'Trading',
        'Bait',
        'Roaming'
      ],
      url: '/lol/laning',
      isOpen: true,
    },
    {
      logoUrl: 'assets/img/icons/Money Bag.png',
      title: 'Wave management',
      subtitles: [
        'LOL.LEFTBAR.FONDAMENTALS',
        'LOL.WAVEMANAGEMENT.TITLE5',
        'LOL.WAVEMANAGEMENT.TITLE9',
        'LOL.WAVEMANAGEMENT.TITLE12',
      ],
      url: '/lol/wavemanagement',
      isOpen: true,
      fragments: [
        'Fondamentals',
        'Freeze',
        'SlowPush',
        'FastPush'
      ],
    },
    {
      logoUrl: 'assets/img/icons/Forest.png',
      title: 'Jungle',
      subtitles: [
        'LOL.LEFTBAR.FONDAMENTALS',
        'LOL.JUNGLE.TITLE2',
        'LOL.JUNGLE.TITLE4',
        'LOL.JUNGLE.TITLE6',
        'LOL.JUNGLE.TITLE8',
      ],
      url: '/lol/jungle',
      isOpen: true,
      fragments: [
        'Introduction',
        'Pathing',
        'Objectives',
        'Ganks',
        'Tips'
      ],
    },
  ];
  // {
  //   logoUrl: 'assets/img/icons/Computer Mouse.png',
  //   title: 'LOL.LEFTBAR.MECANICS',
  //   subtitles: [],
  //   url: '/lol/mecanics',
  //   isOpen: false,
  // },
  // {
  //   logoUrl: 'assets/img/icons/Handshake Heart.png',
  //   title: 'Teamfights',
  //   subtitles: [],
  //   url: '/lol/teamfight',
  //   isOpen: false,
  // },
  // {
  //   logoUrl: 'assets/img/icons/Attitude.png',
  //   title: 'Mindset',
  //   subtitles: [],
  //   url: '/lol/mindset',
  //   isOpen: false,
  // },

  toggleItem(item: any): void {
    item.isOpen = !item.isOpen;
  }

  // Méthode pour générer l'URL dynamiquement
  createHref(link: string): string {
    const defaultLang: string = this.translate.defaultLang || 'fr';
    const baseUrl = `/${defaultLang}${link}`;
    return baseUrl;
  }
  onSectionClick(sectionId: string) {
    this.scrollService.scrollToSection(sectionId);
  }

  applyClassesBasedOnUrl(url: string) {
    const mainElement = this.el.nativeElement.querySelector('.sidebar');
    const dividerElement = this.el.nativeElement.querySelectorAll('.divider');

    // Supprimer toutes les classes avant d'en ajouter une nouvelle
    this.renderer.removeClass(mainElement, 'rlcolor');
    this.renderer.removeClass(mainElement, 'lolcolor');
    this.renderer.removeClass(mainElement, 'displayNone');

    (Array.from(dividerElement) as HTMLElement[]).forEach((element: HTMLElement) => {
      this.renderer.removeClass(element, 'displayNone');
    });

    if (url.includes('/lol')) {
      this.itemsPart1=[
        {
          logoUrl: 'assets/img/icons/Battle.png',
          title: 'Matchups',
          url: '/lol/matchups',
        },
      ]
      this.itemsPart2=[
        {
          logoUrl: 'assets/img/icons/people.png',
          title: 'LOL.GAME.GAME',
          subtitles: [
            'LOL.GAME.TITLE1',
            'LOL.GAME.TITLE2',
            // 'LOL.GAME.TITLE3',
            // 'LOL.GAME.TITLE4'
          ],
          fragments: [
            'Stats',
            'Buffs'
          ],
          url: '/lol/game',
          isOpen: true,
        },
        {
          logoUrl: 'assets/img/icons/Journey.png',
          title: 'Laning',
          subtitles: [
            'LOL.LEFTBAR.INTRODUCTION',
            'LOL.LANING.TITLE2',
            'LOL.LANING.TITLE3',
            'LOL.LANING.TITLE6',
            'LOL.LANING.TITLE9',
          ],
          fragments: [
            'Introduction',
            'LastHit',
            'Trading',
            'Bait',
            'Roaming'
          ],
          url: '/lol/laning',
          isOpen: true,
        },
        {
          logoUrl: 'assets/img/icons/Money Bag.png',
          title: 'Wave management',
          subtitles: [
            'LOL.LEFTBAR.FONDAMENTALS',
            'LOL.WAVEMANAGEMENT.TITLE5',
            'LOL.WAVEMANAGEMENT.TITLE9',
            'LOL.WAVEMANAGEMENT.TITLE12',
          ],
          url: '/lol/wavemanagement',
          isOpen: true,
          fragments: [
            'Fondamentals',
            'Freeze',
            'SlowPush',
            'FastPush'
          ],
        },
        {
          logoUrl: 'assets/img/icons/Forest.png',
          title: 'Jungle',
          subtitles: [
            'LOL.LEFTBAR.FONDAMENTALS',
            'LOL.JUNGLE.TITLE2',
            'LOL.JUNGLE.TITLE4',
            'LOL.JUNGLE.TITLE6',
            'LOL.JUNGLE.TITLE8',
          ],
          url: '/lol/jungle',
          isOpen: true,
          fragments: [
            'Introduction',
            'Pathing',
            'Objectives',
            'Ganks',
            'Tips'
          ],
        },
      ];
      this.titlePart1 = 'Champions';
      this.titlePart2 = 'Gameplay Guides';
      // Ajouter la classe pour League of Legends
      this.renderer.addClass(mainElement, 'lolcolor');
    } else if (url.includes('/rocket')) {    
      
      this.renderer.addClass(mainElement, 'displayNone');
      // Ajouter la classe pour Rocket League
      this.itemsPart1=[]
      this.itemsPart2=[]
      this.titlePart1 = '';
      this.titlePart2 = '';
      
      this.renderer.addClass(mainElement, 'rlcolor');
    }
    else if (url.includes('/contact')) {    
      
      this.renderer.addClass(mainElement, 'displayNone');
      // Ajouter la classe pour Rocket League
      this.itemsPart1=[]
      this.itemsPart2=[]
      this.titlePart1 = '';
      this.titlePart2 = '';
      
      this.renderer.addClass(mainElement, 'rlcolor');
    }
    else if (url.includes('/home') || url.includes('/contact')) {    
      
      this.renderer.addClass(mainElement, 'displayNone');
      // Ajouter la classe pour Rocket League
      this.itemsPart1=[]
      this.itemsPart2=[]
      this.titlePart1 = '';
      this.titlePart2 = '';
      
      this.renderer.addClass(mainElement, 'rlcolor');
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

  isCurrentRoute(url: string): boolean {
    return this.currentUrl.includes(url);
  }
}
