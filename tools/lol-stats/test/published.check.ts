// Checks every published build file (public/data/lol/builds/**): valid schema and no item shown twice in a build
// (core, items 4-6 and their alternatives). Run after `publish` (npm run test:published), not with the unit tests:
// the unit tests run before the data is regenerated.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'node:test';
import { REPO_DIR } from '../src/config.ts';
import { championBuildSchema, shownItems } from '../src/schema.ts';

const ROOT = process.env.LOL_STATS_OUTPUT_DIR ?? join(REPO_DIR, 'public/data/lol/builds');

function* buildFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* buildFiles(path);
    else if (/_(top|jungle|mid|adc|support)\.json$/.test(entry.name)) yield path;
  }
}

it('published build files: valid schema, no duplicate item in a build', () => {
  assert.ok(existsSync(ROOT), `${ROOT} not found`);
  let files = 0;
  const duplicates: string[] = [];
  for (const path of buildFiles(ROOT)) {
    files++;
    const file = championBuildSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
    for (const build of file.builds) {
      const shown = shownItems(build);
      if (new Set(shown).size !== shown.length) duplicates.push(`${path.slice(ROOT.length + 1)} ${build.label}: ${shown.join(',')}`);
    }
  }
  assert.ok(files > 0, 'no build file');
  assert.deepEqual(duplicates, [], `${duplicates.length} build(s) with a duplicate item`);
});
