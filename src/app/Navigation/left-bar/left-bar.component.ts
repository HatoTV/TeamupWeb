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
    // Ajoute d'autres éléments ici
  ];

  itemsGameplay = [
    { logoUrl: 'assets/img/icons/Journey.png', title: 'Laning', subtitles: {} },
    {
      logoUrl: 'assets/img/icons/Money Bag.png',
      title: 'Wave management',
      subtitles: {},
    },
    { logoUrl: 'assets/img/icons/Forest.png', title: 'Jungle', subtitles: {} },
    {
      logoUrl: 'assets/img/icons/Computer Mouse.png',
      title: 'Mécaniques',
      subtitles: {},
    },
    // Ajoute d'autres éléments ici
  ];
}
