import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'left-bar',
  standalone: true,
  imports: [CommonModule],
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
        'Fondamentaux',
        'Last hit',
        'Trading',
        '"Bait" les spells',
        'Roaming',
      ],
      isOpen: false,
    },
    {
      logoUrl: 'assets/img/icons/Money Bag.png',
      title: 'Wave management',
      subtitles: [
        'Fondamentaux',
        'Spawn des sbires',
        'Timing pour back',
        'Freeze / Slow Push / Fast Push',
      ],
      isOpen: false,
    },
    {
      logoUrl: 'assets/img/icons/Forest.png',
      title: 'Jungle',
      subtitles: [
        'Fondamentaux',
        'Chemins de Jungle',
        'Objectifs et Invades',
        'Ganks',
        'Tips',
      ],
      isOpen: false,
    },
    {
      logoUrl: 'assets/img/icons/Computer Mouse.png',
      title: 'Mécaniques',
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
