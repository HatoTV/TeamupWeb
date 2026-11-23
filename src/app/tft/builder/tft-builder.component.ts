import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouteContextService } from '../../core/route-context.service';
import { injectPageSeo } from '../../core/seo.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { CELLS, COLS, MAX_ITEMS, MAX_STARS, ROWS, PlacedUnit, autoCell, boardCost, cellOf, colOf, decodeBoard, encodeBoard, placementRole, rowOf } from '../logic/board';
import { computeSynergies } from '../logic/synergies';
import { TftChampion, TftItem } from '../logic/tft-types';
import { TftCatalog, TftDataService, fold } from '../tft-data.service';
import { TftItemComponent, TftTraitComponent, costColor } from '../ui/tft-ui.components';

const STORAGE_KEY = 'teamupp.tft.builder.saved';
const LONG_PRESS_MS = 500;
const DRAG_THRESHOLD_PX = 6;

/** What is being dragged with the mouse (or a pen): a unit of the board, a champion of the list or an item. */
type DragSource = { kind: 'cell'; cell: number } | { kind: 'champion'; id: string } | { kind: 'item'; id: string };

interface Press {
  source: DragSource;
  pointerId: number;
  pointerType: string;
  x: number;
  y: number;
  dragging: boolean;
  longPress: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

interface SavedComp {
  code: string;
  savedAt: string;
}

/**
 * `/:lang/tft/team-builder?b=`: board of 4 × 7 hexes. Mouse: click = +1 star, drag = move / swap, right-click = remove,
 * drag an item onto a champion = equip (3 at most), click an equipped item = take it off. Touch: tap = +1 star, long press =
 * menu (move, items, remove), tap an item then a champion = equip. Keyboard: arrows, Enter (stars), Delete (remove).
 * The board is kept in the URL (`?b=`, compact code) so « Copy link » shares it; « Save » keeps it on this device.
 */
@Component({
  selector: 'app-tft-builder',
  standalone: true,
  imports: [TranslateModule, IconComponent, TftItemComponent, TftTraitComponent],
  templateUrl: './tft-builder.component.html',
  styleUrls: ['../tft-page.scss', '../ui/_tft-board.scss', './tft-builder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TftBuilderComponent {
  protected readonly ctx = inject(RouteContextService);
  private readonly data = inject(TftDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly rows = Array.from({ length: ROWS }, (_, i) => i);
  protected readonly cols = Array.from({ length: COLS }, (_, i) => i);
  protected readonly cellOf = cellOf;
  protected readonly costColor = costColor;
  protected readonly costs = [1, 2, 3, 4, 5];

  protected readonly catalog = signal<TftCatalog | null>(null);
  protected readonly units = signal<PlacedUnit[]>([]);
  protected readonly search = signal('');
  protected readonly traitFilter = signal<string | null>(null);
  /** Item chosen in the palette, waiting for a champion (touch and keyboard). */
  protected readonly pendingItem = signal<string | null>(null);
  /** Cell whose unit is being moved with the menu (touch) or the keyboard. */
  protected readonly moving = signal<number | null>(null);
  /** Long-press menu of a cell. */
  protected readonly menu = signal<number | null>(null);
  /** Unit that receives the next item picked in the palette (menu « Items »). */
  protected readonly equipTarget = signal<number | null>(null);
  protected readonly focusCell = signal(cellOf(0, 3));
  protected readonly ghost = signal<{ icon: string | null; label: string; x: number; y: number } | null>(null);
  protected readonly dropCell = signal<number | null>(null);
  protected readonly announce = signal('');
  protected readonly saved = signal<SavedComp[]>([]);
  protected readonly coarse = signal(false);

  private readonly query = toSignal(this.route.queryParamMap);
  private press: Press | null = null;
  private lastPointer = 'mouse';
  private loadedCode: string | null | undefined = undefined;

  protected readonly byCell = computed(() => new Map(this.units().map((u) => [u.cell, u])));
  protected readonly synergies = computed(() => {
    const catalog = this.catalog();
    if (!catalog) return [];
    return computeSynergies(
      this.units().map((u) => ({ champion: u.champion, items: u.items })),
      catalog.synergies
    ).map((s) => ({ ...s, info: catalog.trait(s.trait) }));
  });
  protected readonly activeSynergies = computed(() => this.synergies().filter((s) => s.style));
  protected readonly inactiveSynergies = computed(() => this.synergies().filter((s) => !s.style));
  protected readonly cost = computed(() => {
    const catalog = this.catalog();
    return boardCost(this.units().map((u) => ({ cost: catalog?.champion(u.champion)?.cost ?? 1, stars: u.stars })));
  });
  private readonly onBoard = computed(() => new Set(this.units().map((u) => u.champion)));

  protected readonly championGroups = computed(() => {
    const catalog = this.catalog();
    if (!catalog) return [];
    const q = fold(this.search().trim());
    const trait = this.traitFilter();
    const list = catalog.listed.filter((c) => (!trait || c.traits.includes(trait)) && (!q || fold(c.name).includes(q)));
    return this.costs.map((cost) => ({ cost, champions: list.filter((c) => c.cost === cost) })).filter((g) => g.champions.length);
  });

  protected readonly itemGroups = computed(() => {
    const items = this.catalog()?.items ?? [];
    const sorted = (kind: TftItem['kind']) => items.filter((i) => i.kind === kind).sort((a, b) => a.name.localeCompare(b.name));
    return [
      { key: 'COMPLETE', items: sorted('complete') },
      { key: 'EMBLEMS', items: sorted('emblem') },
      { key: 'COMPONENTS', items: sorted('component') },
    ];
  });

  constructor() {
    injectPageSeo(() => ({ titleKey: 'TFTDATA.SEO.BUILDER_TITLE', descriptionKey: 'TFTDATA.SEO.BUILDER_DESC', params: { set: this.catalog()?.data.set ?? '' }, image: '/assets/img/site/bkgContent_Tft.webp' }));
    effect(() => {
      const lang = this.ctx.lang();
      untracked(() => void this.data.catalog(lang).then((c) => this.catalog.set(c)));
    });
    // Board from the link (`?b=`): on load, and when another comp is opened (comps page, saved comps).
    effect(() => {
      const catalog = this.catalog();
      const code = this.query()?.get('b') ?? null;
      if (!catalog || code === this.loadedCode) return;
      untracked(() => {
        this.loadedCode = code;
        if (code === this.currentCode()) return;
        this.units.set(decodeBoard(code, { champion: (s) => catalog.championByShort(s)?.id, item: (s) => catalog.itemByShort(s)?.id }));
        if (code) this.say('TFTDATA.BUILDER.LOADED');
      });
    });
    // Link kept up to date with the board.
    effect(() => {
      this.units();
      const catalog = this.catalog();
      if (!catalog) return;
      untracked(() => {
        const code = this.currentCode() || null;
        if (code === (this.query()?.get('b') ?? null)) return;
        this.loadedCode = code;
        void this.router.navigate([], { relativeTo: this.route, queryParams: { b: code }, queryParamsHandling: 'merge', replaceUrl: true });
      });
    });
    if (typeof window !== 'undefined') {
      this.saved.set(this.readSaved());
      this.coarse.set(window.matchMedia?.('(pointer: coarse)').matches ?? false);
    }
  }

  private currentCode(): string {
    const catalog = this.catalog();
    if (!catalog) return '';
    return encodeBoard(this.units(), { champion: (id) => catalog.champion(id)?.short, item: (id) => catalog.item(id)?.short });
  }

  // ---------- labels ----------

  protected champion(id: string): TftChampion | undefined {
    return this.catalog()?.champion(id);
  }
  protected item(id: string): TftItem | undefined {
    return this.catalog()?.item(id);
  }

  protected cellLabel(cell: number): string {
    const u = this.byCell().get(cell);
    if (!u) return this.translate.instant('TFTDATA.BUILDER.CELL_EMPTY', { row: rowOf(cell) + 1, col: colOf(cell) + 1 });
    return this.translate.instant('TFTDATA.BOARD.CELL', { name: this.champion(u.champion)?.name ?? u.champion, stars: u.stars, items: u.items.length });
  }

  private say(key: string, params: Record<string, unknown> = {}): void {
    this.announce.set(this.translate.instant(key, params));
  }

  private nameOf(cell: number): string {
    const u = this.byCell().get(cell);
    return u ? (this.champion(u.champion)?.name ?? u.champion) : '';
  }

  // ---------- board operations ----------

  private update(fn: (units: PlacedUnit[]) => PlacedUnit[]): void {
    this.units.update((units) => fn(units.map((u) => ({ ...u, items: [...u.items] }))));
  }

  /** Places a champion: on `cell` (the unit there moves to a free cell), or automatically (tanks in front, ranged behind). */
  protected place(id: string, cell?: number): void {
    const champion = this.champion(id);
    if (!champion) return;
    const occupied = new Set(this.units().map((u) => u.cell));
    if (occupied.size >= CELLS) return this.say('TFTDATA.BUILDER.FULL');
    const auto = autoCell(placementRole(champion, false), occupied);
    const target = cell ?? auto;
    this.update((units) => {
      const there = units.find((u) => u.cell === target);
      if (there) there.cell = autoCell(placementRole(this.champion(there.champion)!, false), new Set([...occupied, target]));
      return [...units, { champion: id, stars: 1, cell: target, items: [] }];
    });
    this.focusCell.set(target);
    this.say('TFTDATA.BUILDER.ADDED', { name: champion.name });
  }

  protected star(cell: number): void {
    const u = this.byCell().get(cell);
    if (!u) return;
    const stars = (u.stars % MAX_STARS) + 1;
    this.update((units) => units.map((x) => (x.cell === cell ? { ...x, stars } : x)));
    this.say('TFTDATA.BUILDER.STARRED', { name: this.nameOf(cell), stars });
  }

  protected remove(cell: number): void {
    const name = this.nameOf(cell);
    if (!name) return;
    this.update((units) => units.filter((u) => u.cell !== cell));
    this.menu.set(null);
    this.say('TFTDATA.BUILDER.REMOVED', { name });
  }

  /** Moves a unit, or swaps it with the unit of the target cell. */
  protected move(from: number, to: number): void {
    if (from === to || !this.byCell().get(from)) return;
    const name = this.nameOf(from);
    this.update((units) =>
      units.map((u) => (u.cell === from ? { ...u, cell: to } : u.cell === to ? { ...u, cell: from } : u))
    );
    this.focusCell.set(to);
    this.say('TFTDATA.BUILDER.MOVED', { name });
  }

  protected equip(cell: number, itemId: string): void {
    const u = this.byCell().get(cell);
    const item = this.item(itemId);
    if (!u || !item) return;
    const name = this.nameOf(cell);
    if (u.items.length >= MAX_ITEMS) return this.say('TFTDATA.BUILDER.ITEMS_FULL', { name });
    if (item.kind === 'emblem' && item.trait && this.champion(u.champion)?.traits.includes(item.trait)) this.say('TFTDATA.BUILDER.EMBLEM_USELESS', { name });
    else this.say('TFTDATA.BUILDER.EQUIPPED', { item: item.name, name });
    this.update((units) => units.map((x) => (x.cell === cell ? { ...x, items: [...x.items, itemId] } : x)));
    this.pendingItem.set(null);
    this.equipTarget.set(null);
  }

  protected unequip(cell: number, index: number): void {
    const u = this.byCell().get(cell);
    const itemId = u?.items[index];
    if (!u || !itemId) return;
    this.update((units) => units.map((x) => (x.cell === cell ? { ...x, items: x.items.filter((_, i) => i !== index) } : x)));
    this.say('TFTDATA.BUILDER.UNEQUIPPED', { item: this.item(itemId)?.name ?? itemId, name: this.nameOf(cell) });
  }

  protected clear(): void {
    this.units.set([]);
    this.menu.set(null);
    this.moving.set(null);
  }

  // ---------- cell activation (click, tap, Enter) ----------

  /** A cell was activated without dragging: finishes a move, equips the pending item, or adds a star. */
  protected activate(cell: number): void {
    const moving = this.moving();
    if (moving !== null) {
      this.moving.set(null);
      this.move(moving, cell);
      return;
    }
    const u = this.byCell().get(cell);
    if (!u) return;
    const pending = this.pendingItem();
    if (pending) return this.equip(cell, pending);
    this.star(cell);
  }

  protected onContextMenu(event: MouseEvent, cell: number): void {
    event.preventDefault();
    // Android fires `contextmenu` on a long press: the menu is opened by the long press itself.
    if (this.press?.pointerType === 'touch' || this.lastPointer === 'touch') return;
    this.remove(cell);
  }

  protected onCellKey(event: KeyboardEvent, cell: number): void {
    const r = rowOf(cell);
    const c = colOf(cell);
    const go = (row: number, col: number) => {
      event.preventDefault();
      const next = cellOf(Math.min(ROWS - 1, Math.max(0, row)), Math.min(COLS - 1, Math.max(0, col)));
      this.focusCell.set(next);
      (this.host.nativeElement.querySelector(`[data-cell="${next}"]`) as HTMLElement | null)?.focus();
    };
    switch (event.key) {
      case 'ArrowLeft':
        return go(r, c - 1);
      case 'ArrowRight':
        return go(r, c + 1);
      case 'ArrowUp':
        return go(r - 1, c);
      case 'ArrowDown':
        return go(r + 1, c);
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        return this.remove(cell);
      case 'm':
      case 'M':
        if (this.byCell().get(cell)) this.startMove(cell);
        return;
      case 'Escape':
        this.moving.set(null);
        this.pendingItem.set(null);
        this.menu.set(null);
        return;
    }
  }

  // ---------- pointer: drag (mouse / pen), long press (touch) ----------

  protected onPointerDown(event: PointerEvent, source: DragSource): void {
    if (event.button !== 0) return;
    this.cancelPress();
    this.lastPointer = event.pointerType;
    const press: Press = { source, pointerId: event.pointerId, pointerType: event.pointerType, x: event.clientX, y: event.clientY, dragging: false, longPress: false, timer: null };
    if (event.pointerType === 'touch' && source.kind === 'cell' && this.byCell().get(source.cell)) {
      press.timer = setTimeout(() => {
        press.longPress = true;
        press.timer = null;
        this.menu.set(source.cell);
      }, LONG_PRESS_MS);
    }
    this.press = press;
  }

  protected onPointerMove(event: PointerEvent): void {
    const press = this.press;
    if (!press || event.pointerId !== press.pointerId) return;
    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y) > DRAG_THRESHOLD_PX;
    if (press.pointerType === 'touch') {
      // Touch keeps native scrolling: a finger that moves cancels the long press.
      if (moved) this.cancelPress();
      return;
    }
    if (!press.dragging && moved) {
      press.dragging = true;
      (event.target as Element).setPointerCapture?.(event.pointerId);
    }
    if (press.dragging) {
      event.preventDefault();
      const { icon, label } = this.dragVisual(press.source);
      this.ghost.set({ icon, label, x: event.clientX, y: event.clientY });
      this.dropCell.set(this.cellAt(event.clientX, event.clientY));
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    const press = this.press;
    if (!press || event.pointerId !== press.pointerId) return;
    this.cancelPress();
    this.ghost.set(null);
    this.dropCell.set(null);
    if (press.longPress) return;
    const source = press.source;
    if (press.dragging) {
      const target = this.cellAt(event.clientX, event.clientY);
      if (target === null) return;
      if (source.kind === 'cell') this.move(source.cell, target);
      else if (source.kind === 'champion') this.place(source.id, target);
      else if (this.byCell().get(target)) this.equip(target, source.id);
      return;
    }
    // Plain click / tap.
    if (source.kind === 'cell') this.activate(source.cell);
    else if (source.kind === 'champion') this.place(source.id);
    else this.pickItem(source.id);
  }

  protected onPointerCancel(): void {
    this.cancelPress();
    this.ghost.set(null);
    this.dropCell.set(null);
  }

  private cancelPress(): void {
    if (this.press?.timer) clearTimeout(this.press.timer);
    this.press = null;
  }

  /** Keyboard activation (Enter / Space fire `click` with `detail === 0`); pointer clicks are handled on pointer up. */
  protected onKeyClick(event: MouseEvent, source: DragSource): void {
    if (event.detail !== 0) return;
    if (source.kind === 'cell') this.activate(source.cell);
    else if (source.kind === 'champion') this.place(source.id);
    else this.pickItem(source.id);
  }

  private cellAt(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y)?.closest('[data-cell]');
    const cell = el ? Number(el.getAttribute('data-cell')) : NaN;
    return Number.isInteger(cell) ? cell : null;
  }

  private dragVisual(source: DragSource): { icon: string | null; label: string } {
    if (source.kind === 'item') {
      const i = this.item(source.id);
      return { icon: i?.icon ?? null, label: i?.name ?? '' };
    }
    const id = source.kind === 'cell' ? this.byCell().get(source.cell)?.champion : source.id;
    const c = id ? this.champion(id) : undefined;
    return { icon: c?.icon ?? null, label: c?.name ?? '' };
  }

  /** Palette item: equips the unit chosen in the menu, or waits for a champion. */
  protected pickItem(id: string): void {
    const target = this.equipTarget();
    if (target !== null && this.byCell().get(target)) return this.equip(target, id);
    this.pendingItem.set(this.pendingItem() === id ? null : id);
    if (this.pendingItem()) this.say('TFTDATA.BUILDER.ITEM_PICKED', { item: this.item(id)?.name ?? id });
  }

  // ---------- long-press menu ----------

  protected startMove(cell: number): void {
    this.menu.set(null);
    this.moving.set(cell);
    this.say('TFTDATA.BUILDER.MOVE_HINT', { name: this.nameOf(cell) });
  }

  protected menuItems(cell: number): void {
    this.menu.set(null);
    this.equipTarget.set(cell);
    this.host.nativeElement.querySelector('#builder-items')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected menuStar(cell: number): void {
    this.menu.set(null);
    this.star(cell);
  }

  // ---------- toolbar ----------

  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.say('TFTDATA.BUILDER.COPIED');
    } catch {
      this.say('TFTDATA.BUILDER.COPY_FAILED');
    }
  }

  protected save(): void {
    const code = this.currentCode();
    if (!code) return;
    const list = [{ code, savedAt: new Date().toISOString() }, ...this.saved().filter((s) => s.code !== code)].slice(0, 12);
    this.writeSaved(list);
    this.say('TFTDATA.BUILDER.SAVED');
  }

  protected loadSaved(s: SavedComp): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { b: s.code }, queryParamsHandling: 'merge' });
  }

  protected deleteSaved(s: SavedComp): void {
    this.writeSaved(this.saved().filter((x) => x.code !== s.code));
  }

  protected savedPreview(s: SavedComp): TftChampion[] {
    const catalog = this.catalog();
    if (!catalog) return [];
    return decodeBoard(s.code, { champion: (x) => catalog.championByShort(x)?.id, item: (x) => catalog.itemByShort(x)?.id })
      .map((u) => catalog.champion(u.champion))
      .filter((c): c is TftChampion => !!c)
      .slice(0, 10);
  }

  protected savedDate(s: SavedComp): string {
    return new Date(s.savedAt).toLocaleString(this.ctx.lang() === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' });
  }

  private readSaved(): SavedComp[] {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as SavedComp[];
      return Array.isArray(list) ? list.filter((s) => typeof s?.code === 'string') : [];
    } catch {
      return [];
    }
  }

  private writeSaved(list: SavedComp[]): void {
    this.saved.set(list);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Private mode or storage blocked: the list stays for this visit only.
    }
  }

  protected toggleTrait(id: string): void {
    this.traitFilter.set(this.traitFilter() === id ? null : id);
  }

  protected isOnBoard(id: string): boolean {
    return this.onBoard().has(id);
  }
}
