/**
 * Where to send someone after they log in or sign up, taken from `?next=`.
 * Only same-site paths are allowed so the parameter can't be used to bounce
 * people to another website.
 */
export function readNextPath(): string | null {
    if (typeof window === 'undefined') return null;
    const raw = new URLSearchParams(window.location.search).get('next');
    if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;
    return raw;
}

export function withNext(path: string, next: string | null): string {
    return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}
