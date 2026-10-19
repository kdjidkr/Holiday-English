declare const process: { env: { EXPO_PUBLIC_API_BASE_URL?: string } };
declare const __DEV__: boolean;
import { apiFetch } from './apiClient';

/** Build API URLs without placing provider credentials in the app bundle. */
export function apiUrl(path: string): string {
  const configured = (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (configured) return `${configured}${path}`;
  if (typeof __DEV__ !== 'undefined' && __DEV__ && typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:3000${path}`;
  }
  return path;
}

export async function geminiLiveSocketUrl(model: string): Promise<string> {
  const url = new URL(apiUrl('/api/gemini/live'), typeof window === 'undefined' ? 'http://localhost' : window.location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('model', model.replace(/^models\//, ''));
  const ticketResponse = await apiFetch(apiUrl('/api/auth/ws-ticket'), { method: 'POST' });
  if (!ticketResponse.ok) throw new Error('실시간 연결 권한을 확인하지 못했습니다. 다시 로그인해 주세요.');
  const { ticket } = await ticketResponse.json();
  url.searchParams.set('ticket', ticket);
  return url.toString();
}
