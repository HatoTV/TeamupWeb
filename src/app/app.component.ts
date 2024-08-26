import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { MatchupsComponent } from './LeagueOfLegends/matchups/matchups.component';
import { LeftBarComponent } from './Navigation/left-bar/left-bar.component';
import { TopBarComponent } from './Navigation/top-bar/top-bar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    TranslateModule,CommonModule,LeftBarComponent,TopBarComponent,MatchupsComponent,RouterModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  constructor(private translate: TranslateService) {
    // Ajouter les langues disponibles
    this.translate.addLangs(['en', 'fr']);
    // Définir la langue par défaut
    this.translate.setDefaultLang('fr');
  }

  ngOnInit() {
    // Écouter les changements d'URL pour détecter la langue
    // Vous pouvez mettre ici le code pour détecter la langue à partir de l'URL
  }

  switchLanguage(lang: string) {
    this.translate.use(lang);
  }
}
