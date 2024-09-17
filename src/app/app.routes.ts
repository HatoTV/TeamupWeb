import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { GameComponent } from './LeagueOfLegends/game/game.component';
import { GuidesComponent } from './LeagueOfLegends/guides/guides.component';
import { JungleComponent } from './LeagueOfLegends/jungle/jungle.component';
import { LaningComponent } from './LeagueOfLegends/laning/laning.component';
import { MatchupsComponent } from './LeagueOfLegends/matchups/matchups.component';
import { WavemanagementComponent } from './LeagueOfLegends/wavemanagement/wavemanagement.component';
import { MecanicsComponent } from './RocketLeague/mecanics/mecanics.component';
export const routes: Routes = [
  { path: '', redirectTo: '/fr/lol/matchups', pathMatch: 'full' },
  { path: ':lang', redirectTo: '/fr/lol/matchups', pathMatch: 'full' },
  { path: ':lang/lol/matchups', component: MatchupsComponent },
  { path: ':lang/lol/guides', component: GuidesComponent }, 
  { path: ':lang/lol/laning', component: LaningComponent },
  { path: ':lang/lol/wavemanagement', component: WavemanagementComponent },
  { path: ':lang/lol/jungle', component: JungleComponent },
  { path: ':lang/lol/game', component: GameComponent },
  { path: ':lang/rocket/mecanics', component: MecanicsComponent },
  ];
