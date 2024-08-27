import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'left-bar',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './left-bar.component.html',
  styleUrl: './left-bar.component.css',
})
export class LeftBarComponent {
  itemsChampions = [
    { logoUrl: 'assets/img/icons/Battle.png', title: 'Matchups' },
    { logoUrl: 'assets/img/icons/Open Book.png', title: 'Guides' },
  ];

  itemsGameplay: Array<{
    logoUrl: string;
    title: string;
    subtitles: string[];
    isOpen: boolean;
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
      isOpen: false,
    },
    {
      logoUrl: 'assets/img/icons/Computer Mouse.png',
      title: 'LOL.LEFTBAR.MECANICS',
      subtitles: [],
      isOpen: false,
    },
    {
      logoUrl: 'assets/img/icons/Handshake Heart.png',
      title: 'Teamfights',
      subtitles: [],
      isOpen: false,
    },
    {
      logoUrl: 'assets/img/icons/Attitude.png',
      title: 'Mindset',
      subtitles: [],
      isOpen: false,
    },
    // Ajoute d'autres éléments ici
  ];

  toggleItem(item: any): void {
    item.isOpen = !item.isOpen;
  }
}
