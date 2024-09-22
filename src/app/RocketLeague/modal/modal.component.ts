import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ElementRef } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css'],
  imports: [CommonModule]
})
export class ModalComponent {
  // Propriétés d'entrée pour personnaliser le contenu et les options du modal
  @Input() title: string = '';
  @Input() etapes: string[] = [];
  @Input() explication: string = '';
  @Input() showModal: boolean = false;
  @Input() video: string = '';

  // EventEmitter pour fermer le modal
  @Output() closeModalEvent = new EventEmitter<void>();

  // Méthode pour fermer le modal
  closeModal() {
    this.closeModalEvent.emit();
  }

  
}