import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * `offers-drawer` home block — a tab fixed on the side of the screen opens a
 * drawer listing the store's offers/coupons; a coupon's button copies its code,
 * the tab's small x hides the tab for the browser session. Static content only.
 * Port of `triple_twig/src/views/components/home/offers-drawer.twig` +
 * `partials/offers-drawer.js`. Styling: `offers-drawer.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type ItemRaw = Record<string, any>;

interface Offer {
  title: string;
  description: string;
  code: string;
  link?: string;
  linkText: string;
}

export interface OffersDrawerData {
  tab_text?: MultiLang;
  tab_bg?: string;
  tab_color?: string;
  side?: unknown;
  title?: MultiLang;
  note?: MultiLang;
  offers?: ItemRaw[];
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const offersDrawerConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as OffersDrawerData;
    const c = ['tr-offers-block', `offers-drawer-${d.position ?? 0}`];
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

function pickValue(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) return pickValue(raw[0]);
  if (typeof raw === 'object') return (raw as any).value != null ? String((raw as any).value) : undefined;
  return String(raw);
}

function store(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function storeSet(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* storage blocked: the tab just comes back */
  }
}

function copyToClipboard(code: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(code).then(
      () => true,
      () => fallbackCopy(code)
    );
  }
  return Promise.resolve(fallbackCopy(code));
}
function fallbackCopy(code: string): boolean {
  const field = document.createElement('textarea');
  field.value = code;
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
  document.body.appendChild(field);
  field.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  field.remove();
  return copied;
}

export const OffersDrawer = memo(function OffersDrawer({ data }: { data: OffersDrawerData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const salla = (globalThis as any).salla;

  const tabText = pickLang(data.tab_text as MultiLang, lang);
  const title = pickLang(data.title as MultiLang, lang);
  const note = pickLang(data.note as MultiLang, lang);
  const side = pickValue(data.side) === 'start' ? 'start' : 'end';
  const position = data.position ?? 0;
  const panelId = `tr-offers-${position}`;

  const offers: Offer[] = (data.offers ?? [])
    .map((item) => ({
      title: pickLang(item.title as MultiLang, lang),
      description: pickLang(item.description as MultiLang, lang),
      code: (item.code ?? '').toString().trim(),
      link: item.link as string | undefined,
      linkText: pickLang(item.link_text as MultiLang, lang),
    }))
    .filter((o) => o.title);

  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const storageKey = `triple-offers-hidden:${panelId}`;

  useEffect(() => {
    if (store(storageKey)) setDismissed(true);
  }, [storageKey]);

  const close = useCallback(() => {
    setOpen(false);
    openerRef.current?.focus({ preventScroll: true });
  }, []);

  // body class + Escape key while open
  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add('tr-offers-open');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const focusTimer = setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 50);
    return () => {
      document.documentElement.classList.remove('tr-offers-open');
      document.removeEventListener('keydown', onKey);
      clearTimeout(focusTimer);
    };
  }, [open, close]);

  const copy = (code: string) => {
    copyToClipboard(code).then((ok) => {
      if (!ok) return;
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((cur) => (cur === code ? null : cur)), 2000);
      const label = t('blocks.triple.code_copied', '');
      if (label) salla?.notify?.success?.(label);
    });
  };

  if (!offers.length) return null;

  const style: React.CSSProperties = {};
  if (data.tab_bg) (style as any)['--offers-tab-bg'] = data.tab_bg;
  if (data.tab_color) (style as any)['--offers-tab-color'] = data.tab_color;

  return (
    <div
      className={`tr-offers tr-offers--${side}${open ? ' is-open' : ''}${dismissed ? ' is-dismissed' : ''}`}
      data-key={panelId}
      style={style}
    >
      <div className="tr-offers__tab-wrap">
        <button
          type="button"
          className="tr-offers__tab"
          aria-expanded={open ? 'true' : 'false'}
          aria-controls={panelId}
          ref={openerRef}
          onClick={() => setOpen(true)}
        >
          <i className="sicon-tag" aria-hidden="true" />
          <span className="tr-offers__tab-text">{tabText || t('blocks.home.offers_tab', 'العروض')}</span>
          <span className="tr-offers__tab-count">{offers.length}</span>
        </button>
        <button
          type="button"
          className="tr-offers__dismiss"
          aria-label={t('blocks.home.offers_hide', 'إخفاء')}
          onClick={() => {
            setDismissed(true);
            storeSet(storageKey, '1');
          }}
        >
          <i className="sicon-cancel" aria-hidden="true" />
        </button>
      </div>

      <div className="tr-offers__overlay" onClick={close} />
      <div
        className="tr-offers__panel"
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${panelId}-title`}
        {...(open ? {} : { inert: '' as any })}
      >
        {note ? <p className="tr-offers__note">{note}</p> : null}
        <div className="tr-offers__head">
          <h2 className="tr-offers__title" id={`${panelId}-title`}>
            {title || t('blocks.home.offers_title', 'العروض والكوبونات')}{' '}
            <span className="tr-offers__title-count">({offers.length})</span>
          </h2>
          <button
            type="button"
            className="tr-offers__close"
            aria-label={t('blocks.home.offers_close', 'إغلاق')}
            ref={closeRef}
            onClick={close}
          >
            <i className="sicon-cancel" aria-hidden="true" />
          </button>
        </div>

        <ul className="tr-offers__list">
          {offers.map((offer, i) => (
            <li className="tr-offers__item" key={i}>
              <span className="tr-offers__icon" aria-hidden="true">
                <i className="sicon-tag" />
              </span>
              <div className="tr-offers__text">
                <strong className="tr-offers__name">{offer.title}</strong>
                {offer.description ? <span className="tr-offers__desc">{offer.description}</span> : null}
                {offer.code ? <span className="tr-offers__code">{offer.code}</span> : null}
              </div>
              {offer.code ? (
                <button
                  type="button"
                  className={`tr-offers__action${copiedCode === offer.code ? ' is-copied' : ''}`}
                  onClick={() => copy(offer.code)}
                >
                  <i className="sicon-check" aria-hidden="true" />
                  <span>{t('blocks.triple.copy', 'نسخ')}</span>
                </button>
              ) : offer.link ? (
                <a className="tr-offers__action" href={offer.link}>
                  {offer.linkText || t('blocks.home.offers_shop', 'تسوّق')}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});
