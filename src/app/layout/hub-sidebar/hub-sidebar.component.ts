import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ActiveSectionService } from '../../core/active-section.service';
import { LOL_GUIDE_GROUPS, LOL_TOOLS, LolGuideGroup, LolGuideItem, LolTool } from '../../core/navigation/lol-nav';
import { TFT_GUIDE_GROUPS, TFT_TOOLS } from '../../core/navigation/tft-nav';
import { RouteContextService } from '../../core/route-context.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';

/** Menu of a game hub (League of Legends, Teamfight Tactics): tools + guides. Collapsible under 900 px. */
export interface HubNav {
  id: 'lol' | 'tft';
  nameKey: string;
  menuKey: string;
  toolsKey: string;
  guidesKey: string;
  logo: { src: string; width: number; height: number };
  home: string;
  tools: readonly LolTool[];
  groups: readonly LolGuideGroup[];
}

export const HUB_NAVS: Record<HubNav['id'], HubNav> = {
  lol: {
    id: 'lol',
    nameKey: 'GAMES.LOL',
    menuKey: 'NAV.LOL_MENU',
    toolsKey: 'NAV.LOL_TOOLS',
    guidesKey: 'NAV.LOL_GUIDES',
    logo: { src: 'assets/img/brand/lol-logo.webp', width: 132, height: 51 },
    home: '/lol/matchups',
    tools: LOL_TOOLS,
    groups: LOL_GUIDE_GROUPS,
  },
  tft: {
    id: 'tft',
    nameKey: 'GAMES.TFT',
    menuKey: 'TFTDATA.NAV.MENU',
    toolsKey: 'TFTDATA.NAV.TOOLS',
    guidesKey: 'TFTDATA.NAV.GUIDES',
    logo: { src: 'assets/img/brand/tft-logo.webp', width: 132, height: 39 },
    home: '/tft/compositions',
    tools: TFT_TOOLS,
    groups: TFT_GUIDE_GROUPS,
  },
};

@Component({
  selector: 'app-hub-sidebar',
  standalone: true,
  imports: [RouterLink, TranslateModule, IconComponent],
  templateUrl: './hub-sidebar.component.html',
  styleUrl: './hub-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HubSidebarComponent {
  protected readonly ctx = inject(RouteContextService);
  private readonly activeSection = inject(ActiveSectionService);

  protected readonly nav = computed(() => HUB_NAVS[this.ctx.section() === 'tft' ? 'tft' : 'lol']);
  protected readonly expanded = signal(false);

  /** Section in view (scroll spy) or, failing that, the URL fragment. */
  private readonly currentFragment = computed(() => this.activeSection.id() ?? this.ctx.fragment());

  constructor() {
    // Collapse the mobile menu after each navigation.
    effect(() => {
      this.ctx.path();
      this.ctx.fragment();
      untracked(() => this.expanded.set(false));
    });
  }

  protected isToolActive(tool: LolTool): boolean {
    const path = this.ctx.path();
    return path === tool.path || path.startsWith(`${tool.path}/`);
  }

  protected isGroupActive(group: LolGuideGroup): boolean {
    return this.ctx.path() === group.path;
  }

  protected isItemActive(group: LolGuideGroup, item: LolGuideItem): boolean {
    return this.isGroupActive(group) && this.currentFragment() === item.fragment;
  }
}
