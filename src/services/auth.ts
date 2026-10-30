import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { errorContext, logger } from '../lib/logger';

const APP_ID = process.env.EXPO_PUBLIC_IG_APP_ID ?? '';
// URL pública de la función serverless, p. ej. https://mi-sorteos.vercel.app/api/callback
const CALLBACK_URL = process.env.EXPO_PUBLIC_AUTH_CALLBACK_URL ?? '';
const SCOPES = 'instagram_business_basic,instagram_business_manage_comments';
const WEB_AUTH_PENDING_KEY = 'ig_auth_pending';

export const loginConfigured = Boolean(APP_ID && CALLBACK_URL);

export type WebAuthCallback = { token: string } | { error: string } | { warning: string };

export function consumeWebAuthCallback(): WebAuthCallback | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const callbackUrl = new URL(window.location.href);
  const params = callbackUrl.searchParams;
  if (callbackUrl.hash) {
    new URLSearchParams(callbackUrl.hash.slice(1)).forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
  }

  const token = params.get('token');
  const error = params.get('error');
  if (!token && !error) {
    let pending = false;
    try {
      pending = window.sessionStorage.getItem(WEB_AUTH_PENDING_KEY) === '1';
      if (pending) window.sessionStorage.removeItem(WEB_AUTH_PENDING_KEY);
    } catch (storageError) {
      logger.warn('auth.web_pending_status_unavailable', errorContext(storageError));
    }
    if (!pending) return null;
    logger.warn('auth.web_returned_without_callback', { callbackPath: callbackUrl.pathname });
    return {
      warning:
        'Instagram terminó el inicio de sesión, pero no devolvió la autorización a Sorteos. No se concedieron permisos todavía. Vuelve a pulsar “Iniciar sesión con Instagram” para continuar; si Instagram pide verificar la cuenta, completa el desafío y espera a que vuelva a Sorteos.',
    };
  }

  window.history.replaceState({}, document.title, callbackUrl.pathname);
  try {
    window.sessionStorage.removeItem(WEB_AUTH_PENDING_KEY);
  } catch (storageError) {
    logger.warn('auth.web_pending_status_clear_failed', errorContext(storageError));
  }
  logger.info('auth.web_callback_received', {
    hasToken: Boolean(token),
    errorCode: error,
    callbackPath: callbackUrl.pathname,
  });
  if (error) {
    const description = params.get('error_description');
    return { error: description ? `${description} (${error})` : error };
  }
  if (!token) return { error: 'Instagram no devolvió un token de acceso.' };
  return { token };
}

export async function loginWithInstagram(): Promise<string | null> {
  const startedAt = Date.now();
  logger.info('auth.login_started', {
    configured: loginConfigured,
    appIdConfigured: Boolean(APP_ID),
    callbackConfigured: Boolean(CALLBACK_URL),
  });
  try {
    if (!loginConfigured) throw new Error('Falta configurar EXPO_PUBLIC_IG_APP_ID y EXPO_PUBLIC_AUTH_CALLBACK_URL.');
    const appRedirect = Linking.createURL('auth');
    const url =
      'https://www.instagram.com/oauth/authorize' +
      `?client_id=${encodeURIComponent(APP_ID)}` +
      `&redirect_uri=${encodeURIComponent(CALLBACK_URL)}` +
      '&response_type=code' +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&state=${encodeURIComponent(appRedirect)}`;

    logger.info('auth.browser_open_requested', {
      provider: 'instagram',
      callbackHost: new URL(CALLBACK_URL).host,
      redirectScheme: new URL(appRedirect).protocol,
    });
    if (Platform.OS === 'web') {
      logger.info('auth.same_tab_redirect_started');
      try {
        window.sessionStorage.setItem(WEB_AUTH_PENDING_KEY, '1');
      } catch (storageError) {
        logger.warn('auth.web_pending_status_save_failed', errorContext(storageError));
      }
      window.location.assign(url);
      return null;
    }

    const result = await WebBrowser.openAuthSessionAsync(url, appRedirect);
    logger.info('auth.browser_result', { resultType: result.type });
    if (result.type !== 'success') throw new Error(`Inicio de sesión interrumpido (${result.type}).`);

    const callbackUrl = new URL(result.url);
    const params = callbackUrl.searchParams;
    if (callbackUrl.hash) {
      new URLSearchParams(callbackUrl.hash.slice(1)).forEach((value, key) => {
        if (!params.has(key)) params.set(key, value);
      });
    }
    const error = params.get('error');
    if (error) {
      const description = params.get('error_description');
      logger.warn('auth.provider_rejected', { errorCode: error, errorDescription: description });
      throw new Error(description ? `${description} (${error})` : error);
    }
    const token = params.get('token');
    if (!token) throw new Error('Instagram no devolvió un token de acceso. Revisa que la autorización se haya completado.');
    logger.info('auth.login_succeeded', { durationMs: Date.now() - startedAt });
    return token;
  } catch (error) {
    logger.error('auth.login_failed', { durationMs: Date.now() - startedAt, ...errorContext(error) });
    throw error;
  }
}

// Los tokens de larga duración se pueden renovar sin App Secret (deben tener 24h+ y no estar vencidos).
export async function refreshToken(token: string): Promise<string> {
  const startedAt = Date.now();
  logger.info('auth.token_refresh_started');
  try {
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
    );
    const json = await res.json();
    logger.info('auth.token_refresh_response', { status: res.status, ok: res.ok, durationMs: Date.now() - startedAt });
    if (!res.ok || json.error) throw new Error(json.error?.message ?? 'No se pudo renovar el token.');
    logger.info('auth.token_refresh_succeeded');
    return json.access_token;
  } catch (error) {
    logger.error('auth.token_refresh_failed', { durationMs: Date.now() - startedAt, ...errorContext(error) });
    throw error;
  }
}
