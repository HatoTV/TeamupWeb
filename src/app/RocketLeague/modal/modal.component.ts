import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ElementRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../../safe-html.pipe';

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css'],
  imports: [CommonModule,SafeHtmlPipe,TranslateModule]
})
export class ModalComponent {
  // Propriétés d'entrée pour personnaliser le contenu et les options du modal
  @Input() title: string = '';
  @Input() subname: string = '';
  @Input() etapes: string[] = [];
  @Input() explication: string = '';
  @Input() showModal: boolean = false;
  @Input() video: string = '';
  @Input() utility : number = 0;
  @Input() difficulty : number = 0;
  stars: number[] = [1, 2, 3, 4, 5];

  // EventEmitter pour fermer le modal
  @Output() closeModalEvent = new EventEmitter<void>();

  // Méthode pour fermer le modal
  closeModal() {
    this.closeModalEvent.emit();
  }

  getBackgroundColorDifficulty(value: number): string {
    if (value == 4 || value == 5) {
      return '#d94b4b'; // Si la valeur est 4 ou plus, arrière-plan vert
    } else if (value == 3) {
      return '#e2ab45'; // Si la valeur est entre 2 et 3, arrière-plan orange
    } else if (value == 1 || value == 2) {
      return '#29b169'; // Si la valeur est inférieure à 2, arrière-plan rouge
    }
    return 'white'
  }
  getBackgroundColorUtility(value: number): string {
    if (value == 4 || value == 5) {
      return '#29b169'; // Si la valeur est 4 ou plus, arrière-plan vert
    } else if (value == 3) {
      return '#e2ab45'; // Si la valeur est entre 2 et 3, arrière-plan orange
    } else if (value == 1 || value == 2) {
      return '#d94b4b'; // Si la valeur est inférieure à 2, arrière-plan rouge
    }
    return 'black'
  }
  
}