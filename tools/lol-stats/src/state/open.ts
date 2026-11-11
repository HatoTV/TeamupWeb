import type { Config } from '../config.ts';
import { r2FromEnv } from './r2.ts';
import { FileStateStore, type StateStore } from './store.ts';

/** Cloudflare R2 when its credentials are set (GitHub Actions), otherwise the local folder. */
export function openStore(config: Config): StateStore {
  const r2 = r2FromEnv();
  if (r2) return r2;
  return new FileStateStore(config.stateDir);
}
