import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { ContactComponent } from './contact/contact.component';
import { HomeComponent } from './home/home.component';
import { GameComponent } from './LeagueOfLegends/game/game.component';
import { GuidesComponent } from './LeagueOfLegends/guides/guides.component';
import { JungleComponent } from './LeagueOfLegends/jungle/jungle.component';
import { LaningComponent } from './LeagueOfLegends/laning/laning.component';
import { MatchupsComponent } from './LeagueOfLegends/matchups/matchups.component';
import { PickerComponent } from './LeagueOfLegends/picker/picker.component';
import { WavemanagementComponent } from './LeagueOfLegends/wavemanagement/wavemanagement.component';
import { MecanicsComponent } from './RocketLeague/mecanics/mecanics.component';
import { TFTGameComponent } from './tftgame/tftgame.component';
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
  { path: ':lang/lol/picker', component: PickerComponent },
  { path: ':lang/rocket/mecanics', component: MecanicsComponent },
  { path: ':lang/contact', component: ContactComponent },
  { path: ':lang/home', component: HomeComponent },
  { path: ':lang/tft', component: TFTGameComponent },
  ];
