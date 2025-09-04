export function ensureHttps(url?: string | null) {
    if (!url) return "";
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
export function isProbablyUrl(raw?: string | null) {
    if (!raw) return false;
    const s = String(raw).trim();
    if (!/^https?:\/\//i.test(s) && /\s/.test(s)) return false;
    if (/\.[a-z]{2,}($|[\/?#])/i.test(s)) return true;
    return /^https?:\/\//i.test(s);
}

export function normalizeUrlOrNull(raw?: string | null) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!isProbablyUrl(s)) return null;
    return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export function toExternalUrlOrNull(raw?: string | null) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!isProbablyUrl(s)) return null;
    return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}
export function safeHostname(raw?: string | null) {
    const u = toExternalUrlOrNull(raw);
    if (!u) return (raw ?? "").toString();
    try { return new URL(u).hostname; } catch { return (raw ?? "").toString(); }
}
export function googleSearchUrl(parts: (string | null | undefined)[]) {
    const q = parts.filter(Boolean).join(" ");
    return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}
