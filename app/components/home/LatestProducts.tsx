import { Suspense, memo, useCallback } from 'react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { product as productApi } from '@salla.sa/twilight-theme-engine/api/product';
import { SallaProductsList, ProductsListSkeleton } from '@salla.sa/twilight-components-react';
import { ProductCard } from '../product';

/**
 * `latest-products` home block — the store's newest products under a heading.
 * Port of `triple_twig/src/views/components/home/latest-products.twig`
 * (`<salla-products-list source="latest">`), loaded lazily through `product.list`.
 */

export interface LatestProductsData {
  position?: number;
  [key: string]: unknown;
}

export const latestProductsConfig: HomeComponentConfig = {
  className: 's-block s-block--latest-products container mt-6 sm:mt-8',
};

export const LatestProducts = memo(function LatestProducts(_props: { data: LatestProductsData }) {
  const { t } = useTranslation();
  const loader = useCallback(() => productApi.list({ source: 'latest' }), []);

  return (
    <>
      <div className="s-block__title">
        <h2>{t('blocks.home.latest_products', 'أحدث المنتجات')}</h2>
      </div>

      <Suspense fallback={<ProductsListSkeleton />}>
        <SallaProductsList loader={loader} itemsClassName="s-products-list-vertical-cards">
          {(items: Product[]) => items.map((item) => <ProductCard key={item.id} product={item} />)}
        </SallaProductsList>
      </Suspense>
    </>
  );
});
