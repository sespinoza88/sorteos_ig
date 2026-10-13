export function pickWinners<T extends { username: string }>(
  pool: T[],
  count: number,
  rand: () => number = Math.random,
): T[] {
  const byUser = new Map<string, T>();
  for (const p of pool) if (!byUser.has(p.username.toLowerCase())) byUser.set(p.username.toLowerCase(), p);
  const arr = [...byUser.values()];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.max(0, Math.min(count, 3, arr.length)));
}
