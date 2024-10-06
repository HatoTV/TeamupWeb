import { Routes } from '@angular/router';
import { AppComponent } from './app.component.js';
import { ContactComponent } from './contact/contact.component.js';
import { HomeComponent } from './home/home.component.js';
import { GameComponent } from './LeagueOfLegends/game/game.component.js';
import { GuidesComponent } from './LeagueOfLegends/guides/guides.component.js';
import { JungleComponent } from './LeagueOfLegends/jungle/jungle.component.js';
import { LaningComponent } from './LeagueOfLegends/laning/laning.component.js';
import { MatchupsComponent } from './LeagueOfLegends/matchups/matchups.component.js';
import { WavemanagementComponent } from './LeagueOfLegends/wavemanagement/wavemanagement.component.js';
import { MecanicsComponent } from './RocketLeague/mecanics/mecanics.component.js';
export const routes: Routes = [
  { path: '', redirectTo: 'fr/home', pathMatch: 'full' },
  { path: ':lang/lol', redirectTo: ':lang/lol/matchups', pathMatch: 'full' },
  { path: ':lang/rl', redirectTo: ':lang/rocket/mecanics', pathMatch: 'full' },
  { path: ':lang', redirectTo: ':lang/home', pathMatch: 'full' },
  { path: ':lang/lol/matchups', component: MatchupsComponent },
  { path: ':lang/lol/guides', component: GuidesComponent }, 
  { path: ':lang/lol/laning', component: LaningComponent },
  { path: ':lang/lol/wavemanagement', component: WavemanagementComponent },
  { path: ':lang/lol/jungle', component: JungleComponent },
  { path: ':lang/lol/game', component: GameComponent },
  { path: ':lang/rocket/mecanics', component: MecanicsComponent },
  { path: ':lang/contact', component: ContactComponent },
  { path: ':lang/home', component: HomeComponent },
  ];
