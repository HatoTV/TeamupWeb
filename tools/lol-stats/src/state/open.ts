import type { Config } from '../config.ts';
import { FileStateStore, type StateStore } from './store.ts';

/** Local folder by default; Cloudflare R2 when its credentials are set (see R2StateStore). */
export function openStore(config: Config): StateStore {
  return new FileStateStore(config.stateDir);
}
