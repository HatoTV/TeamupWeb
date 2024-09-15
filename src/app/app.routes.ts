import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { GameComponent } from './LeagueOfLegends/game/game.component';
import { GuidesComponent } from './LeagueOfLegends/guides/guides.component';
import { JungleComponent } from './LeagueOfLegends/jungle/jungle.component';
import { LaningComponent } from './LeagueOfLegends/laning/laning.component';
import { MatchupsComponent } from './LeagueOfLegends/matchups/matchups.component';
import { WavemanagementComponent } from './LeagueOfLegends/wavemanagement/wavemanagement.component';
export const routes: Routes = [
  { path: '', redirectTo: '/fr/lol/matchups', pathMatch: 'full' }, // Redirection par défaut
  { path: ':lang/lol/matchups', component: MatchupsComponent }, // Route avec paramètre de langue
  { path: ':lang/lol/guides', component: GuidesComponent }, // Route avec paramètre de langue
  { path: ':lang/lol/laning', component: LaningComponent }, // Route avec paramètre de langue
  { path: ':lang/lol/wavemanagement', component: WavemanagementComponent }, // Route avec paramètre de langue
  { path: ':lang/lol/jungle', component: JungleComponent }, // Route avec paramètre de langue
  { path: ':lang/lol/game', component: GameComponent }, // Route avec paramètre de langue
  ];
