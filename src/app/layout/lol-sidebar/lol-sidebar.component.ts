import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ActiveSectionService } from '../../core/active-section.service';
import { LOL_GUIDE_GROUPS, LOL_TOOLS, LolGuideGroup, LolGuideItem, LolTool } from '../../core/navigation/lol-nav';
import { RouteContextService } from '../../core/route-context.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';

/** League of Legends hub menu: champion tools + gameplay guides. Collapsible under 900 px. */
@Component({
  selector: 'app-lol-sidebar',
  standalone: true,
  imports: [RouterLink, TranslateModule, IconComponent],
  templateUrl: './lol-sidebar.component.html',
  styleUrl: './lol-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LolSidebarComponent {
  protected readonly ctx = inject(RouteContextService);
  private readonly activeSection = inject(ActiveSectionService);

  protected readonly tools = LOL_TOOLS;
  protected readonly groups = LOL_GUIDE_GROUPS;
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
    return this.ctx.path() === tool.path;
  }

  protected isGroupActive(group: LolGuideGroup): boolean {
    return this.ctx.path() === group.path;
  }

  protected isItemActive(group: LolGuideGroup, item: LolGuideItem): boolean {
    return this.isGroupActive(group) && this.currentFragment() === item.fragment;
  }
}
