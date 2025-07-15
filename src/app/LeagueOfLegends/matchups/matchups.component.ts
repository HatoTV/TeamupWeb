import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, Renderer2 } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { lastValueFrom, Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { throws } from 'node:assert';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { PopupNotificationMatchupComponent } from './popup-notification-matchup/popup-notification-matchup.component';

@Component({
  selector: 'lol-matchups',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule,PopupNotificationMatchupComponent],
  templateUrl: './matchups.component.html',
  styleUrl: './matchups.component.css',
})
export class MatchupsComponent {
  constructor(private elementRef: ElementRef, private http: HttpClient,private renderer: Renderer2 ) { }
  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background =
      'linear-gradient(to top, var(--lol-bkg-gradient-1),var(--lol-bkg-gradient-2))';
  }
  champions: { name: string; icon: string; difficulty: string; isTop: boolean; isAdc: boolean,isMid: boolean, isJungle: boolean,isSupport: boolean }[] = [];
  datasChampion: {
    championName1: string;
    championName2: string;
    difficulty: string;
    tips: string;
  }[] = [];
  filteredMatchup: {
    championName1: string;
    championName2: string;
    difficulty: string;
    tips: string;
  }[] = [];
  filteredChampions: { name: string; icon: string }[] = [];
  filteredChampions2: { name: string; icon: string }[] = [];
  selectedChampion: { name: string; icon: string }[] = [{name:"",icon:""}];
  selectedChampion2: { name: string; icon: string }[] = [{name:"",icon:""}];
  datasChampion2: {
    championName1: string;
    championName2: string;
    difficulty: string;
    tips: string;
  }[] = [];
  bestPicksForChampion: {
    championName1: string;
    championName2: string;
    difficulty: string;
    tips: string;
  }[] = [];
  worstPicksForChampion: {
    championName1: string;
    championName2: string;
    difficulty: string;
    tips: string;
  }[] = [];
  bestPicksForChampion2: {
    championName1: string;
    championName2: string;
    difficulty: string;
    tips: string;
  }[] = [];
  worstPicksForChampion2: {
    championName1: string;
    championName2: string;
    difficulty: string;
    tips: string;
  }[] = [];
  searchTerm: string = '';
  searchTerm2: string = '';
  isFirstSearch: boolean = true;
  isVisible: boolean = true;
  isMatchupReady: boolean = false;
  difficulty: string = '';
  tips: string = '';
  author: string = '';
  rank: string = '';
  imgBkg1: string = '';
  imgBkg2: string = '';
  showImage1 = false;
  showImage2 = false;
  riotApiKey: string = '';

  ngOnInit() {

    // Désactiver temporairement la transition
    const textElement = this.elementRef.nativeElement.querySelector('#titleMatchup');
    
    // Supprimer les transitions à l'ouverture
    this.renderer.removeClass(textElement, 'fade');
    
    // Utiliser un timeout pour réactiver les transitions après un cycle
    setTimeout(() => {
      this.renderer.addClass(textElement, 'fade');
    }, 50); 

    try {
      this.http.get<any[]>('assets/jsonChampionsDatas/AllChampions.json').subscribe((data) => {
        this.champions = data
          .map((item) => ({
            name: item.championName.trim(),
            icon: item.spellingForUrl.trim().toLowerCase(),
            difficulty: item.difficulty,
            isTop: item.isTop,
            isMid: item.isMid,
            isAdc: item.isAdc,
            isSupport: item.isSupport,
            isJungle: item.isJungle,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        this.filteredChampions = [...this.champions];
        this.filteredChampions2 = [...this.champions];
      });      
    } catch (error) {
      console.log(error)
    }
  }
  
  async getJsonDataByChampion(
    selectedChampion1: string,
    selectedChampion2: string
  ) {
    try {
      let urlJson = 'assets/jsonChampionsDatas/' + this.getValidChampionName(selectedChampion1) + '.json';
      let urlJson2 = 'assets/jsonChampionsDatas/' + this.getValidChampionName(selectedChampion2) + '.json';
      const dataChampions1 = await lastValueFrom(this.http.get<any[]>(urlJson));
      const dataChampions2 = await lastValueFrom(
        this.http.get<any[]>(urlJson2)
      );
      this.datasChampion = dataChampions1.map((item) => ({
        championName1: selectedChampion1,
        championName2: item.championName,
        difficulty: item.difficulty,
        tips: this.formatText(item.tips),
      }));
      this.filteredMatchup = this.datasChampion.filter(
        (item) =>
          item.championName2 &&
          item.championName2
            .toLowerCase()
            .includes(selectedChampion2.toLowerCase()) &&
          (item.difficulty.toLowerCase() == 'extreme' ||
            item.difficulty.toLowerCase() == 'major' ||
            item.difficulty.toLowerCase() == 'minor' ||
            item.difficulty.toLowerCase() == 'even' ||
            item.difficulty.toLowerCase() == 'tiny')
      );
      this.datasChampion2 = dataChampions2.map((item) => ({
        championName1: selectedChampion1,
        championName2: item.championName,
        difficulty: item.difficulty,
        tips: this.formatText(item.tips),
      }));
      console.log(this.datasChampion)
      console.log(this.datasChampion2)
      this.worstPicksForChampion = this.removeDuplicatesByName(this.datasChampion
        .filter(
          (item) =>
            item.difficulty.toLowerCase() == 'minor' ||
            item.difficulty.toLowerCase() == 'tiny'
        )
        .sort((a, b) => {
          if (a.difficulty.toLowerCase() === b.difficulty.toLowerCase()) {
            return a.championName2.localeCompare(b.championName2);
          } else if (a.difficulty.toLowerCase() === 'tiny') {
            return -1;
          } else {
            return 1;
          }
        }));
      this.bestPicksForChampion = this.removeDuplicatesByName(this.datasChampion
        .filter(
          (item) =>
            item.difficulty.toLowerCase() == 'extreme' ||
            item.difficulty.toLowerCase() == 'major'
        )
        .sort((a, b) => {
          if (a.difficulty.toLowerCase() === b.difficulty.toLowerCase()) {
            return a.championName2.localeCompare(b.championName2);
          } else if (a.difficulty.toLowerCase() === 'extreme') {
            return -1;
          } else {
            return 1;
          }
        }));
      this.worstPicksForChampion2 = this.removeDuplicatesByName(this.datasChampion2
        .filter(
          (item) =>
            item.difficulty.toLowerCase() == 'minor' ||
            item.difficulty.toLowerCase() == 'tiny'
        )
        .sort((a, b) => {
          if (a.difficulty.toLowerCase() === b.difficulty.toLowerCase()) {
            return a.championName2.localeCompare(b.championName2);
          } else if (a.difficulty.toLowerCase() === 'tiny') {
            return -1;
          } else {
            return 1;
          }
        }));
      this.bestPicksForChampion2 = this.removeDuplicatesByName(this.datasChampion2
        .filter(
          (item) =>
            item.difficulty.toLowerCase() == 'extreme' ||
            item.difficulty.toLowerCase() == 'major'
        )
        .sort((a, b) => {
          if (a.difficulty.toLowerCase() === b.difficulty.toLowerCase()) {
            return a.championName2.localeCompare(b.championName2);
          } else if (a.difficulty.toLowerCase() === 'extreme') {
            return -1;
          } else {
            return 1;
          }
        }));
        
        this.bestPicksForChampion = this.isRolesEquals(this.selectedChampion[0].name,this.bestPicksForChampion);
        this.worstPicksForChampion = this.isRolesEquals(this.selectedChampion[0].name,this.worstPicksForChampion);

        this.bestPicksForChampion2 = this.isRolesEquals(this.selectedChampion2[0].name,this.bestPicksForChampion2);
        this.worstPicksForChampion2 = this.isRolesEquals(this.selectedChampion2[0].name,this.worstPicksForChampion2);
      await this.getAuthorByChampion(selectedChampion1);
    } catch (error) {
      console.error('Erreur lors de la récupération des données', error);
    }
  }

  async getAuthorByChampion(championName: string) {
    try {
      let urlJson = 'assets/jsonChampionsDatas/AllGuides.json';
      const data = await lastValueFrom(this.http.get<any[]>(urlJson));
      this.author = data.find((obj) =>
        obj.champion.toLowerCase().includes(championName.toLowerCase())
      ).author;
      this.rank = data.find((obj) =>
        obj.champion.toLowerCase().includes(championName.toLowerCase())
      ).rank;
      this.rank = this.rank.charAt(0).toUpperCase() + this.rank.slice(1);
    } catch (error) {
      console.error('Erreur lors de la récupération des données', error);
    }
  }

  filterChampions() {
    const searchTermLower = this.searchTerm.toLowerCase();
    const uniqueChampions = new Map<string, { name: string; icon: string }>();

    this.champions.forEach((champion) => {
      if (champion.name.toLowerCase().includes(searchTermLower)) {
        uniqueChampions.set(champion.name.toLowerCase(), champion);
      }
    });

    this.filteredChampions = Array.from(uniqueChampions.values());
  }

  filterChampions2() {
    const searchTermLower = this.searchTerm2.toLowerCase();
    const uniqueChampions = new Map<string, { name: string; icon: string }>();

    this.champions.forEach((champion) => {
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
    await this.displayDatas();
  }

  // Sélection d'un champion pour la deuxième dropdown
  async selectChampion2(champion: any) {
    this.selectedChampion2[0] = champion;
    this.searchTerm2 = champion.name; // Mise à jour de la barre de recherche avec le nom
    this.filteredChampions2 = []; // Cache la liste après sélection
    await this.displayDatas();
  }

  async getRiotApi() {
    try {
      let urlJson = 'src/riotApi.json';
      const data = await lastValueFrom(this.http.get<any[]>(urlJson));
      this.riotApiKey = data[0].TOKEN;
    } catch (error) {
      console.error('Erreur lors de la récupération des données', error);
    }
  }

  async displayDatas() {
    this.isMatchupReady = false;
    if (this.selectedChampion[0].name!=='' && this.selectedChampion2[0].name!=='') {
      this.isFirstSearch = false;
      await this.getJsonDataByChampion(
        this.selectedChampion[0].name,
        this.selectedChampion2[0].name
      );
      if (
        this.imgBkg1 !==
        'assets/img/championsIcons/' +
        this.getValidChampionName(this.selectedChampion[0].name) +
        '.webp'
      ) {
        this.showImage1 = false;
        setTimeout(() => {
          this.imgBkg1 =
            'assets/img/championsIcons/' +
            this.getValidChampionName(this.selectedChampion[0].name) +
            '.webp';
          this.showImage1 = true;
        }, 400);
      }
      if (
        this.imgBkg2 !==
        'assets/img/championsIcons/' +
        this.getValidChampionName(this.selectedChampion2[0].name) +
        '.webp'
      ) {
        this.showImage2 = false;
        setTimeout(() => {
          this.imgBkg2 =
            'assets/img/championsIcons/' +
            this.getValidChampionName(this.selectedChampion2[0].name) +
            '.webp';
          this.showImage2 = true;
        }, 400);
      }
      if (this.filteredMatchup[0]) {
        this.isMatchupReady = true;
      }
    }
    if (!this.isFirstSearch) {
      this.isVisible = false;
    }
  }

  async ReverseSelectedChampion() {
    try {
      let tempSelectedChampion2 = this.selectedChampion2[0];
      let tempSelectedChampion = this.selectedChampion[0];

      if (
        this.selectedChampion[0].name!=='' &&
        this.selectedChampion2[0].name==''
      ) {
        this.searchTerm = '';
        tempSelectedChampion2 = this.selectedChampion2[0];
        this.selectedChampion = [{name:"",icon:""}];
        await this.selectChampion2(tempSelectedChampion);
      } else if (
        this.selectedChampion[0].name == '' &&
        this.selectedChampion2[0].name !==''
      ) {
        this.searchTerm2 = '';
        tempSelectedChampion = this.selectedChampion[0];
        this.selectedChampion2 = [{name:"",icon:""}];
        await this.selectChampion(tempSelectedChampion2);
      } else if (
        this.selectedChampion[0].name !=='' &&
        this.selectedChampion2[0].name !==''
      ) {
        tempSelectedChampion2 = this.selectedChampion2[0];
        tempSelectedChampion = this.selectedChampion[0];
        await this.selectChampion(tempSelectedChampion2);
        await this.selectChampion2(tempSelectedChampion);
      }
    } catch (error) {
      console.error(
        "Erreur lors de l'inversion des champions sélectionnés",
        error
      );
    }
  }

  formatText(input: string): string {
    // Remplace les séparateurs (|) par des rien
    let formattedText = input.replace(/\|\s?/g, '');;

    // Supprime les caractères non alphanumériques au début de chaque phrase
    formattedText = formattedText.replace(/^[^a-zA-Z0-9]+/gm, '');

    // Ajoute un retour à la ligne après chaque point (.)
    formattedText = formattedText.replace(/(?<!\d)(\.)(\s*)/g, '$1\n');

    // Ajoute un tiret au début de chaque ligne
    formattedText = formattedText
      .split('\n')
      .map((line) => line.trim()) // Supprime les espaces superflus
      .filter((line) => line.length > 0) // Filtre les lignes vides
      .map((line) => `- ${line}`) // Ajoute un tiret au début de chaque ligne
      .map((line) => {
        // Met la première lettre en majuscule
        return line.charAt(0).toUpperCase() + line.slice(1);
      })
      .join('\n'); // Rejoint les lignes avec des retours à la ligne

    return formattedText;
  }

  getValidChampionName(championName: string) {
    const resultats = this.champions.filter(item1 => {
      return item1.name.localeCompare(championName, undefined, { sensitivity: 'base' }) === 0;
    });
    return this.removeDuplicatesByName(resultats.map(item => item.icon));
  }

  styleByDifficulty(difficulty: string, isTitle: boolean) {
    if (isTitle) {
      if (difficulty === 'extreme') {
        return { 'color': 'var(--lol-difficulty-extreme)', 'border': '2px solid var(--lol-difficulty-extreme)' };
      } else if (difficulty === 'major') {
        return { 'color': 'var(--lol-difficulty-difficile)', 'border': '2px solid var(--lol-difficulty-difficile)' };
      } else if (difficulty === 'even') {
        return { 'color': 'var(--lol-difficulty-moyen)', 'border': '2px solid var(--lol-difficulty-moyen)' };
      } else if (difficulty === 'minor') {
        return { 'color': 'var(--lol-difficulty-facile)', 'border': '2px solid var(--lol-difficulty-facile)' };
      } else if (difficulty === 'tiny') {
        return { 'color': 'var(--lol-difficulty-tresfacile)', 'border': '2px solid var(--lol-difficulty-tresfacile)' };
      }
      return null
    }
    else {
      if (difficulty === 'extreme') {
        return { 'color': 'var(--lol-difficulty-extreme)' };
      } else if (difficulty === 'major') {
        return { 'color': 'var(--lol-difficulty-difficile)' };
      } else if (difficulty === 'even') {
        return { 'color': 'var(--lol-difficulty-moyen)' };
      } else if (difficulty === 'minor') {
        return { 'color': 'var(--lol-difficulty-facile)' };
      } else if (difficulty === 'tiny') {
        return { 'color': 'var(--lol-difficulty-tresfacile)' };
      }
      return null
    }

  }

  // Fonction pour supprimer les doublons de Name
  removeDuplicatesByName(tableau: any[]) {
    const namesSet = new Set();  // Créer un Set pour stocker les noms uniques

    return tableau.filter(item => {
      const isDuplicate = namesSet.has(item.championName2);  // Vérifier si le Name existe déjà
      namesSet.add(item.championName2);  // Ajouter le Name au Set
      return !isDuplicate;  // Garder uniquement les éléments non dupliqués
    });
  }

  isRolesEquals(championName: string, tableauCounter: any[]) : any[] {
    // Trouver le champion dans le tableau champions
    const champion1 = this.champions.find(champ => champ.name === championName);
    let tabResults: any[] = [];
    tableauCounter.forEach((counter, index) => {
      let champion2 = this.champions.find(champ => champ.name === counter.championName2);
      if((champion2?.isTop===champion1?.isTop && champion1?.isTop) || 
      (champion2?.isMid===champion1?.isMid && champion1?.isMid) || 
      (champion2?.isSupport===champion1?.isSupport && champion1?.isSupport)|| 
      (champion2?.isAdc===champion1?.isAdc && champion1?.isAdc)|| 
      (champion2?.isJungle===champion1?.isJungle  && champion1?.isJungle))
      {        
        tabResults.push(tableauCounter[index])
      }

    });
    return tabResults;
  }

  isEmailPopupOpen:boolean = false
  openEmailPopup() {
    this.isEmailPopupOpen = !this.isEmailPopupOpen; // Ouvrir la popup
  }
}
