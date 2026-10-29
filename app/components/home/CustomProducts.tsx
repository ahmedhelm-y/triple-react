import { Suspense, memo, useCallback } from 'react';
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
import { pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * `custom-products` home block — a products section the merchant configures by
 * source (category / brand / best sellers / latest / chosen / offers / top
 * rated) shown as a slider or a list, with an optional "view all" link. Port of
 * `triple_twig/src/views/components/home/custom-products.twig`. Best sellers
 * (`sales`) only exist as a list, so that source forces list mode.
 * Styling: engine product list/slider + `home-blocks.scss`.
 */

const SOURCES: Record<string, ProductsListSource> = {
  category: 'categories',
  brand: 'brands',
  most_sales: 'sales',
  latest_products: 'latest',
  chosen_products: 'selected',
  offers: 'offers',
  top_rated_products: 'top-rated',
};

/** A dropdown's selected value: scalar, `{ value }`, or a one-item list of those. */
function pickValue(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) return pickValue(raw[0]);
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    return o.value != null ? String(o.value) : undefined;
  }
  return String(raw);
}

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
  const arr = Array.isArray(value)
    ? value
    : typeof value === 'object' && Array.isArray((value as Record<string, unknown>).source_value)
      ? ((value as Record<string, unknown>).source_value as unknown[])
      : [value];
  return arr.map(firstId).filter((n): n is number => n != null);
}

export interface CustomProductsData {
  add_top_space?: boolean;
  title?: MultiLang;
  subtitle?: MultiLang;
  display_mode?: unknown;
  type?: unknown;
  limit?: unknown;
  chosen_products?: unknown;
  category?: unknown;
  brand?: unknown;
  show_all_link?: boolean;
  show_all_position?: unknown;
  show_all_text?: MultiLang;
  show_all_url?: string;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const customProductsConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as CustomProductsData;
    const c = ['s-block--custom-products', 'container'];
    if (d.add_top_space) c.push('s-block');
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

export const CustomProducts = memo(function CustomProducts({ data }: { data: CustomProductsData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const type = pickValue(data.type) ?? 'latest_products';
  let source = SOURCES[type] ?? 'latest';
  let mode = pickValue(data.display_mode) ?? 'slider';
  if (source === 'sales') mode = 'list';
  let limit = Number(pickValue(data.limit) ?? 8) || 8;

  let sourceValue: number[] = [];
  if (type === 'category') {
    const id = firstId(data.category);
    sourceValue = id != null ? [id] : [];
  } else if (type === 'brand') {
    const id = firstId(data.brand);
    sourceValue = id != null ? [id] : [];
  } else if (type === 'chosen_products') {
    sourceValue = toIds(data.chosen_products);
    limit = sourceValue.length || limit;
  }

  const needsValue = ['categories', 'brands', 'selected'].includes(source);

  const title = pickLang(data.title as MultiLang, lang);
  const subtitle = pickLang(data.subtitle as MultiLang, lang);
  const allText = pickLang(data.show_all_text as MultiLang, lang);
  const allUrl = data.show_all_link ? data.show_all_url || '' : '';
  const allPosition = pickValue(data.show_all_position) ?? 'below_products';
  const allBelow = allPosition !== 'below_title';
  const position = data.position ?? 0;

  const svKey = sourceValue.join(',');
  const loader = useCallback(
    () =>
      productApi.list({
        source: source as ProductsListSource,
        sourceValue: sourceValue.length ? sourceValue : undefined,
        perPage: limit,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, svKey, limit]
  );

  if (needsValue && !sourceValue.length) return null;

  const viewAll = allUrl ? (
    <div className={`custom-products__view-all-wrap flex justify-center ${allBelow ? 'mt-4' : 'mb-4'}`}>
      <a
        data-triple="home-custom-products-view-all"
        className="custom-products__view-all group inline-flex items-center gap-2 text-primary font-medium relative pb-1"
        href={allUrl}
      >
        <span>{allText || t('blocks.home.display_all', 'عرض الكل')}</span>
        <i className="sicon-keyboard_arrow_left text-lg rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1 transition-transform duration-300" />
        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
      </a>
    </div>
  ) : null;

  if (mode === 'slider') {
    return (
      <div className="products-reserve">
        <Suspense fallback={<ProductsSliderSkeleton />}>
          <SallaProductsSlider
            loader={loader}
            sliderProps={{ id: `custom-products-slider-${position}` }}
            blockTitle={title || ' '}
            {...(subtitle ? { subTitle: subtitle } : {})}
            {...(allUrl ? { displayAllUrl: allUrl } : {})}
          >
            {(item: Product) => <ProductCard product={item} />}
          </SallaProductsSlider>
        </Suspense>
      </div>
    );
  }

  return (
    <>
      {title || subtitle ? (
        <div className="text-center home-block-title">
          {title ? (
            <h2
              data-triple="home-custom-products-title"
              className="custom-products__title text-3xl font-bold tracking-tight text-store-text-primary sm:text-4xl"
            >
              {title}
            </h2>
          ) : null}
          {subtitle ? (
            <p
              data-triple="home-custom-products-subtitle"
              className="custom-products__subtitle mt-2 text-lg leading-8 text-store-text-secondary"
            >
              {subtitle}
            </p>
          ) : null}
          <div className="custom-products__line my-2 mx-auto w-28 h-0 border-2 border-primary" />
        </div>
      ) : null}
      {!allBelow ? viewAll : null}
      <Suspense fallback={<ProductsListSkeleton />}>
        <SallaProductsList loader={loader} itemsClassName="vertical-products">
          {(items: Product[]) =>
            items.slice(0, limit).map((item) => <ProductCard key={item.id} product={item} />)
          }
        </SallaProductsList>
      </Suspense>
      {allBelow ? viewAll : null}
    </>
  );
});
