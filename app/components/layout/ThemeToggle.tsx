import { useCallback } from 'react';

/**
 * Triple light/dark toggle (header). Flips the `html.dark` class, persists the
 * choice under `triple-theme-mode` (the same key the before-paint boot script in
 * `lib/themeVars.ts` reads) and dispatches `theme-mode::changed`. Port of
 * `triple_twig/src/views/pages/partials/triple/theme-toggle.twig` +
 * `js/partials/theme-mode.js`. Shown only when `dark_mode_switcher` is on.
 */

const STORAGE_KEY = 'triple-theme-mode';

export function ThemeToggle({
  toggleClass = '',
  maskId = 'moon-mask',
}: {
  toggleClass?: string;
  maskId?: string;
}) {
  const onToggle = useCallback(() => {
    const root = document.documentElement;
    const next = root.classList.contains('dark') ? 'light' : 'dark';
    root.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage can be unavailable (private mode / blocked cookies) */
    }
    document.dispatchEvent(new CustomEvent('theme-mode::changed', { detail: { mode: next } }));
  }, []);

  return (
    <button
      type="button"
      className={`theme-toggle ${toggleClass}`.trim()}
      title="Toggles light & dark"
      aria-label="auto"
      aria-live="polite"
      onClick={onToggle}
    >
      <svg className="sun-and-moon" aria-hidden="true" width="24" height="24" viewBox="0 0 24 24">
        <mask className="moon" id={maskId}>
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <circle cx="24" cy="10" r="6" fill="black" />
        </mask>
        <circle className="sun" cx="12" cy="12" r="6" mask={`url(#${maskId})`} fill="currentColor" />
        <g className="sun-beams" stroke="currentColor">
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </g>
      </svg>
    </button>
  );
}
