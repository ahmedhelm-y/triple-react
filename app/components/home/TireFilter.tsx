import { Suspense, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

/**
 * `tire-filter` home block — width → height → rim dropdowns, then a keyword
 * search on the chosen size ("205/55/16"), shown under the filter or on the
 * search page. Sizes = the built-in list + the merchant's extra sizes − the
 * excluded ones. Port of `triple_twig/src/views/components/home/tire-filter.twig`
 * + `partials/tire-filter.js`. Styling: `tire-filter.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const DEFAULT_SIZES = ['225/55/17','255/50/20','245/45/20','265/65/17','265/65/18','205/55/16','295/35/21','195/65/15','265/70/17','215/55/17','235/55/18','275/60/20','285/50/20','185/65/15','225/50/17','275/50/21','175/70/14','235/55/19','205/65/16','225/70/16','225/65/17','235/65/17','205/65/15','215/55/18','195/50/16','225/60/17','245/40/20','245/50/20','275/65/18','235/50/18','175/65/14','225/55/19','235/60/18','265/60/18','185/70/14','215/65/16','215/70/16','245/60/18','215/45/17','225/45/17','235/45/18','245/45/19','265/50/20','225/45/19','235/55/20','245/40/19','255/60/18','275/55/20','245/45/18','205/60/16','235/70/16','235/60/16','245/65/17','265/70/18','265/70/16','275/40/20','235/65/16','285/45/22','275/45/20','195/55/15','285/60/18','285/70/17','285/55/20','205/60/15','225/45/18','215/60/17','285/65/17','235/40/18','245/75/16','275/70/16','275/40/19','275/45/21','275/40/22','275/35/19','255/70/18','900/16','225/60/18','265/75/16','225/55/16','235/75/15','265/35/18','245/40/18','235/60/17','205/70/15','275/65/17','255/70/16','195/70/14','225/70/15','245/70/16','235/55/17','255/70/15','900/17','195/60/15','195/15','205/75/15','215/50/17','215/70/15','750/16','265/50/19','235/65/18','285/35/20','255/40/19','255/45/19','245/35/20','255/35/21','255/55/20','285/40/22','255/40/21','275/50/21','235/85/16','255/60/19','235/35/20','235/40/19','245/75/17','285/75/16','275/70/18','215/75/15','825/17','825/16','215/55/16','245/55/19','225/95/16','225/40/18','225/40/19','255/65/18','225/60/16','215/70/17.5','275/30/19','255/45/18','265/40/22','205/70/14','225/50/18','185/60/15','255/35/20','275/50/22','235/45/17','205/45/17','295/40/21','265/40/21','215/60/16','305/30/20','265/55/20','205/16','245/50/18','195/14','255/55/19','155/80/13','175/70/13','185/70/13','175/13','195/55/16','255/35/18','265/45/21','255/40/20','255/35/21','275/40/21','275/45/19','255/35/19','285/30/19','285/35/21','295/35/20','285/45/20','275/35/20','205/55/17','275/70/17','225/75/15','205/50/16','245/50/19','235/45/20','235/50/17','285/35/18','195/60/16','285/65/18','285/70/18','205/75/14','165/65/14','205/40/17','255/55/18','225/55/18','225/70/17','235/50/19','255/60/17','245/45/17','235/45/19','245/70/17','255/45/20','285/30/21','215/65/15','225/50/16','295/40/20','15/70/14','185/14','255/50/19','700/16','900/18','235/45/8','205/45/16','205/50/17','215/16','265/35/19','225/75/16','285/30/20','275/30/20','285/45/19','215/75/17.5','225/60/15','305/55/20','650/16','155/65/13','155/70/13','245/85/16'];

const toSize = (size: string) => {
  const parts = String(size).trim().split('/');
  return parts.length === 2 ? `${parts[0]}/R/${parts[1]}` : parts.join('/');
};
const unique = <T,>(values: T[]) => [...new Set(values)];

function readSizes(raw: unknown): string[] {
  const text = typeof raw === 'string' ? raw : '';
  return text
    .replace(/\r/g, ',')
    .replace(/\n/g, ',')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(toSize);
}

function pickValue(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) return pickValue(raw[0]);
  if (typeof raw === 'object') return (raw as any).value != null ? String((raw as any).value) : undefined;
  return String(raw);
}

export interface TireFilterData {
  image?: string;
  sizes?: string;
  remove_sizes?: string;
  is_slider?: boolean;
  filter_type?: unknown;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const tireFilterConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as TireFilterData;
    const c = ['s-block', 'filter-section', `tire-filter-${d.position ?? 0}`];
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

export const TireFilter = memo(function TireFilter({ data }: { data: TireFilterData }) {
  const { t } = useTranslation();
  const salla = (globalThis as any).salla;

  const isSlider = data.is_slider ?? true;
  const searchPage = pickValue(data.filter_type) === 'index_search';

  const sizes = useMemo(() => {
    const removed = readSizes(data.remove_sizes);
    return unique([...DEFAULT_SIZES.map(toSize), ...readSizes(data.sizes)])
      .filter((size) => !removed.includes(size))
      .sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.sizes, data.remove_sizes]);

  const widths = useMemo(() => unique(sizes.map((s) => s.split('/')[0])), [sizes]);

  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [rim, setRim] = useState('');
  const [results, setResults] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [help, setHelp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const heights = useMemo(
    () => (width ? unique(sizes.filter((s) => s.split('/')[0] === width).map((s) => s.split('/')[1])) : []),
    [sizes, width]
  );
  const rims = useMemo(
    () =>
      width && height
        ? unique(sizes.filter((s) => s.split('/').slice(0, 2).join('/') === `${width}/${height}`).map((s) => s.split('/')[2]))
        : [],
    [sizes, width, height]
  );

  const ready = !!width && !!height && !!rim;

  // the "search here" hint appears after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => setHelp(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // banner buttons elsewhere can scroll to this filter (parity with the twig JS)
  useEffect(() => {
    const onJump = () => {
      const top = rootRef.current?.getBoundingClientRect().top ?? 0;
      window.scrollBy(0, top - 100);
    };
    const btns = document.querySelectorAll('.fs_banners_btn.target_filter_search');
    btns.forEach((b) => b.addEventListener('click', onJump));
    return () => btns.forEach((b) => b.removeEventListener('click', onJump));
  }, []);

  const search = useCallback(() => {
    const h = height === 'R' ? '' : `/${height}`;
    const query = `${width}${h}/${rim}`;
    setHelp(false);
    if (searchPage) {
      window.location.href = salla?.url?.get?.(`search?q=${encodeURIComponent(query)}`) ?? `search?q=${encodeURIComponent(query)}`;
      return;
    }
    setLoading(true);
    salla?.product
      ?.search?.({ query, sort_by: 'priceFromLowToTop', per_page: 50 })
      .then(({ data: products }: { data: any[] }) => setResults((products || []).map((p) => String(p.id))))
      .catch(() => setResults([]))
      .finally(() => {
        setLoading(false);
        const top = buttonRef.current?.getBoundingClientRect().top ?? 0;
        setTimeout(() => window.scrollBy(0, top - 150), 500);
      });
  }, [width, height, rim, searchPage, salla]);

  const resultKey = (results || []).join(',');
  const loader = useCallback(
    () =>
      productApi.list({
        source: 'selected' as ProductsListSource,
        sourceValue: (results || []).map((id) => Number(id)),
        perPage: 100,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resultKey]
  );

  const outerClass = [
    'filter-outer',
    width ? '' : 'select2-disabled',
    width && height ? '' : 'select3-disabled',
    ready ? 'can-srch' : '',
    loading ? 'srch-loading' : '',
    help ? 'srch-help' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="container">
      <div className={outerClass} ref={rootRef}>
        <div className="search-wrapper">
          {data.image ? (
            <div className="filter-image mt-6 mb-12">
              <img src={data.image} alt={t('blocks.home.tire_filter', 'فلتر الإطارات')} loading="lazy" />
            </div>
          ) : null}
          <div className="search-filter">
            <div className="search-inputs-wrapper flex">
              <div className="row flex-1 t-w t-1">
                <div className="note text-red-600 text-2xl text-center opacity-0">
                  <i className="sicon-arrow-down" />
                </div>
                <select
                  className="filter-dropdown"
                  data-type="w"
                  aria-label={t('blocks.home.tire_width', 'العرض')}
                  value={width}
                  onChange={(e) => {
                    setWidth(e.target.value);
                    setHeight('');
                    setRim('');
                  }}
                >
                  <option value="" disabled>
                    {t('blocks.home.tire_width', 'العرض')}
                  </option>
                  {widths.map((w) => (
                    <option value={w} key={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
              <div className="row flex-1 t-h t-2 mx-4">
                <div className="note text-red-600 text-2xl text-center opacity-0">
                  <i className="sicon-arrow-down" />
                </div>
                <select
                  className="filter-dropdown"
                  data-type="h"
                  aria-label={t('blocks.home.tire_height', 'الارتفاع')}
                  disabled={!width}
                  value={height}
                  onChange={(e) => {
                    setHeight(e.target.value);
                    setRim('');
                  }}
                >
                  <option value="" disabled>
                    {t('blocks.home.tire_height', 'الارتفاع')}
                  </option>
                  {heights.map((h) => (
                    <option value={h} key={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div className="row flex-1 t-r t-3">
                <div className="note text-red-600 text-2xl text-center opacity-0">
                  <i className="sicon-arrow-down" />
                </div>
                <select
                  className="filter-dropdown"
                  data-type="r"
                  aria-label={t('blocks.home.tire_rim', 'المقاس')}
                  disabled={!height}
                  value={rim}
                  onChange={(e) => setRim(e.target.value)}
                >
                  <option value="" disabled>
                    {t('blocks.home.tire_rim', 'المقاس')}
                  </option>
                  {rims.map((r) => (
                    <option value={r} key={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="filter-btn mx-auto my-6 flex flex-col max-w-[120px] text-center">
              <div className="note opacity-0 mb-5">
                <i className="sicon-arrow-down" />
              </div>
              <button type="button" className="tires-filter btn btn--primary" ref={buttonRef} onClick={search}>
                {t('blocks.home.tire_search', 'بحث')} <i className="sicon-search" />
              </button>
            </div>
          </div>
        </div>
        <div className="tire-filter__loader">
          <salla-loading />
        </div>
        <div className="filter-results">
          {results != null ? (
            <div className="products-container">
              {!results.length ? (
                t('blocks.home.tire_no_results', 'لا توجد نتائج')
              ) : isSlider ? (
                <Suspense fallback={<ProductsSliderSkeleton />}>
                  <SallaProductsSlider loader={loader} sliderProps={{ id: `tire-results-${data.position ?? 0}` }} blockTitle=" ">
                    {(item: Product) => <ProductCard product={item} />}
                  </SallaProductsSlider>
                </Suspense>
              ) : (
                <Suspense fallback={<ProductsListSkeleton />}>
                  <SallaProductsList loader={loader} itemsClassName="vertical-productss">
                    {(items: Product[]) => items.map((item) => <ProductCard key={item.id} product={item} />)}
                  </SallaProductsList>
                </Suspense>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});
