import { memo, useCallback, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, CSSProperties } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, collectionField, type MultiLang } from '../../lib/homeBlockData';

/**
 * Brand Timeline (Triple) — home block.
 * Port of triple_twig `views/components/home/timeline.twig` + `js/partials/timeline.js`
 * (the `<triple-timeline>` web component). The picked year's panel shows on top; the years
 * sit on a line as tabs with a progress bar and prev/next arrows. Clicking a year, the arrows,
 * or the arrow/Home/End keys moves the active year — all React state, no DOM mutation.
 * Styles: 04-components/timeline.scss (+ tr-rise in triple-sections.scss).
 */

interface TimelineEventRaw {
  [key: string]: unknown;
}

export interface TimelineData {
  kicker?: MultiLang;
  title?: MultiLang;
  events?: TimelineEventRaw[];
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface TimelineProps {
  data: TimelineData;
}

interface TEvent {
  year: string;
  title: string;
  text: string;
  image: string;
}

export const Timeline = memo(function Timeline({ data }: TimelineProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const events: TEvent[] = (Array.isArray(data.events) ? data.events : [])
    .map((e) => ({
      year: (collectionField(e, 'events', 'year') as string) || '',
      title: pickLang(collectionField(e, 'events', 'title') as MultiLang, lang),
      text: pickLang(collectionField(e, 'events', 'text') as MultiLang, lang),
      image: (collectionField(e, 'events', 'image') as string) || '',
    }))
    .filter((e) => e.year && e.title);

  const kicker = pickLang(data.kicker, lang);
  const title = pickLang(data.title, lang);
  const count = events.length;

  const [index, setIndex] = useState(0);
  const dotRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const show = useCallback(
    (i: number, focus = false) => {
      if (count === 0) return;
      const next = (i + count) % count;
      setIndex(next);
      if (focus) dotRefs.current[next]?.focus();
    },
    [count]
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const rtl =
        typeof document !== 'undefined'
          ? document.documentElement.dir === 'rtl'
          : lang.startsWith('ar');
      const nextKey = rtl ? 'ArrowLeft' : 'ArrowRight';
      const prevKey = rtl ? 'ArrowRight' : 'ArrowLeft';
      if (![nextKey, prevKey, 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const target =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? count - 1
            : index + (event.key === nextKey ? 1 : -1);
      show(target, true);
    },
    [count, index, lang, show]
  );

  if (!count) return null;

  const progress = count > 1 ? (index / (count - 1)) * 100 : 0;

  return (
    <div className="container">
      <div className="tr-tl" style={{ '--tl-count': count } as CSSProperties}>
        {(kicker || title) && (
          <div className="tr-head">
            <div className="tr-head__text">
              {kicker && <p className="tr-head__subtitle">{kicker}</p>}
              {title && <h2 className="tr-head__title">{title}</h2>}
            </div>
          </div>
        )}

        <div className="tr-tl__panels">
          {events.map((ev, i) => (
            <div
              key={i}
              className={`tr-tl__panel${ev.image ? '' : ' tr-tl__panel--text'}`}
              role="tabpanel"
              hidden={i !== index}
            >
              {ev.image && (
                <div className="tr-tl__media">
                  <img
                    className="tr-tl__img"
                    src={ev.image}
                    alt={ev.title}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )}
              <div className="tr-tl__content">
                <span className="tr-tl__year">{ev.year}</span>
                <h3 className="tr-tl__title">{ev.title}</h3>
                {ev.text && (
                  <p className="tr-tl__text" style={{ whiteSpace: 'pre-line' }}>
                    {ev.text}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {count > 1 && (
          <div className="tr-tl__nav">
            <div
              className="tr-tl__line"
              role="tablist"
              aria-label={title || t('blocks.home.timeline_years', 'Years')}
              onKeyDown={onKeyDown}
            >
              <div className="tr-tl__years">
                <span className="tr-tl__track" aria-hidden="true">
                  <span className="tr-tl__progress" style={{ width: `${progress}%` }}></span>
                </span>
                {events.map((ev, i) => {
                  const active = i === index;
                  return (
                    <button
                      key={i}
                      type="button"
                      ref={(el) => {
                        dotRefs.current[i] = el;
                      }}
                      className={`tr-tl__dot${active ? ' is-active' : ''}${i <= index ? ' is-done' : ''}`}
                      role="tab"
                      aria-selected={active}
                      tabIndex={active ? 0 : -1}
                      onClick={() => show(i)}
                    >
                      <span className="tr-tl__mark" aria-hidden="true"></span>
                      <span className="tr-tl__dot-year">{ev.year}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="tr-tl__arrows">
              <button
                type="button"
                className="tr-tl__arrow"
                onClick={() => show(index - 1)}
                aria-label={t('blocks.home.timeline_prev', 'Previous year')}
              >
                <i className="sicon-arrow-right ltr:rotate-180" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                className="tr-tl__arrow"
                onClick={() => show(index + 1)}
                aria-label={t('blocks.home.timeline_next', 'Next year')}
              >
                <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
