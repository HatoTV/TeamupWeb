import { CommonModule } from '@angular/common';
import { Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../../safe-html.pipe';
import { ScrollService } from '../../scroll.service';
import { HttpClient } from '@angular/common/http';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-mecanics',
  standalone: true,
  imports: [CommonModule, TranslateModule, SafeHtmlPipe, FormsModule, ModalComponent],
  templateUrl: './mecanics.component.html',
  styleUrl: './mecanics.component.css',
})
export class MecanicsComponent {
  constructor(
    private elementRef: ElementRef,
    private scrollService: ScrollService,
    private http: HttpClient,
    private translate: TranslateService
  ) { }
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  searchTerm: string = '';
  mecanics: {
    name: string;
    subname: string;
    img: string;
    difficulty: number;
    utility: number;
    isOpen: boolean;
    author: string;
    video: string;
    etapes: string;
    explication: string;
  }[] = [];
  stars: number[] = [1, 2, 3, 4, 5];
  isFilterOpen: boolean = false;
  filterOptions = [
    {
      id: 'difficulty1',
      label: 'RL.MECANICS.DIFFICULTY',
      selected: false,
      rating: 1,
    },
    {
      id: 'difficulty2',
      label: 'RL.MECANICS.DIFFICULTY',
      selected: false,
      rating: 2,
    },
    {
      id: 'difficulty3',
      label: 'RL.MECANICS.DIFFICULTY',
      selected: false,
      rating: 3,
    },
    {
      id: 'difficulty4',
      label: 'RL.MECANICS.DIFFICULTY',
      selected: false,
      rating: 4,
    },
    {
      id: 'difficulty5',
      label: 'RL.MECANICS.DIFFICULTY',
      selected: false,
      rating: 5,
    },
    {
      id: 'utility1',
      label: 'RL.MECANICS.UTILITY',
      selected: false,
      rating: 1,
    },
    {
      id: 'utility2',
      label: 'RL.MECANICS.UTILITY',
      selected: false,
      rating: 2,
    },
    {
      id: 'utility3',
      label: 'RL.MECANICS.UTILITY',
      selected: false,
      rating: 3,
    },
    {
      id: 'utility4',
      label: 'RL.MECANICS.UTILITY',
      selected: false,
      rating: 4,
    },
    {
      id: 'utility5',
      label: 'RL.MECANICS.UTILITY',
      selected: false,
      rating: 5,
    }
  ];

  toggleSelection(option: any) {
    option.selected = !option.selected;
    console.log(this.getSelectedOptions());
  }

  getSelectedOptions() {
    return this.filterOptions.filter((option) => option.selected);
  }

  filteredMecanics: {
    name: string;
    subname: string;
    img: string;
    difficulty: number;
    utility: number;
    isOpen: boolean;
    author: string;
    video: string;
    etapes: string;
    explication: string;
  }[] = [];

