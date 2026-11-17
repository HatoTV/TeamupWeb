import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BuildData } from '../../../core/data/build-data.service';
import { RouteContextService } from '../../../core/route-context.service';
import { AbilityKeyPipe, abilityKey } from '../../../shared/i18n/ability-key';
import { SKILL_COLORS } from '../build-utils';

type Skills = NonNullable<BuildData['skills']>;

/** Skill order of a build: the max order, then the level 1 to 18 grid. */
@Component({
  selector: 'app-skill-order',
  standalone: true,
  imports: [TranslateModule, AbilityKeyPipe],
  templateUrl: './skill-order.component.html',
  styleUrl: './skill-order.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillOrderComponent {
  protected readonly ctx = inject(RouteContextService);
  readonly skills = input.required<Skills>();
  /** Passive first, then the four spells (index = slot). */
  readonly abilities = input.required<ReadonlyArray<{ name: string; src: string }>>();

  protected readonly skillColors = SKILL_COLORS;
  protected readonly levels = Array.from({ length: 18 }, (_, i) => i + 1);
  protected readonly skillRows = computed(() => {
    const order = this.skills().order;
    return ([1, 2, 3, 4] as const).map((slot) => ({ slot, cells: this.levels.map((_, i) => order[i] === String(slot)) }));
  });
  protected readonly maxKeys = computed(() => [...this.skills().max].map((s) => abilityKey(Number(s) as 1 | 2 | 3, this.ctx.lang())));
}
