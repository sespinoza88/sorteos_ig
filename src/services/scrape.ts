import type { Comment } from '../lib/filters';

// Endpoint no documentado de Instagram. Puede cambiar o bloquear pedidos sin aviso,
// ya que no es una API oficial: no requiere login, pero Instagram suele cortar la
// paginación (pidiendo iniciar sesión) luego de las primeras páginas de comentarios.
const COMMENTS_URL = (mediaId: string) => `https://www.instagram.com/api/v1/media/${mediaId}/comments/`;
// Id público y estable de la app web de Instagram, usado por el propio sitio.
const IG_APP_ID = '936619743392459';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const SHORTCODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const MAX_PAGES = 20;

// Instagram codifica el id numérico de cada publicación en "base64-like" para
// armar el shortcode del link. Esta es la conversión inversa, pura y sin red.
export function shortcodeToMediaId(shortcode: string): string {
  let id = 0n;
  for (const char of shortcode) {
    const value = SHORTCODE_ALPHABET.indexOf(char);
    if (value === -1) throw new Error('El shortcode del link contiene caracteres inválidos.');
    id = id * 64n + BigInt(value);
  }
  return id.toString();
}

export function extractShortcode(link: string): string | null {
  const m = link.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : null;
}

type RawComment = {
  pk?: string | number;
  id?: string | number;
  text?: string;
  created_at?: number;
  user?: { username?: string };
};

type CommentsResponse = {
  comments?: RawComment[];
  has_more_comments?: boolean;
  next_min_id?: string;
  message?: string;
  status?: string;
};

export type ScrapeResult = { comments: Comment[]; incomplete: boolean };

function isLoginRequired(status: number, json: CommentsResponse | null): boolean {
  if (status === 401 || status === 429) return true;
  const msg = (json?.message ?? '').toLowerCase();
  if (msg.includes('login')) return true;
  return json?.status === 'fail' && msg.length > 0;
}

// Trae los comentarios públicos de un post/reel sin login ni token, a partir del
// link. Pagina mientras Instagram lo permita; si se corta por rate limit o por
// pedido de login, devuelve `incomplete: true` con lo ya recolectado.
export async function fetchPublicComments(link: string): Promise<ScrapeResult> {
  const shortcode = extractShortcode(link);
  if (!shortcode) throw new Error('El link no parece ser un post o reel de Instagram.');
  const mediaId = shortcodeToMediaId(shortcode);

  const comments: Comment[] = [];
  let minId: string | undefined;
  let incomplete = false;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(COMMENTS_URL(mediaId));
    url.searchParams.set('can_support_threading', 'true');
    url.searchParams.set('permalink_enabled', 'false');
    if (minId) url.searchParams.set('min_id', minId);

    const res = await fetch(url.toString(), {
      headers: { 'X-IG-App-ID': IG_APP_ID, 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });

    let json: CommentsResponse | null = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (!res.ok || json === null || isLoginRequired(res.status, json)) {
      if (comments.length === 0 && page === 0) {
        throw new Error('Instagram no permitió obtener los comentarios (puede requerir iniciar sesión o estar bloqueando pedidos anónimos).');
      }
      incomplete = true;
      break;
    }

    for (const c of json?.comments ?? []) {
      const id = c.pk ?? c.id;
      if (id != null && c.user?.username && c.text) {
        comments.push({
          id: String(id),
          username: c.user.username,
          text: c.text,
          timestamp: c.created_at ? new Date(c.created_at * 1000).toISOString() : undefined,
        });
      }
    }

    if (!json?.has_more_comments || !json?.next_min_id) break;
    minId = json.next_min_id;
    if (page === MAX_PAGES - 1) incomplete = true;
  }

  // Instagram suele responder 200 con lista vacía a pedidos anónimos en vez de dar error.
  if (comments.length === 0) {
    throw new Error(
      'Instagram devolvió 0 comentarios para este post. Probablemente bloqueó el acceso anónimo (muy común en reels). Iniciá sesión con Instagram y elegí el post de tu cuenta para obtenerlos.',
    );
  }

  return { comments, incomplete };
}
