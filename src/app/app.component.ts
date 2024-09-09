import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MatchupsComponent } from './LeagueOfLegends/matchups/matchups.component';
import { LeftBarComponent } from './Navigation/left-bar/left-bar.component';
import { TopBarComponent } from './Navigation/top-bar/top-bar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatchupsComponent, LeftBarComponent, TopBarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  constructor(
    private router: Router,
    private translate: TranslateService,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit() {
    const defaultLang = this.translate.defaultLang || 'fr'; // Utiliser la langue par défaut de TranslateService

    this.router.events.subscribe((event: any) => {
      if (event instanceof NavigationEnd) {
        const url = this.router.url.split('/')[1];
        const lang = ['en', 'fr'].includes(url) ? url : defaultLang;
        this.translate.use(lang);

        // Optionnel : Rediriger l'utilisateur vers la bonne URL si la langue est manquante
        if (!['en', 'fr'].includes(url)) {
          this.router.navigate([`/${defaultLang}` + this.router.url]);
        }
      }
    });

    this.activatedRoute.fragment.subscribe((fragment: string | null) => {
      if (fragment) this.jumpToSection(fragment);
    });
  }

  jumpToSection(section: string | null) {
    if (section)
      document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
  }
}
