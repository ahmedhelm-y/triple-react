import { useEffect, useState, type CSSProperties } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { HOME_ROUTE_ID } from '../../lib/routeIds';

/**
 * Triple loading overlay — a full-screen splash (store/merchant logo) shown on
 * first paint and faded out once the page is interactive. Port of
 * `triple_twig/src/views/pages/partials/triple/loading.twig` (its inline styles
 * and DOMContentLoaded removal). The `enable_loading` / `loading_pages` settings
 * gate where it shows; the bounce keyframe + skip button live in `triple-extras.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export function LoadingOverlay() {
  const { theme, store } = useTwilight();
  const { t } = useTranslation();
  const s = (theme?.settings ?? {}) as Record<string, any>;

  const isHome = useRouterState({
    select: (st) => st.matches.some((m) => m.routeId === HOME_ROUTE_ID),
  });

  const where = (s.loading_pages as string) || 'all';
  const enabled =
    !!s.enable_loading &&
    (where === 'all' || (where === 'home_only' && isHome) || (where === 'other_only' && !isHome));

  const [gone, setGone] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    // Equivalent to the Twig DOMContentLoaded handler: fade out, then unmount.
    setFading(true);
    const timer = window.setTimeout(() => setGone(true), 500);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  if (!enabled || gone) return null;

  const logo =
    s.enable_loading_logo && s.loading_logo ? String(s.loading_logo) : (store as any)?.logo;
  const height = Number(s.loading_logo_height) || 60;
  const width = s.loading_logo_width ? Number(s.loading_logo_width) : undefined;

  const bg: CSSProperties = s.enable_loading_color
    ? { backgroundColor: s.loading_bg_color || '#ffffff' }
    : {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        backgroundColor: 'rgb(255 255 255 / 0.5%)',
      };

  const imgStyle: CSSProperties = {
    ...(width ? { width: `${width}px` } : {}),
    height: `${height}px`,
    ...(s.enable_loading_animation ? { animation: 'tr-loading-bounce 2s infinite ease-in-out' } : {}),
  };

  return (
    <div
      className="loading-overlay"
      style={{
        position: 'fixed',
        width: '100%',
        height: '100%',
        zIndex: 99999,
        left: 0,
        top: 0,
        transition: 'opacity 0.5s ease',
        opacity: fading ? 0 : 1,
        ...bg,
      }}
    >
      <div
        className="spinner"
        style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      >
        {logo ? (
          <img
            loading="eager"
            src={logo}
            alt={(store as any)?.name || ''}
            height={height}
            style={imgStyle}
          />
        ) : null}
      </div>
      {s.loading_skip_btn ? (
        <button type="button" className="loading-overlay__skip" onClick={() => setGone(true)}>
          {t('blocks.triple.skip', 'تخطّي')}
        </button>
      ) : null}
    </div>
  );
}
