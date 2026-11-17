import { pageItems } from './builds-list.component';

describe('builds list pager', () => {
  it('shows first, last and the neighbours of the current page, with gaps', () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(1, 11)).toEqual([1, 2, null, 11]);
    expect(pageItems(6, 11)).toEqual([1, null, 5, 6, 7, null, 11]);
    expect(pageItems(11, 11)).toEqual([1, null, 10, 11]);
  });

  it('fills a single missing page instead of a gap', () => {
    expect(pageItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});
