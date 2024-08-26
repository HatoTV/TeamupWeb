import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'top-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.css',
})
export class TopBarComponent {
  itemsSections = [
    { logoUrl: 'assets/img/icons/League of Legends.png', title: 'League Of Legends', isSelected:true },
    { logoUrl: 'assets/img/icons/Rocket League.png', title: 'Rocket League', isSelected:false },
  ];


}
