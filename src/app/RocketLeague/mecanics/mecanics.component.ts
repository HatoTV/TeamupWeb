import { CommonModule } from '@angular/common';
import { Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
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
    private http: HttpClient
  ) {}
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  searchTerm: string = '';
  mecanics: {
    name: string;
    img: string;
    difficulty: number;
    utility: number;
    isOpen: boolean;
    author: string;
    video: string;
    etapes: string[];
    explication: string;
  }[] = [];
  stars: number[] = [1, 2, 3, 4, 5];
  filterOptions = [
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
    },
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
    img: string;
    difficulty: number;
    utility: number;
    isOpen: boolean;
    author: string;
    video: string;
    etapes: string[];
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
    this.scrollService.scrollToSection$.subscribe(
      (sectionId: string | null) => {
        if (sectionId) {
          this.scrollToElement(sectionId);
        }
      }
    );
    this.http
      .get<
        {
          name: string;
          img: string;
          difficulty: number;
          utility: number;
          isOpen: boolean;
          author: string;
          video: string;
          etapes: string[];
          explication: string;
        }[]
      >('assets/rlMecanics.json')
      .subscribe((data) => {
        this.mecanics = data
          .map((item) => ({
            name: item.name,
            img: item.img,
            difficulty: item.difficulty,
            isOpen: item.isOpen,
            utility: item.utility,
            author: item.author,
            explication: item.explication,
            video: item.video,
            etapes: item.etapes,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
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
        name: string;
        img: string;
        difficulty: number;
        utility: number;
        isOpen: boolean;
        author: string;
        video: string;
        etapes: string[];
        explication: string;
      }
    >();

    this.mecanics.forEach((mecanic) => {
      if (mecanic.name.toLowerCase().includes(searchTermLower)) {
        uniqueMecanics.set(mecanic.name.toLowerCase(), mecanic);
      }
    });

    this.filteredMecanics = Array.from(uniqueMecanics.values());
  }

  isModalVisible: boolean = false;
  titleMecanic : string = "";
  videoMecanic : string = "";
  explicationMecanic : string = "";
  etapesMecanic : string[] = [];

  openModal(mecanic: {
    name: string;
    img: string;
    difficulty: number;
    utility: number;
    isOpen: boolean;
    author: string;
    video: string;
    etapes: string[];
    explication: string;
  }) {
    this.titleMecanic=mecanic.name;
    this.videoMecanic="assets/rlVideos/" + mecanic.video;
    this.explicationMecanic=mecanic.explication;
    this.etapesMecanic=[...mecanic.etapes];
    this.isModalVisible = true;
  }

  closeModal() {
    this.isModalVisible = false;
  }
}
