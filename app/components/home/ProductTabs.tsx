import { Suspense, memo, useCallback, useState } from 'react';
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
 * `product-tabs` home block (Triple's `.tr-tabs`) — a tabbed products section;
 * each tab names its own source (category / brand / best sellers / latest /
 * chosen / offers / top rated) and renders as a slider or list. Port of
 * `triple_twig/src/views/components/home/product-tabs.twig`; the Twig JS lazy-
 * loaded inactive tabs, here each tab's products mount the first time it opens
 * and stay mounted. Styling: `04-components/product-tabs.scss`.
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

/* eslint-disable @typescript-eslint/no-explicit-any */
type TabRaw = Record<string, any>;

function tabField(tab: TabRaw, key: string): unknown {
  return tab[key] ?? tab[`tabs.${key}`];
}

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

interface ResolvedTab {
  label: string;
  source: ProductsListSource;
  sourceValue: number[];
  needsValue: boolean;
  limit: number;
  mode: string;
  allUrl: string;
  allText: string;
}

export interface ProductTabsData {
  add_top_space?: boolean;
  title?: MultiLang;
  subtitle?: MultiLang;
  tab_shape?: unknown;
  tabs?: TabRaw[];
  show_options?: boolean;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

function tabShape(data: ProductTabsData): string {
  return pickValue(data.tab_shape) ?? 'buttons';
}

export const productTabsConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as ProductTabsData;
    const c = ['s-block--animate', 'tr-tabs', `tr-tabs--${tabShape(d)}`];
    if (d.title || d.subtitle) c.push('tr-tabs--with-head');
    if (d.add_top_space) c.push('s-block');
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

/** One tab's products (loaded the first time the tab opens). */
function TabPanel({ tab, sliderClass, autoPlay, sliderId }: {
  tab: ResolvedTab;
  sliderClass: string;
  autoPlay: boolean;
  sliderId: string;
}) {
  const svKey = tab.sourceValue.join(',');
  const loader = useCallback(
    () =>
      productApi.list({
        source: tab.source,
        sourceValue: tab.sourceValue.length ? tab.sourceValue : undefined,
        perPage: tab.limit,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab.source, svKey, tab.limit]
  );

  if (tab.needsValue && !tab.sourceValue.length) return null;

  return (
    <div className="container">
      {tab.mode === 'list' ? (
        <Suspense fallback={<ProductsListSkeleton />}>
          <SallaProductsList loader={loader} itemsClassName={sliderClass}>
            {(items: Product[]) =>
              items.slice(0, tab.limit).map((item) => <ProductCard key={item.id} product={item} />)
            }
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

      {tab.allUrl ? (
        <div className="tr-tabs__more">
          <a data-triple="home-product-tabs-view-all" className="tr-link" href={tab.allUrl}>
            <span>{tab.allText}</span>
            <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true" />
          </a>
        </div>
      ) : null}
    </div>
  );
}

export const ProductTabs = memo(function ProductTabs({ data }: { data: ProductTabsData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [active, setActive] = useState(0);
  const [opened, setOpened] = useState<Set<number>>(() => new Set([0]));

  const title = pickLang(data.title as MultiLang, lang);
  const subtitle = pickLang(data.subtitle as MultiLang, lang);
  const position = data.position ?? 0;

  const tabs: ResolvedTab[] = (data.tabs ?? [])
    .map((tab): ResolvedTab | null => {
      const type = pickValue(tabField(tab, 'type'));
      if (!type || !SOURCES[type]) return null;
      const label = pickLang(tabField(tab, 'tab_label') as MultiLang, lang);
      if (!label) return null;
      let sourceValue: number[] = [];
      if (type === 'category') {
        const id = firstId(tabField(tab, 'category'));
        sourceValue = id != null ? [id] : [];
      } else if (type === 'brand') {
        const id = firstId(tabField(tab, 'brand'));
        sourceValue = id != null ? [id] : [];
      } else if (type === 'chosen_products') {
        sourceValue = toIds(tabField(tab, 'chosen_products'));
      }
      const mode =
        type === 'most_sales' ? 'list' : pickValue(tabField(tab, 'display_mode')) ?? 'slider';
      const limit =
        type === 'chosen_products'
          ? sourceValue.length || 8
          : Number(pickValue(tabField(tab, 'limit')) ?? 8) || 8;
      const allUrl =
        tabField(tab, 'show_all_link') && tabField(tab, 'show_all_url')
          ? String(tabField(tab, 'show_all_url'))
          : '';
      const allText =
        pickLang(tabField(tab, 'show_all_text') as MultiLang, lang) ||
        t('blocks.home.display_all', 'عرض الكل');
      return {
        label,
        source: SOURCES[type],
        sourceValue,
        needsValue: ['category', 'brand', 'chosen_products'].includes(type),
        limit,
        mode,
        allUrl,
        allText,
      };
    })
    .filter((x): x is ResolvedTab => x != null);

  if (!tabs.length) return null;

  const sliderClass = `simplified-products ${themeSetting('fit_slider_products') ? 'fit-slider-products ' : ''}${
    themeSetting('enhanced_products_slider') ? 'enhanced-products-slider ' : ''
  }${
    themeSetting('enhanced_products_slider') && themeSetting('hide_products_slider_controls')
      ? 'hide_products_slider_controls'
      : ''
  }`.trim();

  const select = (i: number) => {
    setActive(i);
    setOpened((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
  };

  return (
    <>
      <div className="container">
        <div className="tr-tabs__top">
          {title || subtitle ? (
            <div className="tr-head__text tr-tabs__head anime-item">
              {title ? (
                <h2 data-triple="home-product-tabs-title" className="tr-head__title">
                  {title}
                </h2>
              ) : null}
              {subtitle ? (
                <p data-triple="home-product-tabs-subtitle" className="tr-head__subtitle">
                  {subtitle}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="tr-tabs__nav anime-item" role="tablist">
            {tabs.map((tab, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                className={`tr-tabs__tab product-tab ${active === i ? 'active' : ''}`}
                aria-selected={active === i ? 'true' : 'false'}
                tabIndex={active === i ? 0 : -1}
                onClick={() => select(i)}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {tabs.map((tab, i) => (
        <div
          key={i}
          role="tabpanel"
          className={`product-tab-content ${active === i ? 'active' : 'hidden'}`}
          data-limit={tab.limit}
        >
          {opened.has(i) ? (
            <TabPanel
              tab={tab}
              sliderClass={sliderClass}
              autoPlay={themeSetting('auto_play_products_slider')}
              sliderId={`product-tabs-slider-${position}-${i + 1}`}
            />
          ) : null}
        </div>
      ))}
    </>
  );
});
