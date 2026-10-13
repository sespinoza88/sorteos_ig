export type Comment = {
  id: string;
  username: string;
  text: string;
  timestamp?: string;
};

export type Filters = {
  uniqueUsers: boolean;
  minMentions: 0 | 1 | 2;
  excludeSelfMention: boolean;
};

export const defaultFilters: Filters = {
  uniqueUsers: true,
  minMentions: 0,
  excludeSelfMention: true,
};

const MENTION_RE = /@([A-Za-z0-9._]+)/g;

export function getMentions(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(MENTION_RE)) {
    found.add(m[1].toLowerCase().replace(/\.+$/, ''));
  }
  return [...found];
}

export function applyFilters(comments: Comment[], f: Filters): Comment[] {
  const seen = new Set<string>();
  const result: Comment[] = [];
  for (const c of comments) {
    const user = c.username.toLowerCase();
    let mentions = getMentions(c.text);
    if (f.excludeSelfMention) mentions = mentions.filter((m) => m !== user);
    if (mentions.length < f.minMentions) continue;
    if (f.uniqueUsers) {
      if (seen.has(user)) continue;
      seen.add(user);
    }
    result.push(c);
  }
  return result;
}
