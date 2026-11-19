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

/** Fired on window whenever the cart changes, so the header count stays in sync. */
export const CART_CHANGED_EVENT = 'hexad:cart-changed';

function notify(key: string) {
  if (key === 'hexad_cart') window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}

export function writeStoredJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
  notify(key);
}

export function removeStoredItem(key: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
  notify(key);
}
