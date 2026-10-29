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
 * `special-products-slider` home block (Triple's "showcase", `.tr-showcase`) — a
 * rounded poster card (media background + title/description/button) beside a
 * products slider. Port of
 * `triple_twig/src/views/components/home/special-products-slider.twig`.
 * Products come from a manual selection or a Salla source; best sellers (`sales`)
 * render as a list. Styling: `04-components/special-products.scss`.
 */

const SOURCES: Record<string, ProductsListSource> = {
  category: 'categories',
  brand: 'brands',
  most_sales: 'sales',
  latest_products: 'latest',
  offers: 'offers',
  top_rated_products: 'top-rated',
};

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

/* eslint-disable @typescript-eslint/no-explicit-any */
function themeSetting(key: string): boolean {
  const s = (globalThis as unknown as { salla?: any }).salla;
  try {
    return !!s?.config?.get?.(`theme.settings.${key}`);
  } catch {
    return false;
  }
}

export interface SpecialProductsSliderData {
  add_top_space?: boolean;
  reverse_content_prosition?: boolean;
  mobile_auto_height?: boolean;
  bg_color?: string;
  text_color?: string;
  is_video?: boolean;
  video_url?: string;
  image?: string;
  has_overlay?: boolean;
  has_light_overlay?: boolean;
  overlay_opacity?: number;
  title?: MultiLang;
  desc?: MultiLang;
  button_text?: MultiLang;
  btn_bg?: string;
  btn_color?: string;
  outlined_btn?: boolean;
  button_url?: string;
  use_dynamic_source?: boolean;
  products?: unknown;
  type?: unknown;
  category?: unknown;
  brand?: unknown;
  limit?: unknown;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const specialProductsSliderConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as SpecialProductsSliderData;
    const hasMedia = (d.is_video && d.video_url) || (!d.is_video && d.image);
    const c: string[] = [];
    if (d.add_top_space) c.push('s-block');
    c.push('tr-showcase', `tr-showcase--${d.position ?? 0}`);
    if (d.reverse_content_prosition) c.push('tr-showcase--reverse');
    if (d.mobile_auto_height) c.push('tr-showcase--auto');
    if (hasMedia) c.push('tr-showcase--has-media');
    c.push('s-block--animate');
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

export const SpecialProductsSlider = memo(function SpecialProductsSlider({
  data,
}: {
  data: SpecialProductsSliderData;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const title = pickLang(data.title as MultiLang, lang);
  const desc = pickLang(data.desc as MultiLang, lang);
  const btnText = pickLang(data.button_text as MultiLang, lang);
  const hasVideo = !!(data.is_video && data.video_url);
  const image = !data.is_video ? data.image : undefined;
  const textColor = data.text_color || '#ffffff';
  const btnBg = data.btn_bg || '#111111';
  const btnColor = data.btn_color || '#ffffff';
  const position = data.position ?? 0;

  let source: ProductsListSource;
  let sourceValue: number[] = [];
  let limit = 8;
  if (data.use_dynamic_source) {
    const type = pickValue(data.type) ?? 'latest_products';
    limit = Number(pickValue(data.limit) ?? 8) || 8;
    source = SOURCES[type] ?? 'latest';
    const picked = type === 'category' ? data.category : type === 'brand' ? data.brand : null;
    const id = firstId(picked);
    sourceValue = id != null ? [id] : [];
  } else {
    source = 'selected';
    sourceValue = toIds(data.products);
    limit = sourceValue.length || 8;
  }
  if (['categories', 'brands', 'selected'].includes(source) && !sourceValue.length) {
    source = 'latest';
    limit = limit || 8;
  }

  const svKey = sourceValue.join(',');
  const loader = useCallback(
    () =>
      productApi.list({
        source,
        sourceValue: sourceValue.length ? sourceValue : undefined,
        perPage: limit,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, svKey, limit]
  );

  const overlayClass = data.has_overlay
    ? `has-overlay--before has-overlay--opacity-option has-overlay--opacity-${
        (data.overlay_opacity ?? 7) * 10
      }${data.has_light_overlay ? ' has-overlay--light' : ''}`
    : '';

  const fitSlider = themeSetting('fit_slider_products');
  const autoPlay = themeSetting('auto_play_products_slider');
  const sliderClass = `simplified-products${fitSlider ? ' fit-slider-products' : ''}`;

  return (
    <div className="container">
      <div className="tr-showcase__grid">
        <div
          className={`tr-showcase__poster anime-item ${overlayClass}`.trim()}
          style={{ backgroundColor: data.bg_color || '#0D0C0C', color: textColor }}
        >
          {hasVideo ? (
            <video
              data-triple="home-special-products-slider-video"
              playsInline
              className="tr-showcase__media"
              loop
              muted
              preload="none"
              autoPlay
              src={data.video_url}
            />
          ) : image ? (
            <img
              data-triple="home-special-products-slider-image"
              className="tr-showcase__media"
              src={image}
              alt={title || ''}
            />
          ) : null}
          <div className="tr-showcase__caption">
            {title ? (
              <h2 data-triple="home-special-products-slider-title" className="tr-showcase__title">
                {title}
              </h2>
            ) : null}
            {desc ? <p className="tr-showcase__desc">{desc}</p> : null}
            {btnText ? (
              <a
                className={`tr-showcase__btn ${data.outlined_btn ? 'is-outlined' : ''}`.trim()}
                href={data.button_url || '#'}
                style={{ ['--btnBg' as string]: btnBg, ['--btnColor' as string]: btnColor }}
              >
                <span>{btnText}</span>
                <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>

        <div className="tr-showcase__products anime-item">
          {source === 'sales' ? (
            <Suspense fallback={<ProductsListSkeleton />}>
              <SallaProductsList loader={loader} itemsClassName={`vertical-products ${sliderClass}`}>
                {(items: Product[]) =>
                  items.slice(0, limit).map((item) => <ProductCard key={item.id} product={item} />)
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
                sliderProps={{ id: `slider-with-bg-${position}` }}
                blockTitle=" "
              >
                {(item: Product) => <ProductCard product={item} />}
              </SallaProductsSlider>
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
});
