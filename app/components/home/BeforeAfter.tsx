import { memo, useCallback, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * Before / After (Triple) — home block.
 * Port of triple_twig `views/components/home/before-after.twig` + before-after.scss.
 * Triple used the `<img-comparison-slider>` web component; here the divider is a native React
 * drag-slider (clip-path reveal) so no extra library is loaded. Markup keeps Triple's
 * `.tr-compare__*` classes, so the SCSS applies unchanged. `--compare-divider` is set inline on
 * the component's root (the `.tr-compare` modifier classes stay on the engine section).
 */

export interface BeforeAfterData {
  // New (2026-10 redesign) field names, with the pre-redesign names kept as fallbacks.
  heading?: MultiLang;
  blurb?: MultiLang;
  top_gap?: boolean;
  edge_to_edge?: boolean;
  soft_corners?: boolean;
  upright_split?: boolean;
  handle_tint?: string;
  handle_start?: number | string;
  photo_then?: string;
  photo_now?: string;
  show_tags?: boolean;
  then_tag?: MultiLang;
  now_tag?: MultiLang;
  title?: MultiLang;
  description?: MultiLang;
  add_top_space?: boolean;
  full_width?: boolean;
  rounded?: boolean;
  vertical?: boolean;
  divider_color?: string;
  start_position?: number | string;
  before_image?: string;
  after_image?: string;
  show_labels?: boolean;
  before_label?: MultiLang;
  after_label?: MultiLang;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface BeforeAfterProps {
  data: BeforeAfterData;
}

export const BeforeAfter = memo(function BeforeAfter({ data }: BeforeAfterProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const title = pickLang(data.heading ?? data.title, lang);
  const description = pickLang(data.blurb ?? data.description, lang);
  const beforeLabel = pickLang(data.then_tag ?? data.before_label, lang) || t('blocks.home.before', 'Before');
  const afterLabel = pickLang(data.now_tag ?? data.after_label, lang) || t('blocks.home.after', 'After');
  const vertical = Boolean(data.upright_split ?? data.vertical);
  const divider = data.handle_tint || data.divider_color || '#ffffff';
  const startRaw = data.handle_start ?? data.start_position;
  const start =
    startRaw !== null && startRaw !== undefined && startRaw !== '' ? Number(startRaw) : 50;
  const beforeImage = data.photo_then ?? data.before_image;
  const afterImage = data.photo_now ?? data.after_image;
  const showLabels = data.show_tags ?? data.show_labels;
  const rounded = data.soft_corners ?? data.rounded;
  const fullWidth = data.edge_to_edge ?? data.full_width;

  const hasText = Boolean(title || description);
  const [value, setValue] = useState(Number.isFinite(start) ? start : 50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = sliderRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let pct: number;
      if (vertical) {
        pct = ((clientY - rect.top) / rect.height) * 100;
      } else {
        const x = clientX - rect.left;
        pct = (x / rect.width) * 100;
        // RTL: the divider reads from the inline-start, mirror it.
        if (el.closest('[dir="rtl"]') || document.documentElement.dir === 'rtl') {
          pct = 100 - pct;
        }
      }
      setValue(Math.max(0, Math.min(100, pct)));
    },
    [vertical]
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    updateFromPointer(event.clientX, event.clientY);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    updateFromPointer(event.clientX, event.clientY);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  if (!beforeImage || !afterImage) return null;

  // The "after" side is the overlay revealed from the divider; clip it to `value`.
  const afterClip: CSSProperties = vertical
    ? { clipPath: `inset(${value}% 0 0 0)` }
    : { clipPath: `inset(0 0 0 ${value}%)` };
  const handlePos: CSSProperties = vertical
    ? { top: `${value}%`, left: 0, right: 0 }
    : { insetInlineStart: `${value}%`, top: 0, bottom: 0 };

  const containerClass = fullWidth && !hasText ? 'w-full' : 'container';

  return (
    <div className={containerClass} style={{ '--compare-divider': divider } as CSSProperties}>
      <div className="tr-compare__layout">
        {hasText && (
          <div className="tr-compare__text">
            {title && <h2 className="tr-compare__title">{title}</h2>}
            {description && <p className="tr-compare__desc">{description}</p>}
            {showLabels && (
              <ul className="tr-compare__legend">
                <li className="tr-compare__legend-item tr-compare__legend-item--before">
                  {beforeLabel}
                </li>
                <li className="tr-compare__legend-item tr-compare__legend-item--after">
                  {afterLabel}
                </li>
              </ul>
            )}
          </div>
        )}

        <div className={`tr-compare__stage${rounded ? ' is-rounded' : ''}`}>
          <div
            ref={sliderRef}
            className="tr-compare__slider rendered"
            style={{ position: 'relative', touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="slider"
            aria-label={`${beforeLabel} / ${afterLabel}`}
            aria-valuenow={Math.round(value)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <figure className="tr-compare__side tr-compare__side--before" style={{ margin: 0 }}>
              <img
                className="tr-compare__image"
                src={beforeImage}
                alt={beforeLabel}
                loading="lazy"
                draggable={false}
              />
              {showLabels && <figcaption className="tr-compare__tag">{beforeLabel}</figcaption>}
            </figure>

            <figure
              className="tr-compare__side tr-compare__side--after"
              style={{ margin: 0, position: 'absolute', inset: 0, ...afterClip }}
            >
              <img
                className="tr-compare__image"
                src={afterImage}
                alt={afterLabel}
                loading="lazy"
                draggable={false}
              />
              {showLabels && <figcaption className="tr-compare__tag">{afterLabel}</figcaption>}
            </figure>

            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                ...handlePos,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  background: 'var(--compare-divider, #fff)',
                  ...(vertical
                    ? { left: 0, right: 0, height: 3, transform: 'translateY(-50%)' }
                    : { top: 0, bottom: 0, width: 3, transform: 'translateX(-50%)' }),
                }}
              ></span>
              <span className="tr-compare__handle">
                <i className="sicon-arrow-left"></i>
                <i className="sicon-arrow-right"></i>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
