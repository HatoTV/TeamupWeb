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
import { match } from 'assert';

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
  selectedRole: string = '';

  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background =
      'linear-gradient(to top, var(--lol-bkg-gradient-1),var(--lol-bkg-gradient-2))';
  }

  ngOnInit() {
    this.difficulties = [
      {
        name: this.translate.instant(
          'LOL.PICKER.DIFFICULTIES.nofilterdifficulty'
        ),
        id: 0,
        selected: false,
      }, // Placeholder
      {
        name: this.getTranslatedName('LOL.PICKER.DIFFICULTIES.easy'),
        id: 1,
        selected: false,
      },
      {
        name: this.getTranslatedName('LOL.PICKER.DIFFICULTIES.average'),
        id: 2,
        selected: false,
      },
      {
        name: this.getTranslatedName('LOL.PICKER.DIFFICULTIES.hard'),
        id: 3,
        selected: false,
      },
      {
        name: this.getTranslatedName('LOL.PICKER.DIFFICULTIES.severe'),
        id: 4,
        selected: false,
      },
    ];

    try {
      this.selectedDifficulty = {
        name: this.translate.instant('RL.MECANICS.DIFFICULTY'),
        id: 0,
        selected: false,
      };
      this.searchTerm = ''
      this.selectedRole = ''
      this.http
        .get<any[]>('assets/jsonChampionsDatas/AllChampions.json')
        .subscribe((data) => {
          this.champions = data
            .map((item) => ({
              name: item.championName.trim(),
              icon: item.spellingForUrl.trim().toLowerCase(),
              difficulty: this.getTranslatedName(
                'LOL.PICKER.DIFFICULTIES.' + item.difficulty.toLowerCase()
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
      this.filterChampions();
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
      let matchesSearchTerm = false;
      if (searchTermLower == '') {
        matchesSearchTerm = true;
      } else {
        matchesSearchTerm = champion.name
          .toLowerCase()
          .includes(searchTermLower);
      }
      let matchesDifficulty = false;
      if (!this.selectedDifficulty || this.selectedDifficulty.id === 0) {
        matchesDifficulty = true;
      } else {
        matchesDifficulty =
          this.selectedDifficulty.name === champion.difficulty;
      }

      let matchesRole = false;
      if (this.selectedRole === '') {
        matchesRole = true;
      } else {
        matchesRole =
          (this.selectedRole === 'top' && champion.isTop) ||
          (this.selectedRole === 'mid' && champion.isMid) ||
          (this.selectedRole === 'jungle' && champion.isJungle) ||
          (this.selectedRole === 'adc' && champion.isAdc) ||
          (this.selectedRole === 'support' && champion.isSupport);
      }
      // Ajoute à la Map uniquement si le champion correspond au terme de recherche et à la difficulté
      if (matchesSearchTerm && matchesDifficulty && matchesRole) {
        uniqueChampion.set(champion.name.toLowerCase(), champion);
      }
    });

    // Si le terme de recherche n'est pas vide, utilise les valeurs uniques ; sinon, retourne tous les champions
    if (
      this.selectedDifficulty ||
      this.searchTerm !== '' ||
      this.selectedRole !== ''
    ) {
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
    this.selectedDifficulty = difficulty; // Sélectionner la difficulté choisie

    this.filterChampions();
  }

  getBorderColor(difficulty: string): string {
    // Change la couleur selon la difficulté
    if (
      difficulty.toLowerCase() ===
      this.getTranslatedName('LOL.PICKER.DIFFICULTIES.easy').toLowerCase()
    ) {
      return '#8eff57';
    } else if (
      difficulty.toLowerCase() ===
      this.getTranslatedName('LOL.PICKER.DIFFICULTIES.average').toLowerCase()
    ) {
      return '#57fcff';
    } else if (
      difficulty.toLowerCase() ===
      this.getTranslatedName('LOL.PICKER.DIFFICULTIES.hard').toLowerCase()
    ) {
      return '#ffa64c';
    } else if (
      difficulty.toLowerCase() ===
      this.getTranslatedName('LOL.PICKER.DIFFICULTIES.severe').toLowerCase()
    ) {
      return '#ff6767';
    }
    return 'rgba(255, 255, 255, 0.6)'; // Couleur par défaut si la valeur ne correspond à aucun cas
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

  SelectRole(role: string) {
    if (this.selectedRole !== role) {
      this.selectedRole = role;
    } else {
      this.selectedRole = '';
    }
    this.filterChampions();
  }

  selectedChampion: any = null;
  currentChampionIndex: number = 0;
  timeoutId: any = null;

  startRandomSelection() {
    const totalDuration = 2000; // Durée totale de l'animation (5 secondes)
    let currentTime = 0; // Temps écoulé
    let interval = 50; // Intervalle initial en millisecondes
    const slowdownFactor = 1.1; // Facteur d'augmentation de l'intervalle

    const rollChampions = () => {
      // Sélectionner un champion aléatoire
      this.currentChampionIndex = Math.floor(
        Math.random() * this.filteredChampions.length
      );
      this.selectedChampion = this.filteredChampions[this.currentChampionIndex];

      // Augmenter l'intervalle pour ralentir l'animation
      interval *= slowdownFactor;
      // Limiter l'intervalle à une valeur maximale pour éviter qu'il ne devienne trop lent
      if (interval > 200) {
        // Par exemple, ne pas dépasser 300ms
        interval = 200;
      }

      currentTime += interval;

      // Vérifier si le temps total est atteint
      if (currentTime < totalDuration) {
        // Continuer le roulement avec un intervalle plus long
        this.timeoutId = setTimeout(rollChampions, interval);
      } else {
        // Arrêter l'animation après 5 secondes
        clearTimeout(this.timeoutId);
        // Optionnel : Sélectionner un champion final
        this.selectedChampion =
          this.filteredChampions[this.currentChampionIndex];
      }
    };

    // Lancer la première itération
    rollChampions();
  }
}
