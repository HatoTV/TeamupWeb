import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LOL_GUIDE_GROUPS, LOL_TOOLS } from '../../core/navigation/lol-nav';
import { RouteContextService } from '../../core/route-context.service';
import { SOCIALS, SUPPORTED_LANGS } from '../../core/site.config';
import { BrandIconComponent } from '../../shared/ui/icon/brand-icon.component';
import { LangFlagComponent } from '../../shared/ui/lang-flag.component';

interface FooterColumn {
  titleKey: string;
  links: { labelKey: string; path: string }[];
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, TranslateModule, BrandIconComponent, LangFlagComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  protected readonly ctx = inject(RouteContextService);
  protected readonly socials = SOCIALS;
  protected readonly langs = SUPPORTED_LANGS;
  protected readonly year = new Date().getFullYear();

  protected readonly columns: FooterColumn[] = [
    {
      titleKey: 'GAMES.LOL',
      links: [
        ...LOL_TOOLS.map((t) => ({ labelKey: t.labelKey, path: t.path })),
        ...LOL_GUIDE_GROUPS.map((g) => ({ labelKey: g.labelKey, path: g.path })),
      ],
    },
    {
      titleKey: 'FOOTER.OTHER_GAMES',
      links: [
        { labelKey: 'GAMES.TFT', path: '/tft' },
        { labelKey: 'FOOTER.RL_MECHANICS', path: '/rocket/mecanics' },
      ],
    },
    {
      titleKey: 'FOOTER.INFO',
      links: [
        { labelKey: 'ABOUTME', path: '/contact' },
        { labelKey: 'CGU.TITLE', path: '/cgu' },
        { labelKey: 'PRIVACY.TITLE', path: '/privacy' },
        { labelKey: 'MENTIONS.TITLE', path: '/mentions-legales' },
      ],
    },
  ];
}
