import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'left-bar',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterModule],
  templateUrl: './left-bar.component.html',
  styleUrl: './left-bar.component.css',
})
export class LeftBarComponent {
  constructor(private router: Router, private translate: TranslateService) {}
  itemsChampions = [
    {
      logoUrl: 'assets/img/icons/Battle.png',
      title: 'Matchups',
      url: '/lol/matchups',
    },
    {
      logoUrl: 'assets/img/icons/Open Book.png',
      title: 'Guides',
      url: '/lol/guides',
    },
  ];

  itemsGameplay: Array<{
    logoUrl: string;
    title: string;
    subtitles: string[];
    isOpen: boolean;
    url: string;
  }> = [
    {
      logoUrl: 'assets/img/icons/people.png',
      title: 'LOL.GAME.GAME',
      subtitles: [
        'LOL.GAME.ROLES',
        'LOL.GAME.OBJECTIVES',
        'LOL.GAME.LEXIQUE'
      ],
      url: '/lol/game',
      isOpen: false,
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
      url: '/lol/laning',
      isOpen: false,
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
      isOpen: false,
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
      isOpen: false,
    },
    {
      logoUrl: 'assets/img/icons/Computer Mouse.png',
      title: 'LOL.LEFTBAR.MECANICS',
      subtitles: [],
      url: '/lol/mecanics',
      isOpen: false,
    },
    {
      logoUrl: 'assets/img/icons/Handshake Heart.png',
      title: 'Teamfights',
      subtitles: [],
      url: '/lol/teamfight',
      isOpen: false,
    },
    {
      logoUrl: 'assets/img/icons/Attitude.png',
      title: 'Mindset',
      subtitles: [],
      url: '/lol/mindset',
      isOpen: false,
    },
  ];

  toggleItem(item: any): void {
    item.isOpen = !item.isOpen;
  }

  // Méthode pour générer l'URL dynamiquement
  createHref(link: string): string {
    const defaultLang: string = this.translate.defaultLang || 'fr';
    const baseUrl = `/${defaultLang}${link}`;
    return baseUrl;
  }
}
