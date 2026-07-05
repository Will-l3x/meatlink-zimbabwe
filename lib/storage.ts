export function readStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[storage] Could not parse ${key}:`, error);
    window.localStorage.removeItem(key);
    return fallback;
  }
}

export function writeStoredJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeStoredItem(key: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
}
