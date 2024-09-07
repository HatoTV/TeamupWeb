import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'left-bar',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './left-bar.component.html',
  styleUrl: './left-bar.component.css',
})
export class LeftBarComponent {
  constructor(private router: Router, private translate: TranslateService) {}
  itemsChampions = [
    { logoUrl: 'assets/img/icons/Battle.png', title: 'Matchups',url: '/lol/matchups' },
    { logoUrl: 'assets/img/icons/Open Book.png', title: 'Guides',url: '/lol/guides' },
  ];

  itemsGameplay: Array<{
    logoUrl: string;
    title: string;
    subtitles: string[];
    isOpen: boolean;
    url:string;
  }> = [
    {
      logoUrl: 'assets/img/icons/Journey.png',
      title: 'Laning',
      subtitles: [
        'LOL.LEFTBAR.FONDAMENTALS',
        'Last hit',
        'Trading',
        'LOL.LEFTBAR.LANING.BAIT',
        'Roaming',
      ],
      url: '/lol/laning',
      isOpen: false,
    },
    {
      logoUrl: 'assets/img/icons/Money Bag.png',
      title: 'Wave management',
      subtitles: [
        'LOL.LEFTBAR.FONDAMENTALS',
        'LOL.LEFTBAR.WAVEMANAGEMENT.SPAWN',
        'LOL.LEFTBAR.WAVEMANAGEMENT.BACKTIMING',
        'Freeze / Slow Push / Fast Push',
      ],
      url: '/lol/wavemanagement',
      isOpen: false,
    },
    {
      logoUrl: 'assets/img/icons/Forest.png',
      title: 'Jungle',
      subtitles: [
        'LOL.LEFTBAR.FONDAMENTALS',
        'LOL.LEFTBAR.JUNGLE.PATHING',
        'LOL.LEFTBAR.JUNGLE.OBJECTIVES',
        'Ganks',
        'Tips',
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

  goToUrl(url:string){
    const defaultLang : string = this.translate.defaultLang || 'fr'
    this.router.navigate([`/${defaultLang}` + url]);
  }
}
