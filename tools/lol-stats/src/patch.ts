/** `16.22.1` → `16.22` (Data Dragon version or `info.gameVersion` such as `16.22.715.1234`). */
export function patchOf(version: string): string {
  const [major, minor] = version.split('.');
  if (!major || !minor || !/^\d+$/.test(major) || !/^\d+$/.test(minor)) throw new Error(`Invalid version: ${version}`);
  return `${Number(major)}.${Number(minor)}`;
}

/** A game belongs to the patch when its `info.gameVersion` starts with `major.minor`. */
export function isGameInPatch(gameVersion: string, patch: string): boolean {
  try {
    return patchOf(gameVersion) === patch;
  } catch {
    return false;
  }
}

/** Current patch = `major.minor` of the first entry of Data Dragon `versions.json`. */
export function currentPatch(versions: readonly string[]): { patch: string; version: string } {
  const version = versions[0];
  if (!version) throw new Error('Empty versions.json');
  return { patch: patchOf(version), version };
}

/** Patch before `patch` among Data Dragon versions (newest first), or null. */
export function previousPatch(versions: readonly string[], patch: string): string | null {
  for (const v of versions) {
    try {
      const p = patchOf(v);
      if (p !== patch) return p;
    } catch {
      // ignore non-standard entries such as lolpatch_*
    }
  }
  return null;
}
