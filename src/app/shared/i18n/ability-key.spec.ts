import { AbilityKeyPipe, abilityKey } from './ability-key';

describe('abilityKey', () => {
  it('shows A Z E R in French and Q W E R in English', () => {
    expect((['Q', 'W', 'E', 'R'] as const).map((s) => abilityKey(s, 'fr'))).toEqual(['A', 'Z', 'E', 'R']);
    expect((['Q', 'W', 'E', 'R'] as const).map((s) => abilityKey(s, 'en'))).toEqual(['Q', 'W', 'E', 'R']);
  });

  it('accepts Riot skill slots 1–4', () => {
    expect(([1, 2, 3, 4] as const).map((s) => abilityKey(s, 'fr'))).toEqual(['A', 'Z', 'E', 'R']);
    expect(abilityKey(2, 'en')).toBe('W');
  });

  it('is exposed as a pipe', () => {
    expect(new AbilityKeyPipe().transform('W', 'fr')).toBe('Z');
  });
});