  scrollToElement(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element && this.scrollContainer) {
      const container = this.scrollContainer.nativeElement;
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const scrollTop =
        elementRect.top - containerRect.top + container.scrollTop;
      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      });
    }
  }

  ngOnInit() {
    this.scrollService.scrollToSection$.subscribe((sectionId: string | null) => {
      if (sectionId) {
        this.scrollToElement(sectionId);
      }
    });

    this.http
      .get<
        {
          name: string;
          subname: string;
          img: string;
          difficulty: number;
          utility: number;
          isOpen: boolean;
          author: string;
          video: string;
          etapes: string;
          explication: string;
        }[]
      >('assets/rlmecanics.json')
      .subscribe((data) => {
        const mecanicsToTranslate = data.map((item) => ({
          name: item.name,
          subname: item.subname,
          img: item.img,
          difficulty: item.difficulty,
          isOpen: item.isOpen,
          utility: item.utility,
          author: item.author,
          video: item.video,
          explicationKey: item.explication, // Clé pour la traduction de l'explication
          etapesKey: item.etapes,           // Clé pour la traduction des étapes
          explication: '', // On initialise avec une chaîne vide
          etapes: '',      // On initialise avec une chaîne vide
        }));

        // Traduire les explications et étapes
        mecanicsToTranslate.forEach((item) => {
          this.translate.get([item.explicationKey, item.etapesKey]).subscribe((translations) => {
            item.explication = translations[item.explicationKey];
            item.etapes = translations[item.etapesKey];
          });
        });

        // Assigner les résultats traduits
        this.mecanics = mecanicsToTranslate.sort((a, b) => a.name.localeCompare(b.name));
        this.filteredMecanics = [...this.mecanics];
      });
  }


  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background =
      'linear-gradient(to top, var(--rl-bkg-gradient-1),var(--rl-bkg-gradient-2))';
  }

  filterMecanics() {
    const searchTermLower = this.searchTerm.toLowerCase();
    const uniqueMecanics = new Map<
      string,
      {
        subname: string;
        name: string;
        img: string;
        difficulty: number;
        utility: number;
        isOpen: boolean;
        author: string;
        video: string;
        etapes: string;
        explication: string;
      }
    >();

    this.mecanics.forEach((mecanic) => {
      if (mecanic.name.toLowerCase().includes(searchTermLower)) {
        uniqueMecanics.set(mecanic.name.toLowerCase(), mecanic);
      }
    });

    if (this.searchTerm != '') this.filteredMecanics = Array.from(uniqueMecanics.values());
    else this.filteredMecanics = [...this.mecanics];
  }

  isModalVisible: boolean = false;
  titleModal: string = "";
  subnameModal: string = "";
  videoModal: string = "";
  explicationModal: string = "";
  utilityModal: number = 0;
  difficultyModal: number = 0;
  etapesModal: string[] = [];

  openModal(mecanic: {
    name: string;
    subname: string;
    img: string;
    difficulty: number;
    utility: number;
    isOpen: boolean;
    author: string;
    video: string;
    etapes: string;
    explication: string;
  }) {
    this.subnameModal = mecanic.subname;
    this.titleModal = mecanic.name;
    this.videoModal = "assets/rlVideos/" + mecanic.video;
    this.explicationModal = mecanic.explication;
    this.etapesModal = mecanic.etapes.split(";");
    this.utilityModal = mecanic.utility;
    this.difficultyModal = mecanic.difficulty;
    this.isModalVisible = true;
  }

  closeModal() {
    this.isModalVisible = false;
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

  hoverIndex: number | null = null;

  onMouseEnter(index: number) {
    this.hoverIndex = index;
  }

  onMouseLeave() {
    this.hoverIndex = null;
  }

  openFilters() {
    this.isFilterOpen = !this.isFilterOpen
  }

  onFilterChange() {
    // Récupérer les difficultés sélectionnées
    const selectedDifficulties = this.filterOptions
      .filter(option => option.id.includes('difficulty') && option.selected)
      .map(option => option.rating);

    // Récupérer les utilities sélectionnées
    const selectedUtilities = this.filterOptions
      .filter(option => option.id.includes('utility') && option.selected)
      .map(option => option.rating);

    this.filterMecanics();

    if (selectedDifficulties.length > 0 && selectedUtilities.length == 0) {
      // Filtrer les mécaniques en fonction des difficultés sélectionnées
      this.filteredMecanics = this.filteredMecanics.filter(mechanic =>
        selectedDifficulties.includes(mechanic.difficulty)
      );
    }
    else if (selectedDifficulties.length == 0 && selectedUtilities.length > 0) {
      // Filtrer les mécaniques en fonction des difficultés sélectionnées
      this.filteredMecanics = this.filteredMecanics.filter(mechanic =>
        selectedUtilities.includes(mechanic.utility)
      );
    }
    else if (selectedDifficulties.length > 0 && selectedUtilities.length > 0) {
      // Filtrer les mécaniques en fonction des difficultés sélectionnées
      this.filteredMecanics = this.filteredMecanics.filter(mechanic =>
        selectedDifficulties.includes(mechanic.difficulty) && selectedUtilities.includes(mechanic.utility)
      );
    }
    this.sortMecanics(); // Appeler la méthode de tri après le filtrage
  }

  sortCriteria: string = 'alphabet_asc'; // Critère par défaut

  // Liste des options de tri
  sortOptions = [
    { id: 'alphabet_asc', label: 'RL.MECANICS.NAME_ASC' },
    { id: 'difficulty_asc', label: 'RL.MECANICS.DIFFICULTY_ASC' },
    { id: 'utility_asc', label: 'RL.MECANICS.UTILITY_ASC' },
    { id: 'alphabet_desc', label: 'RL.MECANICS.NAME_DESC' }, // Nouvelle option pour le tri décroissant par nom
    { id: 'difficulty_desc', label: 'RL.MECANICS.DIFFICULTY_DESC' }, // Nouvelle option pour le tri décroissant par difficulté
    { id: 'utility_desc', label: 'RL.MECANICS.UTILITY_DESC' } 
  ];

  sortMecanics() {
    if (this.sortCriteria === 'alphabet_asc') {
      this.filteredMecanics.sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortCriteria === 'difficulty_asc') {
      this.filteredMecanics.sort((a, b) => a.difficulty - b.difficulty);
    } else if (this.sortCriteria === 'utility_asc') {
      this.filteredMecanics.sort((a, b) => a.utility - b.utility);
    } else if (this.sortCriteria === 'alphabet_desc') {
      this.filteredMecanics.sort((a, b) => b.name.localeCompare(a.name));
    } else if (this.sortCriteria === 'difficulty_desc') {
      this.filteredMecanics.sort((a, b) => b.difficulty - a.difficulty);
    } else if (this.sortCriteria === 'utility_desc') {
      this.filteredMecanics.sort((a, b) => b.utility - a.utility);
    }
  }
}
