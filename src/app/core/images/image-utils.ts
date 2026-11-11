import { ChangeDetectionStrategy, Component, Pipe, PipeTransform, computed, input } from '@angular/core';
import { ImageLoaderConfig } from '@angular/common';
import { IMAGE_MANIFEST, ImageEntry } from './image-manifest';

export type ImageFormat = 'avif' | 'webp';

function entryFor(src: string): ImageEntry | undefined {
  return IMAGE_MANIFEST[src.replace(/^\//, '')];
}

/** "a-640.avif 640w, a-1600.avif 1600w" for a local image, or '' when not optimised. */
export function srcsetFor(src: string, format: ImageFormat): string {
  const entry = entryFor(src);
  return entry ? entry.widths.map((w) => `${entry.opt}-${w}.${format} ${w}w`).join(', ') : '';
}

/** Largest WebP variant (or the original when the image is not in the manifest). */
export function fallbackFor(src: string): string {
  const entry = entryFor(src);
  return entry ? `${entry.opt}-${entry.widths.at(-1)}.webp` : src;
}

/**
 * IMAGE_LOADER for NgOptimizedImage: Data Dragon and other absolute URLs are returned as is;
 * local images resolve to the smallest optimised WebP variant at least as wide as requested.
 */
export function teamuppImageLoader(config: ImageLoaderConfig): string {
  if (/^https?:\/\//.test(config.src)) return config.src;
  const entry = entryFor(config.src);
  if (!entry) return config.src;
  const width = entry.widths.find((w) => !config.width || w >= config.width) ?? entry.widths.at(-1);
  return `${entry.opt}-${width}.webp`;
}

@Pipe({ name: 'srcset', standalone: true })
export class SrcsetPipe implements PipeTransform {
  transform(src: string, format: ImageFormat): string {
    return srcsetFor(src, format);
  }
}

@Pipe({ name: 'imgFallback', standalone: true })
export class ImgFallbackPipe implements PipeTransform {
  transform(src: string): string {
    return fallbackFor(src);
  }
}

/**
 * Responsive <picture> (AVIF + WebP srcset) for content images such as guide figures.
 * Width/height come from the manifest to avoid layout shifts.
 */
@Component({
  selector: 'app-picture',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <picture>
      @if (avif()) {
        <source type="image/avif" [attr.srcset]="avif()" [attr.sizes]="sizes()" />
        <source type="image/webp" [attr.srcset]="webp()" [attr.sizes]="sizes()" />
      }
      <img
        [src]="fallback()"
        [alt]="alt()"
        [attr.width]="entry()?.w ?? null"
        [attr.height]="entry()?.h ?? null"
        [attr.loading]="priority() ? null : 'lazy'"
        [attr.fetchpriority]="priority() ? 'high' : null"
        decoding="async"
      />
    </picture>
  `,
})
export class PictureComponent {
  readonly src = input.required<string>();
  readonly alt = input.required<string>();
  readonly sizes = input('(min-width: 1100px) 760px, 100vw');
  readonly priority = input(false);

  protected readonly entry = computed(() => entryFor(this.src()));
  protected readonly avif = computed(() => srcsetFor(this.src(), 'avif'));
  protected readonly webp = computed(() => srcsetFor(this.src(), 'webp'));
  protected readonly fallback = computed(() => fallbackFor(this.src()));
}
