import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { COLS, ROWS, cellOf } from '../logic/board';
import { TftChampion, TftItem } from '../logic/tft-types';
import { TftItemComponent, costColor } from './tft-ui.components';

export interface BoardCell {
  cell: number;
  champion: TftChampion;
  stars: number;
  items: Array<TftItem | undefined>;
}

/** Read-only board (recommended placement of a comp). */
@Component({
  selector: 'app-tft-board',
  standalone: true,
  imports: [TranslateModule, TftItemComponent],
  template: `<div class="board">
    <p class="board__label">{{ 'TFTDATA.BOARD.FRONT' | translate }}</p>
    <div class="board__rows" role="list" [attr.aria-label]="'TFTDATA.BOARD.LABEL' | translate">
      @for (row of rows; track row) {
        <div class="board__row">
          @for (col of cols; track col) {
            @let u = byCell().get(cellOf(row, col));
            <div class="hexcell" role="listitem" [style.--hex-border]="u ? cost(u.champion.cost) : null">
              <span class="hexcell__shape"></span>
              <span class="hexcell__inner">
                @if (u?.champion?.icon; as icon) {
                  <img [src]="icon" alt="" loading="lazy" />
                }
              </span>
              @if (u) {
                <span class="sr-only">{{ 'TFTDATA.BOARD.CELL' | translate: { name: u.champion.name, stars: u.stars, items: u.items.length } }}</span>
                @if (u.stars > 1) {
                  <span class="hexcell__stars" aria-hidden="true">{{ u.stars === 3 ? '★★★' : '★★' }}</span>
                }
                @if (u.items.length) {
                  <span class="hexcell__items">
                    @for (i of u.items; track $index) {
                      <app-tft-item [item]="i" [size]="itemSize()" [decorative]="true" />
                    }
                  </span>
                }
              }
            </div>
          }
        </div>
      }
    </div>
    <p class="board__label">{{ 'TFTDATA.BOARD.BACK' | translate }}</p>
  </div>`,
  styleUrl: './_tft-board.scss',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TftBoardComponent {
  readonly units = input.required<readonly BoardCell[]>();
  readonly itemSize = input(13);
  protected readonly rows = Array.from({ length: ROWS }, (_, i) => i);
  protected readonly cols = Array.from({ length: COLS }, (_, i) => i);
  protected readonly cellOf = cellOf;
  protected readonly cost = costColor;
  protected readonly byCell = computed(() => new Map(this.units().map((u) => [u.cell, u])));
}
