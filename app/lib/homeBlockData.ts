/**
 * Helpers for reading merchant data on home blocks.
 *
 * Collection items arrive with their fields keyed by the FULL id, i.e. prefixed with the
 * collection's own id: a `stats` collection with a `number` field yields items shaped
 * `{ "stats.number": "…" }` (confirmed from twilight.json saved values + the live editor).
 * `collectionField` reads either the prefixed or the bare key so a component doesn't care.
 *
 * Multilang text fields arrive either as a plain string or as a `{ ar, en }` object;
 * `pickLang` resolves the current locale (falling back to the first value).
 */

export type MultiLang = string | Record<string, string> | null | undefined;

export function pickLang(value: MultiLang, lang: string): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value[lang] ?? Object.values(value)[0] ?? '';
  }
  return String(value);
}

export function collectionField(
  item: Record<string, unknown>,
  group: string,
  key: string
): unknown {
  return item[key] ?? item[`${group}.${key}`];
}

/**
 * A dropdown (`items`) value arrives as a string or as `[{ value }]`; resolve it to one of the
 * allowed options, falling back to `fallback` for anything unexpected.
 */
export function resolveOption<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  const first = Array.isArray(raw) ? raw[0] : raw;
  const value = typeof first === 'string' ? first : (first as { value?: string } | undefined)?.value;
  return (allowed as readonly string[]).includes(value ?? '') ? (value as T) : fallback;
}

/**
 * Normalize a merchant-entered end date to `YYYY-MM-DD HH:mm:ss` for `<salla-count-down>`.
 * Handles the editor's `YYYY-MM-DDTHH:mm`, `MM-DD-YYYY,HH:mm` and `YYYY-MM-DD HH:mm` shapes.
 */
export function normalizeEndDate(raw?: string): string {
  let s = (raw || '').trim().replace(/T/g, ' ').replace(/,/g, ' ');
  if (s[2] === '-' && s[5] === '-') {
    s = s.slice(6, 10) + '-' + s.slice(0, 2) + '-' + s.slice(3, 5) + s.slice(10);
  }
  s = s.slice(0, 19);
  if (!s) return '';
  return s.length === 16 ? `${s}:00` : s;
}

/** A URL/link field (plain string, or a variable-list `[{ value }]`) → a plain string. */
export function asUrl(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length) {
    const first = value[0] as { value?: string } | string;
    return typeof first === 'string' ? first : first?.value ?? '';
  }
  return '';
}
