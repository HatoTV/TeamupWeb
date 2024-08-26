import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
  title = 'TeamupWeb';
}
