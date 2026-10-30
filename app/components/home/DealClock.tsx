import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { asUrl, pickLang, resolveOption, type MultiLang } from '../../lib/homeBlockData';

/**
 * Deal clock (home component: home.deal-clock) — `.tr-deal`.
 * Port of triple_twig `views/components/home/deal-clock.twig` + `js/partials/deal-clock.js`
 * (the `<triple-deal>` custom element) + `04-components/deal-clock.scss`.
 * A band with the deal's texts, a days/hours/minutes/seconds clock in tiles, and the coupon as a
 * tear-off ticket with a copy button. When the time is over the block hides itself (`when_over=hide`)
 * or the clock is swapped for the "over" message. Section classes are set in router.tsx.
 */

const UNITS = [
  ['days', 86400000],
  ['hours', 3600000],
  ['minutes', 60000],
  ['seconds', 1000],
] as const;
type Unit = (typeof UNITS)[number][0];

export interface DealClockProps {
  data: {
    kicker?: MultiLang;
    headline?: MultiLang;
    detail?: MultiLang;
    cta?: MultiLang;
    over_text?: MultiLang;
    target?: unknown;
    ends_at?: string;
    coupon_code?: string;
    backdrop?: string;
    tone?: string;
    ink?: string;
    when_over?: unknown;
    position?: number;
    [key: string]: unknown;
  };
}

/** Wrapper `<section>` classes for `home.deal-clock`. */
export const dealClockConfig = {
  className: (data: DealClockProps['data']) =>
    ['s-block', 'tr-deal-block', `deal-clock-${data.position ?? 0}`, data.custom_classes as string | undefined]
      .filter(Boolean)
      .join(' '),
};

const zero: Record<Unit, string> = { days: '00', hours: '00', minutes: '00', seconds: '00' };

export const DealClock = memo(function DealClock({ data }: DealClockProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const kicker = pickLang(data.kicker, lang);
  const headline = pickLang(data.headline, lang);
  const detail = pickLang(data.detail, lang);
  const cta = pickLang(data.cta, lang);
  const over = pickLang(data.over_text, lang);
  const when = resolveOption(data.when_over, ['hide', 'message'] as const, 'hide');
  const target = asUrl(data.target);
  const end = useMemo(() => (data.ends_at ? new Date(data.ends_at).getTime() : NaN), [data.ends_at]);

  const [tiles, setTiles] = useState<Record<Unit, string>>(zero);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (Number.isNaN(end)) return;
    const render = () => {
      let left = end - Date.now();
      if (left <= 0) {
        setEnded(true);
        return false;
      }
      const next = {} as Record<Unit, string>;
      for (const [unit, size] of UNITS) {
        next[unit] = String(Math.floor(left / size)).padStart(2, '0');
        left %= size;
      }
      setTiles(next);
      return true;
    };
    if (!render()) return;
    const timer = setInterval(() => {
      if (!render()) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [end]);

  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = () => {
    const code = data.coupon_code?.trim();
    if (!code || !navigator.clipboard?.writeText) return;
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        if (copyTimer.current) clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  };
  useEffect(() => () => (copyTimer.current ? clearTimeout(copyTimer.current) : undefined), []);

  if (!data.ends_at) return null;
  if (ended && when === 'hide') return null;

  const style = { '--deal-tone': data.tone || '#111111', '--deal-ink': data.ink || '#ffffff' } as CSSProperties;
  const showClock = !(ended && when === 'message');

  return (
    <div className="container">
      <div className={`tr-deal${data.backdrop ? ' has-backdrop' : ''}`} style={style}>
        {data.backdrop && (
          <img className="tr-deal__backdrop" src={data.backdrop} alt="" loading="lazy" decoding="async" />
        )}

        <div className="tr-deal__words">
          {kicker && <span className="tr-deal__kicker">{kicker}</span>}
          {headline && <h2 className="tr-deal__headline">{headline}</h2>}
          {detail && <p className="tr-deal__detail">{detail}</p>}
        </div>

        {showClock && (
          <div className="tr-deal__clock" role="timer">
            {UNITS.map(([unit]) => (
              <div className="tr-deal__tile" key={unit}>
                <b>{tiles[unit]}</b>
                <small>{t(`blocks.home.deal_${unit}`)}</small>
              </div>
            ))}
          </div>
        )}
        {when === 'message' && over && ended && <p className="tr-deal__over">{over}</p>}

        {(data.coupon_code || (cta && target)) && (
          <div className="tr-deal__actions">
            {data.coupon_code && (
              <div className="tr-deal__ticket">
                <span className="tr-deal__ticket-label">{t('blocks.home.deal_code')}</span>
                <code>{data.coupon_code}</code>
                <button
                  type="button"
                  className={`tr-deal__copy${copied ? ' is-done' : ''}`}
                  onClick={copy}
                  aria-live="polite"
                >
                  {copied ? t('blocks.home.deal_copied') : t('blocks.home.deal_copy')}
                </button>
              </div>
            )}
            {cta && target && (
              <Link className="tr-deal__cta" to={target}>
                <span>{cta}</span>
                <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
