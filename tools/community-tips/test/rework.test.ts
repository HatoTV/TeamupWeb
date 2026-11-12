import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ChampionAbilities } from '../src/ddragon.ts';
import { reworkReasons } from '../src/rework.ts';

const kit = (q: string, qDesc: string, cd = '10/9/8/7/6'): ChampionAbilities => ({
  id: 'Test',
  passive: { name: 'Passive', description: 'Gains 5% bonus movement speed after casting a spell.' },
  spells: [
    { name: q, description: qDesc, cooldownBurn: cd },
    { name: 'Wind', description: 'Creates a wall that blocks enemy projectiles for 4 seconds.', cooldownBurn: '26' },
    { name: 'Dash', description: 'Dashes through target enemy, dealing magic damage.', cooldownBurn: '0.5' },
    { name: 'Ult', description: 'Blinks to an airborne enemy champion and knocks them up.', cooldownBurn: '80' },
  ],
});

test('numbers only: balance change, not a rework', () => {
  const before = kit('Strike', 'Thrusts forward, dealing 20 physical damage. On hit, grants a stack.');
  const after = kit('Strike', 'Thrusts forward, dealing 35 physical damage. On hit, grants a stack.', '8/7/6/5/4');
  assert.deepEqual(reworkReasons(before, after), []);
});

test('renamed spell or rewritten description: rework', () => {
  const before = kit('Strike', 'Thrusts forward, dealing physical damage. On hit, grants a stack.');
  assert.equal(reworkReasons(before, kit('Gale', 'Thrusts forward, dealing physical damage. On hit, grants a stack.')).length, 1);
  assert.equal(reworkReasons(before, kit('Strike', 'Summons a storm that pulls enemies toward its center and roots them.')).length, 1);
});
