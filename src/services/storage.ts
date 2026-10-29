import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { errorContext, logger } from '../lib/logger';

const TOKEN_KEY = 'ig_token';

export async function saveToken(token: string): Promise<void> {
  logger.info('storage.save_token_started', { platform: Platform.OS });
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.localStorage) {
      const error = new Error('El almacenamiento local del navegador no está disponible.');
      logger.error('storage.save_token_failed', errorContext(error));
      throw error;
    }
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      logger.error('storage.save_token_failed', errorContext(error));
      throw error;
    }
    logger.info('storage.save_token_succeeded', { platform: Platform.OS });
    return;
  }
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    logger.info('storage.save_token_succeeded', { platform: Platform.OS });
  } catch (error) {
    logger.error('storage.save_token_failed', errorContext(error));
    throw error;
  }
}

export async function getToken(): Promise<string | null> {
  logger.info('storage.get_token_started', { platform: Platform.OS });
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.localStorage) {
      logger.info('storage.get_token_succeeded', { found: false, reason: 'storage_unavailable' });
      return null;
    }
    try {
      const token = window.localStorage.getItem(TOKEN_KEY);
      logger.info('storage.get_token_succeeded', { found: Boolean(token) });
      return token;
    } catch (error) {
      logger.error('storage.get_token_failed', errorContext(error));
      throw error;
    }
  }
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    logger.info('storage.get_token_succeeded', { found: Boolean(token) });
    return token;
  } catch (error) {
    logger.error('storage.get_token_failed', errorContext(error));
    throw error;
  }
}

export async function removeToken(): Promise<void> {
  logger.info('storage.remove_token_started', { platform: Platform.OS });
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.localStorage) {
      const error = new Error('El almacenamiento local del navegador no está disponible.');
      logger.error('storage.remove_token_failed', errorContext(error));
      throw error;
    }
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      logger.error('storage.remove_token_failed', errorContext(error));
      throw error;
    }
    logger.info('storage.remove_token_succeeded', { platform: Platform.OS });
    return;
  }
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    logger.info('storage.remove_token_succeeded', { platform: Platform.OS });
  } catch (error) {
    logger.error('storage.remove_token_failed', errorContext(error));
    throw error;
  }
}
