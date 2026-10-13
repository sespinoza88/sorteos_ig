import { extractShortcode, fetchPublicComments, shortcodeToMediaId } from './scrape';

describe('shortcodeToMediaId', () => {
  test('converts shortcodes to their numeric media id', () => {
    expect(shortcodeToMediaId('B')).toBe('1');
    expect(shortcodeToMediaId('BWta_jhFxZw')).toBe('1562023362439878256');
  });

  test('throws on invalid characters', () => {
    expect(() => shortcodeToMediaId('abc!def')).toThrow();
  });
});

describe('extractShortcode', () => {
  test('supports /p/, /reel/, /reels/ and /tv/ links', () => {
    expect(extractShortcode('https://www.instagram.com/reels/DeXwegvyN3A/')).toBe('DeXwegvyN3A');
    expect(extractShortcode('https://www.instagram.com/reel/DeXwegvyN3A/')).toBe('DeXwegvyN3A');
    expect(extractShortcode('https://www.instagram.com/p/DeXwegvyN3A/')).toBe('DeXwegvyN3A');
    expect(extractShortcode('https://www.instagram.com/someuser/tv/DeXwegvyN3A/')).toBe('DeXwegvyN3A');
    expect(extractShortcode('https://example.com/not-instagram')).toBeNull();
  });
});

describe('fetchPublicComments', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function mockJsonResponse(ok: boolean, status: number, json: unknown) {
    return { ok, status, json: async () => json } as Response;
  }

  test('collects comments across pages until has_more_comments is false', async () => {
    const page1 = {
      comments: [
        { pk: '1', text: 'hola @amigo', user: { username: 'ana' }, created_at: 1700000000 },
        { pk: '2', text: 'participo', user: { username: 'bob' }, created_at: 1700000001 },
      ],
      has_more_comments: true,
      next_min_id: 'cursor-2',
    };
    const page2 = {
      comments: [{ pk: '3', text: 'yo también', user: { username: 'caro' }, created_at: 1700000002 }],
      has_more_comments: false,
    };
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(true, 200, page1))
      .mockResolvedValueOnce(mockJsonResponse(true, 200, page2));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchPublicComments('https://www.instagram.com/reels/DeXwegvyN3A/');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.incomplete).toBe(false);
    expect(result.comments.map((c) => c.id)).toEqual(['1', '2', '3']);
    expect(result.comments[0]).toMatchObject({ username: 'ana', text: 'hola @amigo' });
  });

  test('marks incomplete and stops when Instagram requires login', async () => {
    const page1 = {
      comments: [{ pk: '1', text: 'hola', user: { username: 'ana' }, created_at: 1700000000 }],
      has_more_comments: true,
      next_min_id: 'cursor-2',
    };
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(true, 200, page1))
      .mockResolvedValueOnce(mockJsonResponse(false, 401, { message: 'login_required' }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchPublicComments('https://www.instagram.com/p/DeXwegvyN3A/');

    expect(result.incomplete).toBe(true);
    expect(result.comments).toHaveLength(1);
  });

  test('throws if the very first page fails', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(mockJsonResponse(false, 401, { message: 'login_required' }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchPublicComments('https://www.instagram.com/p/DeXwegvyN3A/')).rejects.toThrow();
  });

  test('throws for a non-Instagram link', async () => {
    await expect(fetchPublicComments('https://example.com/foo')).rejects.toThrow('no parece ser un post o reel');
  });
});
