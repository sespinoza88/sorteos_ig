import type { Comment } from '../lib/filters';
import { errorContext, logger } from '../lib/logger';

const GRAPH = 'https://graph.instagram.com/v21.0';

export function extractShortcode(link: string): string | null {
  const m = link.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : null;
}

async function getJson(url: string): Promise<any> {
  const startedAt = Date.now();
  logger.info('instagram.request_started', { url });
  let responseStatus: number | undefined;
  try {
    const res = await fetch(url);
    responseStatus = res.status;
    const json = await res.json();
    logger.info('instagram.response_received', {
      url,
      status: res.status,
      ok: res.ok,
      hasApiError: Boolean(json.error),
      durationMs: Date.now() - startedAt,
    });
    if (!res.ok || json.error) {
      throw new Error(json.error?.message ?? `Error HTTP ${res.status}`);
    }
    return json;
  } catch (error) {
    logger.error('instagram.request_failed', {
      url,
      status: responseStatus,
      durationMs: Date.now() - startedAt,
      ...errorContext(error),
    });
    throw error;
  }
}

// Busca el post en las publicaciones de la cuenta autenticada comparando el shortcode del permalink.
export async function resolveMediaId(link: string, token: string): Promise<string> {
  const code = extractShortcode(link);
  if (!code) {
    logger.warn('instagram.media_resolution_rejected', { reason: 'invalid_instagram_link' });
    throw new Error('El link no parece ser un post o reel de Instagram.');
  }
  logger.info('instagram.media_resolution_started');
  let url: string | null =
    `${GRAPH}/me/media?fields=id,permalink,shortcode&limit=100&access_token=${encodeURIComponent(token)}`;
  let checkedCount = 0;
  while (url) {
    const page: any = await getJson(url);
    const data = page.data ?? [];
    checkedCount += data.length;
    logger.info('instagram.media_page_inspected', {
      pageItemCount: data.length,
      totalItemsChecked: checkedCount,
      hasNextPage: Boolean(page.paging?.next),
    });
    const hit = data.find((m: any) => {
      const itemCode = m.shortcode || extractShortcode(m.permalink ?? '');
      return itemCode === code;
    });
    if (hit) {
      logger.info('instagram.media_resolution_succeeded', { totalItemsChecked: checkedCount });
      return hit.id;
    }
    url = page.paging?.next ?? null;
  }
  throw new Error(
    `El post o reel ingresado no pertenece a la cuenta con la que iniciaste sesión (revisadas ${checkedCount} publicaciones). Para realizar sorteos con tu sesión de Instagram, debes seleccionar un post publicado por tu propia cuenta.`,
  );
}

export async function fetchComments(mediaId: string, token: string): Promise<Comment[]> {
  const startedAt = Date.now();
  logger.info('instagram.comments_fetch_started');
  const out: Comment[] = [];
  let url: string | null =
    `${GRAPH}/${mediaId}/comments?fields=id,text,username,timestamp&limit=100&access_token=${encodeURIComponent(token)}`;
  while (url) {
    const page: any = await getJson(url);
    const pageData = page.data ?? [];
    for (const c of page.data ?? []) {
      if (c.username && c.text) out.push({ id: c.id, username: c.username, text: c.text, timestamp: c.timestamp });
    }
    logger.info('instagram.comments_page_processed', {
      pageCommentCount: pageData.length,
      validTotal: out.length,
      hasNextPage: Boolean(page.paging?.next),
    });
    url = page.paging?.next ?? null;
  }
  logger.info('instagram.comments_fetch_succeeded', { commentCount: out.length, durationMs: Date.now() - startedAt });
  return out;
}

export type MediaItem = {
  id: string;
  caption?: string;
  mediaType?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  timestamp?: string;
};

export async function fetchUserMedia(token: string, limit: number = 12): Promise<MediaItem[]> {
  logger.info('instagram.user_media_fetch_started', { limit });
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  const url = `${GRAPH}/me/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}`;
  const json = await getJson(url);
  const items = (json.data ?? []).map((m: any) => ({
    id: m.id,
    caption: m.caption,
    mediaType: m.media_type,
    mediaUrl: m.media_url,
    thumbnailUrl: m.thumbnail_url || m.media_url,
    permalink: m.permalink,
    timestamp: m.timestamp,
  }));
  logger.info('instagram.user_media_fetch_succeeded', { itemCount: items.length });
  return items;
}
