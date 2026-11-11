import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ChampionDataService } from '../../core/data/champion-data.service';
import { RouteContextService } from '../../core/route-context.service';

/** `/:lang/lol/champions/:championId` → build page of the champion's main role. */
@Component({
  selector: 'app-champion-redirect',
  standalone: true,
  template: '<div style="min-height: 60vh" aria-busy="true"></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChampionRedirectComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ctx = inject(RouteContextService);
  private readonly champions = inject(ChampionDataService);
  private readonly params = toSignal(this.route.paramMap);

  constructor() {
    void this.champions.loadIndex().catch(() => undefined);
    effect(() => {
      const index = this.champions.index();
      const slug = this.params()?.get('championId');
      if (!index || !slug) return;
      const champion = index.champions.find((c) => c.slug === slug);
      const target = champion ? `/lol/champions/${slug}/build/${champion.roles[0] ?? 'mid'}` : '/lol/builds';
      untracked(() => void this.router.navigateByUrl(this.ctx.link(target), { replaceUrl: true }));
    });
  }
}
