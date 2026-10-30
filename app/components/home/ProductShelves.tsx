import { Suspense, memo, useCallback, useMemo, useState } from 'react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { product as productApi, type ProductsListSource } from '@salla.sa/twilight-theme-engine/api/product';
import {
  SallaProductsList,
  ProductsListSkeleton,
  SallaProductsSlider,
  ProductsSliderSkeleton,
} from '@salla.sa/twilight-components-react';
import { ProductCard } from '../product';
import { asUrl, collectionField, pickLang, resolveOption, type MultiLang } from '../../lib/homeBlockData';

/**
 * Product shelves (home component: home.product-shelves) — `.tr-shelves`.
 * Port of triple_twig `views/components/home/product-shelves.twig` + `04-components/product-shelves.scss`.
 * One block with one or more shelves of products; several shelves make an index next to the head and only
 * the open shelf is loaded (here each mounts the first time it opens). Section classes set in router.tsx.
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

/* eslint-disable @typescript-eslint/no-explicit-any */
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
function themeSetting(key: string): boolean {
  const s = (globalThis as unknown as { salla?: any }).salla;
  try {
    return !!s?.config?.get?.(`theme.settings.${key}`);
  } catch {
    return false;
  }
}

interface ShelfRaw {
  [key: string]: unknown;
}
interface Shelf {
  label: string;
  source: ProductsListSource;
  values: number[];
  amount: number;
  list: boolean;
  more: string;
}

export interface ProductShelvesData {
  heading?: MultiLang;
  blurb?: MultiLang;
  shelves?: ShelfRaw[];
  shelf_layout?: unknown;
  numbered?: boolean;
  position?: number;
  [key: string]: unknown;
}

export const productShelvesConfig: HomeComponentConfig = {
  className: (data) =>
    ['s-block', 'tr-shelves', `product-shelves-${(data as ProductShelvesData).position ?? 0}`, data.custom_classes as string | undefined]
      .filter(Boolean)
      .join(' '),
};

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

/** One shelf's products (loaded the first time the shelf opens). */
function ShelfPanel({ shelf, sliderClass, autoPlay, sliderId, moreText }: {
  shelf: Shelf;
  sliderClass: string;
  autoPlay: boolean;
  sliderId: string;
  moreText: string;
}) {
  const svKey = shelf.values.join(',');
  const loader = useCallback(
    () => productApi.list({ source: shelf.source, sourceValue: shelf.values.length ? shelf.values : undefined, perPage: shelf.amount }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shelf.source, svKey, shelf.amount]
  );

  return (
    <>
      {shelf.list ? (
        <Suspense fallback={<ProductsListSkeleton />}>
          <SallaProductsList loader={loader} itemsClassName={sliderClass}>
            {(items: Product[]) => items.slice(0, shelf.amount).map((item) => <ProductCard key={item.id} product={item} />)}
          </SallaProductsList>
        </Suspense>
      ) : (
        <Suspense fallback={<ProductsSliderSkeleton />}>
          <SallaProductsSlider
            loader={loader}
            className={sliderClass}
            autoplay={autoPlay}
            sliderConfig={{
              freeMode: { enabled: true, sticky: false },
              mousewheel: { enabled: true, forceToAxis: true },
              createElements: true,
              scrollbar: { auto: true, draggable: true },
            }}
            sliderProps={{ id: sliderId }}
            blockTitle=" "
          >
            {(item: Product) => <ProductCard product={item} />}
          </SallaProductsSlider>
        </Suspense>
      )}
      {shelf.more && (
        <a className="tr-shelves__more" href={shelf.more}>
          <span>{moreText}</span>
          <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true" />
        </a>
      )}
    </>
  );
}

export const ProductShelves = memo(function ProductShelves({ data }: { data: ProductShelvesData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const heading = pickLang(data.heading, lang);
  const blurb = pickLang(data.blurb, lang);
  const layout = resolveOption(data.shelf_layout, ['slider', 'grid'] as const, 'slider');
  const position = data.position ?? 0;
  const [active, setActive] = useState(0);
  const [opened, setOpened] = useState<Set<number>>(() => new Set([0]));

  const shelves = useMemo<Shelf[]>(() => {
    const raw = (data.shelves as ShelfRaw[]) || [];
    const out: Shelf[] = [];
    for (const shelf of raw) {
      const feed = resolveOption(
        collectionField(shelf, 'shelves', 'feed'),
        ['latest', 'sales', 'rated', 'offers', 'category', 'brand', 'handpicked'] as const,
        'latest'
      );
      let values: number[] = [];
      if (feed === 'category') values = toIds(collectionField(shelf, 'shelves', 'feed_category')).slice(0, 1);
      else if (feed === 'brand') values = toIds(collectionField(shelf, 'shelves', 'feed_brand')).slice(0, 1);
      else if (feed === 'handpicked') values = toIds(collectionField(shelf, 'shelves', 'handpicked'));
      if (['category', 'brand', 'handpicked'].includes(feed) && !values.length) continue;
      const label = pickLang(collectionField(shelf, 'shelves', 'label') as MultiLang, lang) || t('blocks.home.shelf_products');
      const amount =
        feed === 'handpicked'
          ? values.length
          : Number(resolveOption(collectionField(shelf, 'shelves', 'amount'), ['2', '4', '6', '8', '10', '12'] as const, '8')) || 8;
      out.push({ label, source: FEEDS[feed], values, amount, list: layout === 'grid' || feed === 'sales', more: asUrl(collectionField(shelf, 'shelves', 'more_target')) });
    }
    return out;
  }, [data.shelves, layout, lang, t]);

  if (!shelves.length) return null;

  const many = shelves.length > 1;
  const sliderClass = `simplified-products${themeSetting('fit_slider_products') ? ' fit-slider-products' : ''}`;
  const select = (i: number) => {
    setActive(i);
    setOpened((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
  };

  return (
    <div className="container block">
      <div className="tr-shelves__top">
        {(heading || blurb) && (
          <div className="tr-shelves__intro">
            {heading && <h2 className="tr-shelves__heading">{heading}</h2>}
            {blurb && <p className="tr-shelves__blurb">{blurb}</p>}
          </div>
        )}
        {many && (
          <div className="tr-shelves__index" role="tablist">
            {shelves.map((shelf, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                className="tr-shelves__name"
                id={`shelf-${position}-${i}-tab`}
                aria-controls={`shelf-${position}-${i}`}
                aria-selected={active === i ? 'true' : 'false'}
                tabIndex={active === i ? 0 : -1}
                onClick={() => select(i)}
              >
                {data.numbered && <small aria-hidden="true">{pad(i + 1)}</small>}
                <span>{shelf.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {shelves.map((shelf, i) => (
        <div
          key={i}
          className="tr-shelves__shelf"
          id={`shelf-${position}-${i}`}
          role={many ? 'tabpanel' : undefined}
          aria-labelledby={many ? `shelf-${position}-${i}-tab` : undefined}
          hidden={active !== i || undefined}
        >
          {opened.has(i) && (
            <ShelfPanel
              shelf={shelf}
              sliderClass={sliderClass}
              autoPlay={themeSetting('auto_play_products_slider')}
              sliderId={`shelf-slider-${position}-${i}`}
              moreText={t('blocks.home.shelf_more')}
            />
          )}
        </div>
      ))}
    </div>
  );
});
