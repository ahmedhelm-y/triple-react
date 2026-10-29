import { useEffect, useState } from 'react';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useDocumentClass } from '@salla.sa/twilight-theme-engine/hooks/useDocumentClass';

/**
 * Triple promotion bar — a scrolling marquee of the merchant's promo text,
 * optionally closable (remembered in `localStorage`). Port of
 * `triple_twig/src/views/pages/partials/triple/promotion.twig` + the `promotion`
 * behaviour in `js/partials/triple-extras.js`. Styling: `04-components/triple-extras.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const REPEAT = 15;

export function PromotionBar() {
  const { theme } = useTwilight();
  const s = (theme?.settings ?? {}) as Record<string, any>;
  const text = s.promotion_text ? String(s.promotion_text) : '';

  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem('promotionBanner') === 'hidden') setHidden(true);
    } catch {
      /* ignore */
    }
  }, []);

  // `fixed_promotion` pins the bar; the Twig theme flags it on <body>.
  useDocumentClass({ body: { class: s.fixed_promotion ? 'fixed_promotion' : [] } });

  if (!text || hidden) return null;

  // Per-item scroll speed by text length (matches triple-extras.js).
  const duration = `${Math.min((text.length / 20) * 4000, 10000)}ms`;

  const close = () => {
    setHidden(true);
    try {
      document.body.classList.add('promotion-banner-hidden');
      localStorage.setItem('promotionBanner', 'hidden');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="promotion-banner" style={{ backgroundColor: s.pormotion_bg || '#000000' }}>
      <div className="promotion-banner__inner">
        <ul>
          {Array.from({ length: REPEAT }, (_, i) => (
            <li key={i} style={{ animationDuration: duration }}>
              <a
                href={s.promo_link || undefined}
                style={{ color: s.promotion_color || '#ffffff' }}
                aria-label="Promotion Text"
              >
                {text}
              </a>
            </li>
          ))}
        </ul>
      </div>
      {s.can_close_promotion ? (
        <div
          className="promotion-banner__close"
          role="button"
          tabIndex={0}
          aria-label="Close"
          onClick={close}
        />
      ) : null}
    </div>
  );
}
