import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

const APP_ID = process.env.EXPO_PUBLIC_IG_APP_ID ?? '';
// URL pública de la función serverless, p. ej. https://mi-sorteos.vercel.app/api/callback
const CALLBACK_URL = process.env.EXPO_PUBLIC_AUTH_CALLBACK_URL ?? '';
const SCOPES = 'instagram_business_basic,instagram_business_manage_comments';

export const loginConfigured = Boolean(APP_ID && CALLBACK_URL);

export async function loginWithInstagram(): Promise<string> {
  if (!loginConfigured) throw new Error('Falta configurar EXPO_PUBLIC_IG_APP_ID y EXPO_PUBLIC_AUTH_CALLBACK_URL.');
  const appRedirect = Linking.createURL('auth');
  const url =
    'https://www.instagram.com/oauth/authorize' +
    `?client_id=${encodeURIComponent(APP_ID)}` +
    `&redirect_uri=${encodeURIComponent(CALLBACK_URL)}` +
    '&response_type=code' +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&state=${encodeURIComponent(appRedirect)}`;

  const result = await WebBrowser.openAuthSessionAsync(url, appRedirect);
  if (result.type !== 'success') throw new Error('Inicio de sesión cancelado.');

  const params = new URL(result.url.replace('#', '?')).searchParams;
  const error = params.get('error');
  if (error) throw new Error(params.get('error_description') ?? error);
  const token = params.get('token');
  if (!token) throw new Error('No se recibió el token.');
  return token;
}

// Los tokens de larga duración se pueden renovar sin App Secret (deben tener 24h+ y no estar vencidos).
export async function refreshToken(token: string): Promise<string> {
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
  );
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message ?? 'No se pudo renovar el token.');
  return json.access_token;
}
