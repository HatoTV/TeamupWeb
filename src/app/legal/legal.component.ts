import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import { RouteContextService } from '../core/route-context.service';
import { SeoService } from '../core/seo.service';
import { SafeHtmlPipe } from '../safe-html.pipe';

export type LegalDoc = 'cgu' | 'privacy' | 'mentions';

interface LegalDefinition {
  path: string;
  titleKey: string;
  metaKey: string;
  /** Optional intro: bold label + text. */
  intro?: { labelKey: string; textKey: string };
  /** Translation prefixes of numbered sections (each has .TITLE and .DESCRIPTION). */
  sections: string[];
}

/** Legal documents. The texts are the existing translations, unchanged. */
export const LEGAL_DOCS: Record<LegalDoc, LegalDefinition> = {
  cgu: {
    path: '/cgu',
    titleKey: 'CGU.TITLE',
    metaKey: 'LEGALPAGE.META_CGU',
    intro: { labelKey: 'CGU.OBJECT', textKey: 'CGU.INTRO' },
    sections: ['ACCESS', 'CONTENT', 'INDEPENDENCE', 'IP', 'ADS', 'DATA', 'MODIFICATIONS', 'LAW', 'CONTACT'].map((k) => `CGU.${k}`),
  },
  privacy: {
    path: '/privacy',
    titleKey: 'PRIVACY.TITLE',
    metaKey: 'LEGALPAGE.META_PRIVACY',
    sections: ['INTRO', 'DATA_COLLECTED', 'DATA_USE', 'COOKIES', 'DATA_SHARING', 'USER_RIGHTS', 'MODIFICATIONS', 'CONTACT'].map(
      (k) => `PRIVACY.${k}`
    ),
  },
  mentions: {
    path: '/mentions-legales',
    titleKey: 'MENTIONS.TITLE',
    metaKey: 'LEGALPAGE.META_MENTIONS',
    intro: { labelKey: '', textKey: 'MENTIONS.INTRO' },
    sections: ['EDITOR', 'DIRECTOR', 'CONTACT', 'HOST', 'IP', 'DATA'].map((k) => `MENTIONS.${k}`),
  },
};

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [TranslateModule, RouterLink, SafeHtmlPipe],
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalComponent {
  protected readonly ctx = inject(RouteContextService);
  protected readonly tabs = (Object.keys(LEGAL_DOCS) as LegalDoc[]).map((id) => ({ id, ...LEGAL_DOCS[id] }));

  private readonly docId = toSignal(inject(ActivatedRoute).data.pipe(map((d) => (d['doc'] as LegalDoc) ?? 'cgu')), {
    initialValue: 'cgu' as LegalDoc,
  });
  protected readonly doc = computed(() => ({ id: this.docId(), ...LEGAL_DOCS[this.docId()] }));
  protected readonly sections = computed(() =>
    this.doc().sections.map((key, i) => ({ key, id: `section-${i + 1}`, n: String(i + 1).padStart(2, '0') }))
  );

  constructor() {
    const seo = inject(SeoService);
    const translate = inject(TranslateService);
    effect(() => {
      const doc = this.doc();
      this.ctx.lang();
      translate.get([doc.titleKey, doc.metaKey]).subscribe((t) => seo.setPage({ title: t[doc.titleKey], description: t[doc.metaKey] }));
    });
  }
}
