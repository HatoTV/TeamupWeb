import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { agreementIssues, parseGenders } from '../src/agreement.ts';

const genders = parseGenders(readFileSync(new URL('../../i18n-matchups/glossaire-lol-fr.md', import.meta.url), 'utf8'));

test('the glossary gives the gender of the common terms', () => {
  assert.equal(genders.get('ult'), 'm');
  assert.equal(genders.get('hook'), 'm');
  assert.equal(genders.get('CD'), 'm');
  assert.equal(genders.get('lvl'), 'm');
  assert.equal(genders.get('wave'), 'f');
});

test('flags wrong agreements', () => {
  for (const text of [
    "Dès le lvl 6, respecte son ult (R) : elle projette tout ce qu'elle traverse.",
    'Garde ta ult pour la fin.',
    'Ton ult (R) chargée fait mal.',
    'Pousse un wave.',
    'Sa tornade (A) lancé trop tôt te met en danger.',
  ]) {
    assert.ok(agreementIssues(text, genders).length > 0, text);
  }
});

test('accepts correct sentences and object pronouns', () => {
  for (const text of [
    "Dès le lvl 6, respecte son ult (R) : il projette tout ce qu'il traverse.",
    "Ne trade que quand son hook (A) est en CD : tant qu'il l'a, Blitz te punit.",
    'Ta wave doit crash avant ton back.',
    'Quand tu la dive, recule vite.',
    'Le CD de son E est long.',
  ]) {
    assert.deepEqual(agreementIssues(text, genders), [], text);
  }
});
