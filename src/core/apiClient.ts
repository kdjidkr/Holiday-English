import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'holiday-english-session';
let cachedToken: string | null | undefined;
const expirationListeners = new Set<() => void>();

export async function readSessionToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  try {
    cachedToken = Platform.OS === 'web'
      ? (typeof localStorage === 'undefined' ? null : localStorage.getItem(TOKEN_KEY))
      : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch { cachedToken = null; }
  return cachedToken;
}

export async function saveSessionToken(token: string | null): Promise<void> {
  cachedToken = token;
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);
    } else if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch { /* An unavailable secure store will be handled as a fresh login next launch. */ }
}

export function onSessionExpired(listener: () => void): () => void {
  expirationListeners.add(listener);
  return () => expirationListeners.delete(listener);
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = await readSessionToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && token) {
    await saveSessionToken(null);
    expirationListeners.forEach(listener => listener());
  }
  return response;
}
