import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { slugify } from '../slug';

interface MechanicRow {
  name: string;
  subname: string;
  img: string;
  difficulty: number;
  utility: number;
  author: string;
  video: string;
  etapes: string;
  explication: string;
}

export interface Mechanic {
  slug: string;
  name: string;
  subname: string;
  author: string;
  difficulty: number;
  utility: number;
  /** Optimised 16:9 thumbnail (also the video poster). */
  thumbnail: string;
  video: string;
  /** Translation key of the ";"-separated steps. */
  stepsKey: string;
  /** Translation key of the explanation. */
  explanationKey: string;
}

/** Rocket League mechanics from assets/rlmecanics.json. */
@Injectable({ providedIn: 'root' })
export class RlMechanicsService {
  private readonly http = inject(HttpClient);
  private request: Promise<Mechanic[]> | null = null;
  readonly list = signal<Mechanic[] | null>(null);

  load(): Promise<Mechanic[]> {
    this.request ??= firstValueFrom(this.http.get<MechanicRow[]>('assets/rlmecanics.json'))
      .then((rows) => {
        const list = rows.map((row) => this.toMechanic(row));
        this.list.set(list);
        return list;
      })
      .catch((error) => {
        this.request = null;
        throw error;
      });
    return this.request;
  }

  private toMechanic(row: MechanicRow): Mechanic {
    // "assets/img/rocketLeague/minia_ceilingshot.png" -> "assets/img/rl/ceilingshot.webp"
    const thumb = /minia_([a-z0-9]+)\./i.exec(row.img)?.[1];
    return {
      slug: slugify(row.name),
      name: row.name,
      subname: row.subname?.trim() ?? '',
      author: row.author,
      difficulty: row.difficulty,
      utility: row.utility,
      thumbnail: thumb ? `assets/img/rl/${thumb}.webp` : row.img,
      video: `assets/rlVideos/${row.video}`,
      stepsKey: row.etapes,
      explanationKey: row.explication,
    };
  }
}
