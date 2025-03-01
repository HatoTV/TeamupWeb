import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BaneerWarningComponent } from './baneer-warning/baneer-warning.component';
import { MatchupsComponent } from './LeagueOfLegends/matchups/matchups.component';
import { LeftBarComponent } from './Navigation/left-bar/left-bar.component';
import { TopBarComponent } from './Navigation/top-bar/top-bar.component';
import { LanguageService } from './services/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatchupsComponent, LeftBarComponent, TopBarComponent, CommonModule,BaneerWarningComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  constructor(
    private router: Router,
    private translate: TranslateService,
    private activatedRoute: ActivatedRoute, private languageService: LanguageService
  ) { }
 title = 'TeamUpp'; 
  ngOnInit() {
    this.router.events.subscribe((event: any) => {
      if (event instanceof NavigationEnd) {
        const url = this.router.url.split('/')[1];
        const supportedLangs = ['en', 'fr'];
        const lang = supportedLangs.includes(url) ? url : this.languageService.translate.defaultLang || 'fr';

        // Changer la langue en fonction de l'URL
        this.languageService.changeLanguage(lang);

        // Si l'URL ne contient pas la langue, rediriger vers la langue par défaut
        if (!supportedLangs.includes(url)) {
          this.router.navigate([`/${lang}` + this.router.url]);
        }
      }
    });

    this.activatedRoute.fragment.subscribe((fragment: string | null) => {
      if (fragment) this.jumpToSection(fragment);
    });

  }

  jumpToSection(section: string | null) {
    if (section) {
      const cleanedSection = decodeURIComponent(section).replace(/%23/g, '#');
      const element = document.getElementById(cleanedSection);
      if (element) {
        element.scrollIntoView();
      } else {
        console.error(`Element with id ${cleanedSection} not found.`);
      }
    }
  }

}
