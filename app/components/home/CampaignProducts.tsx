import { Suspense, memo, useCallback, useMemo, type CSSProperties } from 'react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { product as productApi, type ProductsListSource } from '@salla.sa/twilight-theme-engine/api/product';
import { SallaProductsList, ProductsListSkeleton } from '@salla.sa/twilight-components-react';
import { ProductCard } from '../product';
import { asUrl, pickLang, resolveOption, type MultiLang } from '../../lib/homeBlockData';

/**
 * Campaign with products (home component: home.campaign-products) — `.tr-campaign`.
 * Port of triple_twig `views/components/home/campaign-products.twig` + `04-components/campaign-products.scss`.
 * A tall poster (picture or mp4) that stays in view while the campaign's products scroll next to it in a
 * two-column grid. Products come from one products-list. Section wrapper classes are set in router.tsx.
 */

const FEEDS: Record<string, ProductsListSource> = {
  latest: 'latest',
  sales: 'sales',
  rated: 'top-rated',
  offers: 'offers',
  category: 'categories',
  brand: 'brands',
  handpicked: 'selected',
};

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

function toIds(value: unknown): number[] {
  if (value == null) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map(firstId).filter((n): n is number => n != null);
}

export interface CampaignProductsData {
  poster?: string;
  poster_clip?: string;
  kicker?: MultiLang;
  headline?: MultiLang;
  story?: MultiLang;
  cta?: MultiLang;
  target?: unknown;
  poster_side?: unknown;
  feed?: unknown;
  feed_category?: unknown;
  feed_brand?: unknown;
  handpicked?: unknown;
  amount?: unknown;
  panel_color?: string;
  position?: number;
  [key: string]: unknown;
}

export const campaignProductsConfig: HomeComponentConfig = {
  className: (data) =>
    ['s-block', `campaign-products-${(data as CampaignProductsData).position ?? 0}`, data.custom_classes as string | undefined]
      .filter(Boolean)
      .join(' '),
};

export const CampaignProducts = memo(function CampaignProducts({ data }: { data: CampaignProductsData }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const kicker = pickLang(data.kicker, lang);
  const headline = pickLang(data.headline, lang);
  const story = pickLang(data.story, lang);
  const cta = pickLang(data.cta, lang);
  const target = asUrl(data.target);
  const side = resolveOption(data.poster_side, ['start', 'end'] as const, 'start');
  const feed = resolveOption(data.feed, ['latest', 'sales', 'rated', 'offers', 'category', 'brand', 'handpicked'] as const, 'offers');

  const { source, sourceValue, amount, ready } = useMemo(() => {
    let values: number[] = [];
    if (feed === 'category') values = toIds(data.feed_category).slice(0, 1);
    else if (feed === 'brand') values = toIds(data.feed_brand).slice(0, 1);
    else if (feed === 'handpicked') values = toIds(data.handpicked);
    const amt = feed === 'handpicked' ? values.length : Number(resolveOption(data.amount, ['2', '4', '6', '8'] as const, '4')) || 4;
    const ok = !['category', 'brand', 'handpicked'].includes(feed) || values.length > 0;
    return { source: FEEDS[feed], sourceValue: values, amount: amt, ready: ok };
  }, [feed, data.feed_category, data.feed_brand, data.handpicked, data.amount]);

  const svKey = sourceValue.join(',');
  const loader = useCallback(
    () => productApi.list({ source, sourceValue: sourceValue.length ? sourceValue : undefined, perPage: amount }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, svKey, amount]
  );

  const hasWords = kicker || headline || story || (cta && target);
  if (!(data.poster || data.poster_clip || ready)) return null;

  const style = data.panel_color ? ({ '--campaign-panel': data.panel_color } as CSSProperties) : undefined;

  return (
    <div className={`tr-campaign tr-campaign--${side}${data.panel_color ? ' has-panel' : ''}`} style={style}>
      <div className="container">
        <div className="tr-campaign__grid">
          <div className="tr-campaign__poster">
            {data.poster_clip ? (
              <video
                className="tr-campaign__media"
                src={data.poster_clip}
                muted
                playsInline
                loop
                autoPlay
                preload="metadata"
                poster={data.poster || undefined}
              />
            ) : data.poster ? (
              <img className="tr-campaign__media" src={data.poster} alt={headline} loading="lazy" decoding="async" />
            ) : null}
            {hasWords && (
              <div className="tr-campaign__words">
                {kicker && <span className="tr-campaign__kicker">{kicker}</span>}
                {headline && <h2 className="tr-campaign__headline">{headline}</h2>}
                {story && <p className="tr-campaign__story">{story}</p>}
                {cta && target && (
                  <a className="tr-campaign__cta" href={target}>
                    <span>{cta}</span>
                    <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
          </div>

          {ready && (
            <div className="tr-campaign__products">
              <Suspense fallback={<ProductsListSkeleton />}>
                <SallaProductsList loader={loader} itemsClassName="tr-campaign__list">
                  {(items: Product[]) => items.slice(0, amount).map((item) => <ProductCard key={item.id} product={item} />)}
                </SallaProductsList>
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
