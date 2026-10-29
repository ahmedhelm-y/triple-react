import { Suspense, memo, useCallback, useState } from 'react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { product as productApi } from '@salla.sa/twilight-theme-engine/api/product';
import { SallaProductsList, ProductsListSkeleton } from '@salla.sa/twilight-components-react';
import { ProductCard } from '../product';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * `category-tabs` home block — a banner with category tabs; tapping a tab swaps
 * the banner and shows that category's products. Port of
 * `triple_twig/src/views/components/home/category-tabs.twig` (the Twig
 * `<triple-category-tabs>` web component becomes React state here). Only the
 * active tab's products are mounted; each other tab loads the first time it
 * opens. Styling: `04-components/category-tabs.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type TabRaw = Record<string, any>;

function tabField(tab: TabRaw, key: string): unknown {
  return tab[key] ?? tab[`tabs.${key}`];
}

function categoryId(cat: unknown): number | null {
  if (cat == null) return null;
  if (Array.isArray(cat)) return cat.length ? categoryId(cat[0]) : null;
  if (typeof cat === 'object') {
    const o = cat as Record<string, unknown>;
    if (o.id != null) return Number(o.id);
    if (o.value != null) return Number(o.value);
    return null;
  }
  const n = Number(cat);
  return Number.isNaN(n) ? null : n;
}

interface ResolvedCatTab {
  title: string;
  icon?: string;
  banner?: string;
  catId: number | null;
  url: string;
}

export interface CategoryTabsData {
  tabs?: TabRaw[];
  products_limit?: number;
  sticky_tabs?: boolean;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const categoryTabsConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as CategoryTabsData;
    const c = ['s-block', 'category-tabs-block', `category-tabs-${d.position ?? 0}`];
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

/** One tab's products list (mounted the first time the tab opens). */
function CatPanel({ catId, limit }: { catId: number; limit: number }) {
  const loader = useCallback(
    () => productApi.list({ source: 'categories', sourceValue: [catId], perPage: limit }),
    [catId, limit]
  );
  return (
    <Suspense fallback={<ProductsListSkeleton />}>
      <SallaProductsList loader={loader}>
        {(items: Product[]) => items.map((item) => <ProductCard key={item.id} product={item} />)}
      </SallaProductsList>
    </Suspense>
  );
}

export const CategoryTabs = memo(function CategoryTabs({ data }: { data: CategoryTabsData }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const limit = data.products_limit ?? 8;
  const sticky = data.sticky_tabs ?? true;

  const [active, setActive] = useState(0);
  const [opened, setOpened] = useState<Set<number>>(() => new Set([0]));

  const tabs: ResolvedCatTab[] = (data.tabs ?? []).map((item): ResolvedCatTab => {
    const cat = tabField(item, 'category');
    const catObj = (Array.isArray(cat) ? cat[0] : cat) as Record<string, unknown> | undefined;
    const catId = categoryId(cat);
    const title =
      pickLang(tabField(item, 'title') as MultiLang, lang) ||
      String(catObj?.name ?? catObj?.label ?? '');
    const bannerEn = tabField(item, 'banner_en');
    const banner = (lang === 'en' && bannerEn ? bannerEn : tabField(item, 'banner')) as
      | string
      | undefined;
    const url = (catObj?.url as string) || '#';
    return { title, icon: tabField(item, 'icon') as string | undefined, banner, catId, url };
  });

  if (!tabs.length) return null;

  const activeTab = tabs[active] ?? tabs[0];

  const select = (i: number) => {
    setActive(i);
    setOpened((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
  };

  return (
    <div className="container">
      <div className={`category-tabs${sticky ? ' is-sticky' : ''}`} {...(sticky ? { 'data-sticky': '' } : {})}>
        <div className="category-tabs__area">
          <div className="category-tabs__banner">
            <a className="category-tabs__banner-link" href={activeTab.url}>
              {activeTab.banner ? (
                <img
                  className="category-tabs__banner-img"
                  src={activeTab.banner}
                  alt={activeTab.title}
                  loading="lazy"
                />
              ) : null}
            </a>
          </div>

          <div className="category-tabs__tabs">
            <div className="category-tabs__list" role="tablist">
              {tabs.map((tab, i) => (
                <button
                  key={i}
                  type="button"
                  className={`category-tabs__tab ${active === i ? 'is-active' : ''}`}
                  role="tab"
                  aria-selected={active === i ? 'true' : 'false'}
                  onClick={() => select(i)}
                >
                  {tab.icon ? (
                    <img className="category-tabs__icon" src={tab.icon} alt="" loading="lazy" />
                  ) : null}
                  <span>{tab.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="category-tabs__placeholder" hidden />

        <div className="category-tabs__content">
          {tabs.map((tab, i) => (
            <div key={i} className="category-tabs__panel" role="tabpanel" hidden={active !== i}>
              {tab.catId != null && opened.has(i) ? (
                <CatPanel catId={tab.catId} limit={limit} />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
