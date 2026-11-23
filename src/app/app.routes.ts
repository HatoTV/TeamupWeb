import { Routes } from '@angular/router';
import { matchupsMatcher } from './LeagueOfLegends/matchups/matchups-url';
import { tftPageMatcher } from './tft/tft-routes';

/** All pages are lazy-loaded; the URL always starts with the language (fr | en). */
export const routes: Routes = [
  { path: '', redirectTo: 'fr/home', pathMatch: 'full' },
  { path: ':lang/lol', redirectTo: ':lang/lol/matchups', pathMatch: 'full' },
  { path: ':lang/rl', redirectTo: ':lang/rocket/mecanics', pathMatch: 'full' },
  { path: ':lang', redirectTo: ':lang/home', pathMatch: 'full' },
  { path: ':lang/home', loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent) },
  {
    // `/:lang/lol/matchups[/:me][/vs/:vs]`: one route so the page is reused between selections.
    matcher: matchupsMatcher,
    loadComponent: () => import('./LeagueOfLegends/matchups/matchups.component').then((m) => m.MatchupsComponent),
  },
  {
    path: ':lang/lol/tier-list',
    loadComponent: () => import('./LeagueOfLegends/tier-list/tier-list.component').then((m) => m.TierListComponent),
  },
  {
    path: ':lang/lol/builds',
    loadComponent: () => import('./LeagueOfLegends/builds/builds-list.component').then((m) => m.BuildsListComponent),
  },
  {
    path: ':lang/lol/champions/:championId',
    loadComponent: () => import('./LeagueOfLegends/builds/champion-redirect.component').then((m) => m.ChampionRedirectComponent),
  },
  {
    path: ':lang/lol/champions/:championId/build/:role',
    loadComponent: () => import('./LeagueOfLegends/builds/build-page.component').then((m) => m.BuildPageComponent),
  },
  {
    // Same page component (header and tabs), « Counters » tab: `?vs={opponent}`.
    path: ':lang/lol/champions/:championId/counters/:role',
    data: { tab: 'counters' },
    loadComponent: () => import('./LeagueOfLegends/builds/build-page.component').then((m) => m.BuildPageComponent),
  },
  {
    path: ':lang/lol/picker',
    loadComponent: () => import('./LeagueOfLegends/picker/picker.component').then((m) => m.PickerComponent),
  },
  { path: ':lang/lol/guides', loadComponent: () => import('./LeagueOfLegends/guides/guides.component').then((m) => m.GuidesComponent) },
  { path: ':lang/lol/game', loadComponent: () => import('./LeagueOfLegends/game/game.component').then((m) => m.GameComponent) },
  { path: ':lang/lol/laning', loadComponent: () => import('./LeagueOfLegends/laning/laning.component').then((m) => m.LaningComponent) },
  {
    path: ':lang/lol/wavemanagement',
    loadComponent: () =>
      import('./LeagueOfLegends/wavemanagement/wavemanagement.component').then((m) => m.WavemanagementComponent),
  },
  { path: ':lang/lol/jungle', loadComponent: () => import('./LeagueOfLegends/jungle/jungle.component').then((m) => m.JungleComponent) },
  { path: ':lang/tft', loadComponent: () => import('./tftgame/tftgame.component').then((m) => m.TFTGameComponent) },
  { path: ':lang/tft/compositions', loadComponent: () => import('./tft/comps/tft-comps.component').then((m) => m.TftCompsComponent) },
  // `/:lang/tft/objets[/:slug]` and `/:lang/tft/champions[/:slug]`: one route each, the page is reused between selections.
  { matcher: tftPageMatcher('objets'), loadComponent: () => import('./tft/items/tft-items.component').then((m) => m.TftItemsComponent) },
  { matcher: tftPageMatcher('champions'), loadComponent: () => import('./tft/champions/tft-champions.component').then((m) => m.TftChampionsComponent) },
  { path: ':lang/tft/team-builder', loadComponent: () => import('./tft/builder/tft-builder.component').then((m) => m.TftBuilderComponent) },
  {
    path: ':lang/rocket/mecanics',
    loadComponent: () => import('./RocketLeague/mecanics/mecanics.component').then((m) => m.MecanicsComponent),
  },
  {
    path: ':lang/rocket/mecanics/:slug',
    loadComponent: () => import('./RocketLeague/mecanic/mecanic.component').then((m) => m.MecanicComponent),
  },
  { path: ':lang/contact', loadComponent: () => import('./contact/contact.component').then((m) => m.ContactComponent) },
  { path: ':lang/cgu', data: { doc: 'cgu' }, loadComponent: () => import('./legal/legal.component').then((m) => m.LegalComponent) },
  { path: ':lang/privacy', data: { doc: 'privacy' }, loadComponent: () => import('./legal/legal.component').then((m) => m.LegalComponent) },
  {
    path: ':lang/mentions-legales',
    data: { doc: 'mentions' },
    loadComponent: () => import('./legal/legal.component').then((m) => m.LegalComponent),
  },
  { path: '**', loadComponent: () => import('./not-found/not-found.component').then((m) => m.NotFoundComponent) },
];
