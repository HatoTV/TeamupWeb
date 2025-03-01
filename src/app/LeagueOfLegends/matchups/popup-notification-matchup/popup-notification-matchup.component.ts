import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EmailService } from '../../../services/email.service';

@Component({
  selector: 'popup-notification-matchup',
  standalone: true,
  imports: [CommonModule,FormsModule,TranslateModule],
  templateUrl: './popup-notification-matchup.component.html',
  styleUrl: './popup-notification-matchup.component.css'
})
export class PopupNotificationMatchupComponent {
  subject: string = '';
  message: string = '';
  filteredChampions: { name: string; icon: string }[] = [];
  filteredChampions2: { name: string; icon: string }[] = [];
  @Input() allChampions: { name: string; icon: string; difficulty: string; isTop: boolean; isAdc: boolean,isMid: boolean, isJungle: boolean,isSupport: boolean }[] = [];
  @Input() selectedChampion: { name: string; icon: string }[]  = [];
  @Input() selectedChampion2: { name: string; icon: string }[]  = [];
  @Input() searchTerm: string = '';
  @Input() searchTerm2: string = '';
  @Output() close = new EventEmitter<void>(); // Événement pour fermer la popup
  isSend : boolean = false;

  constructor(private emailService: EmailService) {}

  ngOnInit(){    
    this.filteredChampions = [...this.allChampions];
    this.filteredChampions2 = [...this.allChampions];
    this.subject=this.selectedChampion[0].name + " vs " + this.selectedChampion2[0].name+" : False/Incomplete Datas"
  }
  filterChampions() {
    const searchTermLower = this.searchTerm.toLowerCase();
    const uniqueChampions = new Map<string, { name: string; icon: string }>();

    this.allChampions.forEach((champion) => {
      if (champion.name.toLowerCase().includes(searchTermLower)) {
        uniqueChampions.set(champion.name.toLowerCase(), champion);
      }
    });

    this.filteredChampions = Array.from(uniqueChampions.values());
  }

  filterChampions2() {
    const searchTermLower = this.searchTerm2.toLowerCase();
    const uniqueChampions = new Map<string, { name: string; icon: string }>();

    this.allChampions.forEach((champion) => {
      if (champion.name.toLowerCase().includes(searchTermLower)) {
        uniqueChampions.set(champion.name.toLowerCase(), champion);
      }
    });

    this.filteredChampions2 = Array.from(uniqueChampions.values());
  }

  async selectChampion(champion: any) {
    this.selectedChampion[0] = champion;
    this.searchTerm = champion.name; // Mise à jour de la barre de recherche avec le nom
    this.filteredChampions = []; // Cache la liste après sélection
    this.message=''
    this.onSelectionChange();
  }

  // Sélection d'un champion pour la deuxième dropdown
  async selectChampion2(champion: any) {
    this.selectedChampion2[0] = champion;
    this.searchTerm2 = champion.name; // Mise à jour de la barre de recherche avec le nom
    this.filteredChampions2 = []; // Cache la liste après sélection
    this.message=''
    this.onSelectionChange();
  }

  sendEmail() {
    this.isSend = true;
    this.emailService.sendEmail(this.subject, this.message)
        .subscribe(
          (            response: any) => {
            },
          (            error: any) => {
                console.error('Erreur lors de l\'envoi de l\'e-mail:', error);
            }
        );
        setTimeout(() => {
          this.close.emit(); // Ferme le modal
        }, 2000);
  }
  // Méthode pour fermer le modal
  closeModal() {
    this.close.emit();
  }

  selectedValue: string = 'typeNotification_Nodata';  // Forcer la sélection de l'option 1
  isMessageVisible: boolean = false;  // Contrôle la visibilité du champ de texte
  messageNotification: string = '';  // Valeur du champ de texte

  // Fonction appelée à chaque changement de sélection
  onSelectionChange() {
    if (this.selectedValue === 'typeNotification_DataFalse') {
      this.subject=this.selectedChampion[0].name + " vs " + this.selectedChampion2[0].name+" : False/Incomplete Datas"
      this.isMessageVisible = true;  // Affiche le champ de texte si une option est sélectionnée
    } else {
      this.subject=this.selectedChampion[0].name + " vs " + this.selectedChampion2[0].name+" : No Datas"
      this.isMessageVisible = false;  // Cache le champ de texte
    }
  }

}
