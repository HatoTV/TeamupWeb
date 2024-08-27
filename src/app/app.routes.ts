import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { MatchupsComponent } from './LeagueOfLegends/matchups/matchups.component';
export const routes: Routes = [
  { path: '', redirectTo: '/fr/lol/matchups', pathMatch: 'full' }, // Redirection par défaut
  { path: ':lang/lol/matchups', component: MatchupsComponent }, // Route avec paramètre de langue
  ];
