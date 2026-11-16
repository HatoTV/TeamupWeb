// Checks every published build file (public/data/lol/builds/**) and tier list (public/data/lol/tierlist/**): valid schema,
// no repeated item in a build's main line (core, items 4-6) nor within a slot (core, slot item, alternatives), each
// champion once per role in a tier list. Run after `publish` (npm run test:published), not with the unit tests:
// the unit tests run before the data is regenerated.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'node:test';
import { REPO_DIR } from '../src/config.ts';
import { championBuildSchema, repeatedItems, tierListSchema } from '../src/schema.ts';

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
      const repeated = repeatedItems(build);
      if (repeated.length) duplicates.push(`${path.slice(ROOT.length + 1)} ${build.label}: ${repeated.join(',')}`);
    }
  }
  assert.ok(files > 0, 'no build file');
  assert.deepEqual(duplicates, [], `${duplicates.length} build(s) with a duplicate item`);
});

const TIERLIST_ROOT = process.env.LOL_STATS_TIERLIST_DIR ?? join(REPO_DIR, 'public/data/lol/tierlist');

it('published tier lists: valid schema, each champion once per role (ranked or not)', () => {
  assert.ok(existsSync(TIERLIST_ROOT), `${TIERLIST_ROOT} not found`);
  let files = 0;
  for (const patch of readdirSync(TIERLIST_ROOT)) {
    for (const name of readdirSync(join(TIERLIST_ROOT, patch))) {
      files++;
      const file = tierListSchema.parse(JSON.parse(readFileSync(join(TIERLIST_ROOT, patch, name), 'utf8')));
      assert.equal(`${file.band}.json`, name);
      const keys = [...file.champions, ...file.unranked].map((c) => `${c.role}|${c.championId}`);
      assert.equal(new Set(keys).size, keys.length, `${patch}/${name}: a champion appears twice in a role`);
      assert.ok(file.champions.every((c) => c.games >= file.minGames) && file.unranked.every((c) => c.games < file.minGames));
    }
  }
  assert.ok(files > 0, 'no tier list file');
});
