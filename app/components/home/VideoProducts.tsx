import { Suspense, memo, useCallback, useMemo } from 'react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { product as productApi } from '@salla.sa/twilight-theme-engine/api/product';
import {
  SallaProductsList,
  ProductsListSkeleton,
  SallaProductsSlider,
  ProductsSliderSkeleton,
} from '@salla.sa/twilight-components-react';
import { ProductCard } from '../product';
import { pickLang, resolveOption, asUrl, collectionField, type MultiLang } from '../../lib/homeBlockData';
import {
  VideoProductsProvider,
  toVideoItems,
  type VideoAspect,
} from '../../lib/videoProducts';

/**
 * `video-products` home block (Triple's video reels shelf, `.tr-reels`) — a list
 * or slider of chosen products where each card plays its configured clip instead
 * of the product image, and tapping it opens a full-screen vertical reels feed.
 * Port of `triple_twig/src/views/components/home/video-products.twig` +
 * the video feature in `js/triple/product-card.js` (see `lib/videoProducts.tsx`).
 *
 * The real product cards come from Salla's list/slider (price, options, add to
 * cart); {@link VideoProductsProvider} hands each card its clip and the shared
 * reels opener — the React replacement for the Twig `data-product-videos`
 * section attribute the card used to read. Styling: `04-components/video-products.scss`
 * (`.tr-reels`) + `04-components/video-popup.scss` (the feed) + the card's own
 * `.product-card__video*` rules in `triple-card-base.scss`.
 *
 * `show_options` only drove the khadamaty card (via `partials/card-options.js`);
 * Triple's card renders options itself from the store setting, so it is a no-op here.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type ItemRaw = Record<string, any>;

function productId(raw: unknown): string {
  if (raw == null) return '';
  if (Array.isArray(raw)) return raw.length ? productId(raw[0]) : '';
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (o.id != null && o.id !== '') return String(o.id);
    if (o.value != null && o.value !== '') return String(o.value);
    return '';
  }
  return String(raw);
}

function themeSetting(key: string): boolean {
  try {
    return !!(globalThis as any).salla?.config?.get?.(`theme.settings.${key}`);
  } catch {
    return false;
  }
}

export interface VideoProductsData {
  add_top_space?: boolean;
  title?: MultiLang;
  subtitle?: MultiLang;
  display_mode?: unknown;
  items?: ItemRaw[];
  autoplay_in_view?: boolean;
  video_aspect_ratio?: unknown;
  badge_position?: unknown;
  product_on_video?: boolean;
  show_options?: boolean;
  show_all_link?: boolean;
  show_all_text?: MultiLang;
  show_all_url?: unknown;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const videoProductsConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as VideoProductsData;
    const c = ['s-block--animate', 's-block--video-products', 'tr-reels', `tr-reels--${d.position ?? 0}`, 'container'];
    if (d.add_top_space) c.push('s-block');
    if (d.product_on_video) c.push('s-block--video-products--product-on-video');
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

export const VideoProducts = memo(function VideoProducts({ data }: { data: VideoProductsData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const title = pickLang(data.title as MultiLang, lang);
  const subtitle = pickLang(data.subtitle as MultiLang, lang);
  const showAllText = pickLang(data.show_all_text as MultiLang, lang);
  const displayMode = resolveOption(data.display_mode, ['list', 'slider'] as const, 'list');
  const aspect: VideoAspect = resolveOption(
    data.video_aspect_ratio,
    ['vertical', 'square', 'horizontal'] as const,
    'vertical'
  );
  const badgePosition = resolveOption(data.badge_position, ['left', 'right'] as const, 'left');
  const autoplayInView = !!data.autoplay_in_view;
  const productOnVideo = !!data.product_on_video;
  const position = data.position ?? 0;
  const showAllUrl = data.show_all_link ? asUrl(data.show_all_url) : '';

  // [{ id, url, badge }] from the collection, in order, keeping only complete rows.
  const videos = useMemo(() => {
    const rows = (Array.isArray(data.items) ? data.items : []).map((item) => ({
      id: productId(collectionField(item, 'items', 'product')),
      url: collectionField(item, 'items', 'video_url'),
      badge: pickLang(collectionField(item, 'items', 'badge_text') as MultiLang, lang),
    }));
    return toVideoItems(rows);
  }, [data.items, lang]);

  const ids = useMemo(() => videos.map((v) => Number(v.id)).filter((n) => Number.isFinite(n) && n > 0), [videos]);
  const idsKey = ids.join(',');

  const loader = useCallback(
    () => productApi.list({ source: 'selected', sourceValue: ids, perPage: ids.length || 1 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idsKey]
  );

  if (!ids.length) return null;

  const fitSlider = themeSetting('fit_slider_products');
  const autoPlaySlider = themeSetting('auto_play_products_slider');
  const listClass = `vertical-products simplified-products${fitSlider ? ' fit-slider-products' : ''}`;
  const sliderClass = `simplified-products${fitSlider ? ' fit-slider-products' : ''}`;

  return (
    <VideoProductsProvider
      items={videos}
      aspect={aspect}
      badgePosition={badgePosition}
      autoplayInView={autoplayInView}
      productOnVideo={productOnVideo}
    >
      <div className="tr-reels__panel" data-video-aspect={aspect}>
        {title || subtitle || showAllUrl ? (
          <div className="tr-head">
            {title || subtitle ? (
              <div className="tr-head__text anime-item">
                {title ? (
                  <h2 data-triple="home-products-videos-title" className="tr-head__title">
                    {title}
                  </h2>
                ) : null}
                {subtitle ? (
                  <p data-triple="home-products-videos-subtitle" className="tr-head__subtitle">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            ) : null}
            {showAllUrl ? (
              <div className="tr-head__action anime-item">
                <a className="tr-link" href={showAllUrl}>
                  <span>{showAllText || t('blocks.home.display_all', 'عرض الكل')}</span>
                  <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true" />
                </a>
              </div>
            ) : null}
          </div>
        ) : null}

        {displayMode === 'slider' ? (
          <Suspense fallback={<ProductsSliderSkeleton />}>
            <SallaProductsSlider
              loader={loader}
              className={sliderClass}
              autoplay={autoPlaySlider}
              sliderConfig={{
                freeMode: { enabled: true, sticky: false },
                mousewheel: { enabled: true, forceToAxis: true },
                createElements: true,
                scrollbar: { auto: true, draggable: true },
              }}
              sliderProps={{ id: `video-products-${position}` }}
              blockTitle=" "
            >
              {(item: Product) => <ProductCard product={item} />}
            </SallaProductsSlider>
          </Suspense>
        ) : (
          <Suspense fallback={<ProductsListSkeleton />}>
            <SallaProductsList loader={loader} itemsClassName={listClass}>
              {(items: Product[]) => items.map((item) => <ProductCard key={item.id} product={item} />)}
            </SallaProductsList>
          </Suspense>
        )}
      </div>
    </VideoProductsProvider>
  );
});
