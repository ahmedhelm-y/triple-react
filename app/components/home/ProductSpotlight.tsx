import { Suspense, memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { product as productApi } from '@salla.sa/twilight-theme-engine/api/product';
import { SallaProductsList, ProductsListSkeleton } from '@salla.sa/twilight-components-react';
import { Money } from '../common/Money';
import { collectionField, pickLang, resolveOption, type MultiLang } from '../../lib/homeBlockData';

/**
 * Product spotlight (home component: home.product-spotlight) — `.tr-spotlight`.
 * Port of triple_twig `views/components/home/product-spotlight.twig` + `js/partials/product-spotlight.js`
 * (`<triple-spotlight>`) + `04-components/product-spotlight.scss`.
 * One product on a colored circle with the merchant's selling points as a checklist. Name/price/picture
 * come from one products-list request (source "selected"); the cart button is salla-add-product-button.
 * Section classes are set in router.tsx.
 */

function firstId(value: unknown): number | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value.length ? firstId(value[0]) : null;
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (Array.isArray(o.source_value)) return firstId(o.source_value[0]);
    if (o.id != null) return Number(o.id);
    if (o.value != null) return Number(o.value);
    return null;
  }
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

interface HighlightRaw {
  [key: string]: unknown;
}

export interface ProductSpotlightData {
  item?: unknown;
  kicker?: MultiLang;
  highlights?: HighlightRaw[];
  ends_at?: string;
  picture?: string;
  spot_color?: string;
  image_side?: unknown;
  position?: number;
  [key: string]: unknown;
}

export const productSpotlightConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as ProductSpotlightData;
    const side = resolveOption(d.image_side, ['start', 'end'] as const, 'start');
    return ['s-block', 'tr-spotlight', `tr-spotlight--${side}`, `product-spotlight-${d.position ?? 0}`, d.custom_classes as string | undefined]
      .filter(Boolean)
      .join(' ');
  },
};

/** Days / hours / minutes left until `endsAt`; null once it is over. */
function useCountdown(endsAt?: string) {
  const end = useMemo(() => (endsAt ? new Date(endsAt).getTime() : NaN), [endsAt]);
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (Number.isNaN(end)) return;
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [end]);
  if (left == null || left <= 0) return null;
  return {
    d: Math.floor(left / 86400000),
    h: Math.floor((left % 86400000) / 3600000),
    m: Math.floor((left % 3600000) / 60000),
  };
}

export const ProductSpotlight = memo(function ProductSpotlight({ data }: { data: ProductSpotlightData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const item = firstId(data.item);
  const kicker = pickLang(data.kicker, lang);
  const clock = useCountdown(data.ends_at);

  const highlights = useMemo(() => {
    const raw = (data.highlights as HighlightRaw[]) || [];
    return raw
      .map((p) => ({
        badge: (collectionField(p, 'highlights', 'badge') as string) || 'sicon-check-circle',
        point: pickLang(collectionField(p, 'highlights', 'point') as MultiLang, lang),
      }))
      .filter((p) => p.point);
  }, [data.highlights, lang]);

  const loader = useCallback(
    () => productApi.list({ source: 'selected', sourceValue: item != null ? [item] : [], perPage: 1 }),
    [item]
  );

  if (item == null) return null;

  const style = { '--spot': data.spot_color || '#f3efe7' } as CSSProperties;

  return (
    <div className="container block" style={style}>
      <Suspense fallback={<ProductsListSkeleton />}>
        <SallaProductsList loader={loader} itemsClassName="tr-spotlight__load">
          {(items: Product[]) => {
            const p = items[0];
            if (!p) return null;
            const image = data.picture || p.image?.url || '';
            return (
              <div className="tr-spotlight__grid">
                <a className="tr-spotlight__visual" href={p.url}>
                  <span className="tr-spotlight__circle" aria-hidden="true" />
                  <img className="tr-spotlight__img" src={image} alt={p.name} loading="lazy" decoding="async" />
                </a>

                <div className="tr-spotlight__info">
                  {kicker && <span className="tr-spotlight__kicker">{kicker}</span>}
                  <h2 className="tr-spotlight__name">
                    <a href={p.url}>{p.name}</a>
                  </h2>
                  <div className="tr-spotlight__price">
                    {p.sale_price ? (
                      <>
                        <span className="tr-spotlight__amount is-sale">
                          <Money amount={p.sale_price} />
                        </span>
                        <span className="tr-spotlight__amount-compare">
                          <Money amount={p.regular_price || p.price} />
                        </span>
                      </>
                    ) : (
                      <span className="tr-spotlight__amount">
                        <Money amount={p.price} />
                      </span>
                    )}
                  </div>

                  {highlights.length > 0 && (
                    <ul className="tr-spotlight__points">
                      {highlights.map((point, i) => (
                        <li key={i}>
                          <i className={point.badge} aria-hidden="true" />
                          <span>{point.point}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {clock && (
                    <div className="tr-spotlight__clock">
                      <span>{t('blocks.home.spot_ends')}</span>
                      <b>{clock.d}</b>
                      <small>{t('blocks.home.spot_days')}</small>
                      <b>{clock.h}</b>
                      <small>{t('blocks.home.spot_hours')}</small>
                      <b>{clock.m}</b>
                      <small>{t('blocks.home.spot_minutes')}</small>
                    </div>
                  )}

                  <div className="tr-spotlight__actions">
                    {/* Salla web component — registered globally; renders the add-to-cart button. */}
                    <salla-add-product-button product-id={p.id} width="wide" />
                    <a className="tr-spotlight__details" href={p.url}>
                      {t('blocks.home.spot_details')}
                    </a>
                  </div>
                </div>
              </div>
            );
          }}
        </SallaProductsList>
      </Suspense>
    </div>
  );
});
