declare const process: { env: { EXPO_PUBLIC_API_BASE_URL?: string } };
declare const __DEV__: boolean;

/** Build API URLs without placing provider credentials in the app bundle. */
export function apiUrl(path: string): string {
  const configured = (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (configured) return `${configured}${path}`;
  if (typeof __DEV__ !== 'undefined' && __DEV__ && typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:3000${path}`;
  }
  return path;
}

export function geminiLiveSocketUrl(model: string): string {
  const url = new URL(apiUrl('/api/gemini/live'), typeof window === 'undefined' ? 'http://localhost' : window.location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('model', model.replace(/^models\//, ''));
  return url.toString();
}
