import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  ElementRef,
  HostListener,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../../safe-html.pipe';

@Component({
  selector: 'app-picker',
  standalone: true,
  imports: [CommonModule, TranslateModule, SafeHtmlPipe, FormsModule],
  templateUrl: './picker.component.html',
  styleUrl: './picker.component.css',
})
export class PickerComponent {
  constructor(
    private elementRef: ElementRef,
    private http: HttpClient,
    private translate: TranslateService
  ) {}
  champions: {
    name: string;
    icon: string;
    difficulty: string;
    isTop: boolean;
    isAdc: boolean;
    isMid: boolean;
    isJungle: boolean;
    isSupport: boolean;
  }[] = [];
  filteredChampions: {
    name: string;
    icon: string;
    difficulty: string;
    isTop: boolean;
    isAdc: boolean;
    isMid: boolean;
    isJungle: boolean;
    isSupport: boolean;
  }[] = [];
  selectedDifficulty: { name: string; id: number; selected: boolean } | null =
    null;
  searchTerm: string = '';

  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background =
      'linear-gradient(to top, var(--lol-bkg-gradient-1),var(--lol-bkg-gradient-2))';
  }

  ngOnInit() {
    try {
      this.difficulties = [
        {
          name: this.getTranslatedName('PICKER.DIFFICULTIES.easy'),
          id: 1,
          selected: false,
        },
        {
          name: this.getTranslatedName('PICKER.DIFFICULTIES.average'),
          id: 2,
          selected: false,
        },
        {
          name: this.getTranslatedName('PICKER.DIFFICULTIES.hard'),
          id: 3,
          selected: false,
        },
        {
          name: this.getTranslatedName('PICKER.DIFFICULTIES.severe'),
          id: 4,
          selected: false,
        },
      ];
      this.http
        .get<any[]>('assets/jsonChampionsDatas/AllChampions.json')
        .subscribe((data) => {
          this.champions = data
            .map((item) => ({
              name: item.championName.trim(),
              icon: item.spellingForUrl.trim().toLowerCase(),
              difficulty: this.getTranslatedName(
                'PICKER.DIFFICULTIES.' + item.difficulty.toLowerCase()
              ),
              isTop: item.isTop,
              isMid: item.isMid,
              isAdc: item.isAdc,
              isSupport: item.isSupport,
              isJungle: item.isJungle,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        });
      this.champions = this.removeDuplicatesByName(this.champions);
      this.filteredChampions = [...this.champions];
    } catch (error) {
      console.log(error);
    }
  }

  removeDuplicatesByName(tableau: any[]) {
    const namesSet = new Set(); // Créer un Set pour stocker les noms uniques

    return tableau.filter((item) => {
      const isDuplicate = namesSet.has(item.name); // Vérifier si le Name existe déjà
      namesSet.add(item.name); // Ajouter le Name au Set
      return !isDuplicate; // Garder uniquement les éléments non dupliqués
    });
  }
  filterChampions() {
    const searchTermLower = this.searchTerm.toLowerCase();
    const uniqueChampion = new Map<
      string,
      {
        name: string;
        icon: string;
        difficulty: string;
        isTop: boolean;
        isAdc: boolean;
        isMid: boolean;
        isJungle: boolean;
        isSupport: boolean;
      }
    >();

    this.champions.forEach((champion) => {
      const matchesSearchTerm = champion.name
        .toLowerCase()
        .includes(searchTermLower);
      const matchesDifficulty =
        this.selectedDifficulty &&
        this.selectedDifficulty.name === champion.difficulty;
      // Ajoute à la Map uniquement si le champion correspond au terme de recherche et à la difficulté
      if (matchesSearchTerm && matchesDifficulty) {
        uniqueChampion.set(champion.name.toLowerCase(), champion);
      }
    });

    // Si le terme de recherche n'est pas vide, utilise les valeurs uniques ; sinon, retourne tous les champions
    if (this.selectedDifficulty || this.searchTerm !== '') {
      this.filteredChampions = Array.from(uniqueChampion.values());
    } else {
      this.filteredChampions = [...this.champions];
    }
  }

  isOpen = false; // pour gérer l'affichage de la dropdown

  difficulties: { name: string; id: number; selected: boolean }[] = [];

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  onSelect(difficulty: { name: string; id: number; selected: boolean }) {
    // Désélectionnez toutes les options
    this.difficulties.forEach((d) => (d.selected = false));

    // Sélectionnez la nouvelle option
    difficulty.selected = true;
    this.selectedDifficulty = difficulty;

    this.filterChampions();
  }

  getBorderColor(difficulty: string): string {
    // Change la couleur selon la difficulté
    if (
      difficulty.toLowerCase() ===
      this.getTranslatedName('PICKER.DIFFICULTIES.easy').toLowerCase()
    ) {
      return '#8eff57';
    } else if (
      difficulty.toLowerCase() ===
      this.getTranslatedName('PICKER.DIFFICULTIES.average').toLowerCase()
    ) {
      return '#57fcff';
    } else if (
      difficulty.toLowerCase() ===
      this.getTranslatedName('PICKER.DIFFICULTIES.hard').toLowerCase()
    ) {
      return '#ffa64c';
    } else if (
      difficulty.toLowerCase() ===
      this.getTranslatedName('PICKER.DIFFICULTIES.severe').toLowerCase()
    ) {
      return '#ff6767';
    }
    return 'gray'; // Couleur par défaut si la valeur ne correspond à aucun cas
  }
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    const dropdownElement = document.querySelector('.dropdown');
    if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
      this.isOpen = false; // Ferme le dropdown si on clique en dehors
    }
  }
  getTranslatedName(nameKey: string): string {
    return this.translate.instant(nameKey); // Récupère la traduction immédiatement
  }
}
