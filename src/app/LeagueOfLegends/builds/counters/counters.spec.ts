import { CounterStat } from '../../../core/data/build-data.service';
import { CommunityTip, groupTips } from '../../matchups/community-tips/community-tips.service';
import { counterColumns, gapWidth, levelFromWinRate, mostPlayed, splitColumns } from './counters-utils';

const stat = (championId: number, winRate: number, games = 1000): CounterStat => ({ championId, games, wins: Math.round(winRate * games), winRate });

describe('counters tab', () => {
  it('splits at 50 % (exactly 50 % is an advantage), sorts both columns and drops small samples', () => {
    const { advantage, counter } = splitColumns([stat(1, 0.52), stat(2, 0.5), stat(3, 0.58), stat(4, 0.47), stat(5, 0.41), stat(6, 0.6, 19), stat(7, 0.4999)]);
    expect(advantage.map((o) => o.championId)).toEqual([3, 1, 2]);
    expect(counter.map((o) => o.championId)).toEqual([5, 4, 7]);
    const ids = [...advantage, ...counter].map((o) => o.championId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses the full list when published, else the six weakest and strongest opponents', () => {
    const full = counterColumns({ counters: { advantage: [stat(1, 0.55)], counter: [stat(2, 0.45)] }, weakAgainst: [], strongAgainst: [] });
    expect(full.advantage.map((o) => o.championId)).toEqual([1]);
    const old = counterColumns({
      weakAgainst: [{ champion: 2, games: 400, winRate: 0.44 }, { champion: 9, games: 12, winRate: 0.4 }],
      strongAgainst: [{ champion: 3, games: 500, winRate: 0.56 }],
    });
    expect(old.advantage.map((o) => o.championId)).toEqual([3]);
    expect(old.counter.map((o) => [o.championId, o.wins])).toEqual([[2, 176]]);
    expect(counterColumns(null)).toEqual({ advantage: [], counter: [] });
  });

  it('deduces the difficulty from the win rate when the matchup has no TeamUpp rating', () => {
    expect(levelFromWinRate(0.56)).toBe(1);
    expect(levelFromWinRate(0.53)).toBe(2);
    expect(levelFromWinRate(0.525)).toBe(2);
    expect(levelFromWinRate(0.5)).toBe(3);
    expect(levelFromWinRate(0.46)).toBe(4);
    expect(levelFromWinRate(0.449)).toBe(5);
  });

  it('gap bar: 8 points from 50 % fill it', () => {
    expect(gapWidth(0.5)).toBe(0);
    expect(gapWidth(0.54)).toBeCloseTo(50);
    expect(gapWidth(0.42)).toBe(100);
    expect(gapWidth(0.3)).toBe(100);
  });

  it('most faced opponents: five, most games first', () => {
    const rows = [1, 2, 3, 4, 5, 6].map((i) => ({ id: i, games: i * 10 }));
    expect(mostPlayed(rows).map((r) => r.id)).toEqual([6, 5, 4, 3, 2]);
  });
});

describe('community tips by section', () => {
  const tip = (text: string, section?: CommunityTip['section']): CommunityTip => ({ text, sources: 2, verifiedByGameData: false, category: 'lane', section });

  it('general, laning phase then avoid; pair tips before the « how to play against » ones; empty groups dropped', () => {
    const groups = groupTips([tip('p-lane', 'lane'), tip('p-gen')], [tip('v-avoid', 'avoid'), tip('v-gen', 'general'), tip('v-lane', 'lane')]);
    expect(groups.map((g) => [g.section, g.tips.map((t) => t.text)])).toEqual([
      ['general', ['p-gen', 'v-gen']],
      ['lane', ['p-lane', 'v-lane']],
      ['avoid', ['v-avoid']],
    ]);
    expect(groupTips([tip('a', 'lane')], []).map((g) => g.section)).toEqual(['lane']);
  });
});
