import { Suspense, memo, useCallback } from 'react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { product as productApi } from '@salla.sa/twilight-theme-engine/api/product';
import { SallaProductsList, ProductsListSkeleton } from '@salla.sa/twilight-components-react';
import { ProductCard } from '../product';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * `special_product` home block — a single highlighted product shown with the
 * special card (remaining-quantity pie + discount countdown). Port of
 * `triple_twig/src/views/components/home/special_product.twig`: the product is
 * loaded through one `salla-products-list` request (never fetched by the card),
 * and the section classes (`mini` / `mini-desktop` / `hide_remaining` /
 * `hide_countdown`) drive the card size and what the special card hides.
 * Styling: `04-components/special-product.scss` + the card SCSS.
 */

/** A dropdown-list value: a product object, an id, `{ value }`, or `{ source_value: [...] }`. */
type PickerValue = string | number | { id?: unknown; value?: unknown; source_value?: unknown } | null | undefined;

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

export interface SpecialProductData {
  title?: MultiLang;
  has_bg?: boolean;
  mini?: boolean;
  mini_desktop?: boolean;
  hide_remaining?: boolean;
  hide_countdown?: boolean;
  product?: PickerValue | PickerValue[];
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

/** Section-shell classes for the block (the engine wraps the component in the
 *  `<section>`); the merchant toggles drive `has-bg` / `mini` / `hide_*`, which the
 *  card SCSS reads as `.special-product.mini .pie-wrapper`, etc. */
export const specialProductConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as SpecialProductData;
    const c = ['s-block', 'special-product', `special-product--${d.position ?? 0}`, 's-block--animate'];
    if (d.has_bg) c.push('has-bg');
    if (d.mini) c.push('mini');
    if (d.mini_desktop) c.push('mini-desktop');
    if (d.hide_remaining) c.push('hide_remaining');
    if (d.hide_countdown) c.push('hide_countdown');
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

export const SpecialProduct = memo(function SpecialProduct({ data }: { data: SpecialProductData }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const productId = firstId(data.product);

  const loader = useCallback(
    () =>
      productApi.list({
        source: 'selected',
        sourceValue: productId != null ? [productId] : [],
        perPage: 1,
      }),
    [productId]
  );

  if (productId == null) return null;

  const title = pickLang(data.title as MultiLang, lang);

  return (
    <div className="container">
      {title ? (
        <div className="home-block-title">
          <div>
            <h2
              data-triple="home-special-product-title"
              className="special-product__title text-center text-store-text-primary text-base lg:text-xl font-bold leading-tight anime-item"
            >
              {title}
            </h2>
            <span className="enhanced-title-border home-block-line" />
          </div>
        </div>
      ) : null}

      <div className="special-product__wrapper anime-item">
        <Suspense fallback={<ProductsListSkeleton />}>
          <SallaProductsList loader={loader} itemsClassName="special-product__list">
            {(items: Product[]) =>
              items
                .slice(0, 1)
                .map((item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    layout="special"
                    withShadow
                    showRemained={!data.hide_remaining}
                    hideCountdown={!!data.hide_countdown}
                  />
                ))
            }
          </SallaProductsList>
        </Suspense>
      </div>
    </div>
  );
});
