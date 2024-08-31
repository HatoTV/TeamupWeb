import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { lastValueFrom, Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { throws } from 'node:assert';

@Component({
  selector: 'lol-matchups',
  standalone: true,
  imports: [CommonModule, TranslateModule,FormsModule],
  templateUrl: './matchups.component.html',
  styleUrl: './matchups.component.css'
})
export class MatchupsComponent {
  constructor(private elementRef: ElementRef,private http: HttpClient,private changeDetectorRef: ChangeDetectorRef) {}
  private allChampionsJson = 'assets/jsonDatas/AllChampions.json';
  champions: { name: string, icon: string }[] = [];
  matchup: { championName1: string,championName2: string,difficulty: string, tips: string }[] = [];
  filteredMatchup: { championName1: string,championName2: string,difficulty: string, tips: string }[] = [];
  filteredChampions: { name: string, icon: string }[] = [];
  filteredChampions2: { name: string, icon: string }[] = [];
  selectedChampion: any = null;
  selectedChampion2: any = null;
  searchTerm: string = '';
  searchTerm2: string = '';
  isFirstSearch:boolean = true;
  isVisible: boolean = true;
  isMatchupReady: boolean = false;
  difficulty : string="";
  tips : string="";
  author: string="";
  rank: string="";
  imgBkg1: string="";
  imgBkg2: string="";
  showImage1 = false;
  showImage2 = false;
  riotApiKey : string=""

  ngAfterViewInit() {
    const document = this.elementRef.nativeElement.ownerDocument;
    const body = document.body;
    body.style.background = 'linear-gradient(to top, var(--lol-bkg-gradient-1),var(--lol-bkg-gradient-2))';
  }
  
  ngOnInit() {
    this.http.get<any[]>(this.allChampionsJson).subscribe((data) => {
      this.champions = data.map(item => ({
        name: item.championName.trim(),
        icon: item.spellingForUrl.trim().toLowerCase()
      }));
      this.filteredChampions = [...this.champions]; 
      this.filteredChampions2 = [...this.champions]; 
    });
  }

  async getJsonDataByChampion(selectedChampion1: string,selectedChampion2: string) {
    try{
      let urlJson = 'assets/jsonDatas/' + selectedChampion1 + '.json';
      const data = await lastValueFrom(this.http.get<any[]>(urlJson));
      this.matchup = data.map(item => ({
        championName1: selectedChampion1,
        championName2: item.championName,
        difficulty: item.difficulty,
        tips: this.filterString(item.tips),
      }));
      this.filteredMatchup = this.matchup.filter(item =>
        item.championName2 && 
        item.championName2.toLowerCase().includes(selectedChampion2.toLowerCase()) &&
        (item.difficulty.toLowerCase() == "extreme" || item.difficulty.toLowerCase() == "major" ||item.difficulty.toLowerCase() == "minor" ||item.difficulty.toLowerCase() == "even" ||item.difficulty.toLowerCase() == "tiny")
      );
      await this.getAuthorByChampion(selectedChampion1);
    }
    catch (error) {
      console.error('Erreur lors de la récupération des données', error);
    }
  }

  async getAuthorByChampion(championName : string){
    try{
      let urlJson = 'assets/jsonDatas/AllGuides.json';
      const data = await lastValueFrom(this.http.get<any[]>(urlJson));
      this.author = data.find(obj => obj.champion.toLowerCase().includes(championName.toLowerCase())).author;
      this.rank = data.find(obj => obj.champion.toLowerCase().includes(championName.toLowerCase())).rank;
      this.rank = this.rank.charAt(0).toUpperCase() + this.rank.slice(1);
    }
    catch (error) {
      console.error('Erreur lors de la récupération des données', error);
    }
  }

  filterChampions() {
    const searchTermLower = this.searchTerm.toLowerCase();
    const uniqueChampions = new Map<string, { name: string, icon: string }>();

    this.champions.forEach(champion => {
      if (champion.name.toLowerCase().includes(searchTermLower)) {
        uniqueChampions.set(champion.name.toLowerCase(), champion);
      }
    });

    this.filteredChampions = Array.from(uniqueChampions.values());
  }

  
  filterChampions2() {
    const searchTermLower = this.searchTerm2.toLowerCase();
    const uniqueChampions = new Map<string, { name: string, icon: string }>();

    this.champions.forEach(champion => {
      if (champion.name.toLowerCase().includes(searchTermLower)) {
        uniqueChampions.set(champion.name.toLowerCase(), champion);
      }
    });

    this.filteredChampions2 = Array.from(uniqueChampions.values());
  }

  async selectChampion(champion: any) {
    this.selectedChampion = champion;
    this.searchTerm = champion.name; // Mise à jour de la barre de recherche avec le nom
    this.filteredChampions = []; // Cache la liste après sélection
    this.displayDatas();
  }

  // Sélection d'un champion pour la deuxième dropdown
  async selectChampion2(champion: any) {
    this.selectedChampion2 = champion;
    this.searchTerm2 = champion.name; // Mise à jour de la barre de recherche avec le nom
    this.filteredChampions2 = []; // Cache la liste après sélection
    this.displayDatas();
  }

  async getRiotApi(){
    try{
      let urlJson = 'src/riotApi.json';
      const data = await lastValueFrom(this.http.get<any[]>(urlJson));
      this.riotApiKey = data[0].TOKEN;
    }
    catch (error) {
      console.error('Erreur lors de la récupération des données', error);
    }
  }

   async displayDatas(){    
    this.isMatchupReady=false;
    if (this.selectedChampion && this.selectedChampion2){
      this.isFirstSearch = false;
      await this.getJsonDataByChampion(this.selectedChampion.name,this.selectedChampion2.name);
      if(this.imgBkg1 !== "assets/img/championsIcons/" + this.selectedChampion.name.toLowerCase() + ".webp")
      {
        this.showImage1 = false;
        setTimeout(() => {
          this.imgBkg1="assets/img/championsIcons/" + this.selectedChampion.name.toLowerCase() + ".webp";
          this.showImage1 = true; 
        }, 400); 
      }
      if(this.imgBkg2 !== "assets/img/championsIcons/" + this.selectedChampion2.name.toLowerCase() + ".webp")
      {
        this.showImage2 = false;
        setTimeout(() => {
          this.imgBkg2="assets/img/championsIcons/" + this.selectedChampion2.name.toLowerCase() + ".webp";
          this.showImage2 = true; 
        }, 400); 
      }
      if(this.filteredMatchup && this.filteredMatchup[0]){
        this.isMatchupReady=true;
      }      
    }
    if (!this.isFirstSearch){
      this.isVisible = false;
    }
   }

   filterString(input: string): string {
    // Chercher le premier caractère qui est une lettre ou un chiffre
    const match = input.match(/[a-zA-Z0-9]/);
    
    if (match) {
      // Si un caractère valide est trouvé, retourner la chaîne à partir de ce caractère
      const index = match.index!;
      return input.slice(index);
    } else {
      // Si aucun caractère valide n'est trouvé, retourner une chaîne vide ou un autre traitement
      return '';
    }
  }
}
