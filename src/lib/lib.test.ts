import { applyFilters, defaultFilters, getMentions } from './filters';
import { pickWinners } from './draw';

const c = (id: string, username: string, text: string) => ({ id, username, text });

test('mentions parsed and deduped', () => {
  expect(getMentions('hi @A @a @b.c.')).toEqual(['a', 'b.c']);
});

test('filters', () => {
  const list = [c('1', 'ana', '@x @y'), c('2', 'ana', '@x'), c('3', 'bob', 'hola'), c('4', 'eva', '@eva @z')];
  const f = { ...defaultFilters };
  expect(applyFilters([c('untagged', 'bob', 'hola')], f).map((x) => x.id)).toEqual(['untagged']);
  expect(applyFilters(list, f).map((x) => x.id)).toEqual(['1', '3', '4']);
  expect(applyFilters(list, { ...f, minMentions: 1 }).map((x) => x.id)).toEqual(['1', '4']);
  expect(applyFilters(list, { ...f, minMentions: 2 }).map((x) => x.id)).toEqual(['1']);
  expect(applyFilters(list, { ...f, uniqueUsers: false, minMentions: 1 }).map((x) => x.id)).toEqual(['1', '2', '4']);
});

test('pickWinners unique, capped at 3', () => {
  const pool = ['a', 'b', 'c', 'd', 'a'].map((u, i) => c(String(i), u, ''));
  const w = pickWinners(pool, 5);
  expect(w).toHaveLength(3);
  expect(new Set(w.map((x) => x.username)).size).toBe(3);
  expect(pickWinners(pool.slice(0, 2), 3)).toHaveLength(2);
});
