import { memo, useCallback, useEffect, useState } from 'react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { ProductCard } from '../product';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * `products-lookbook` home block — a row of shoppable images; each image can
 * carry a (+) point that opens the linked product's card, loaded on first open.
 * Hovering an image expands it (the active one) and closes any open card. Port
 * of `triple_twig/src/views/components/home/products-lookbook.twig` +
 * `partials/products-lookbook.js`. Styling: `products-lookbook.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type ItemRaw = Record<string, any>;

const DEFAULT_CARD = 'position-center-left';

/** A dropdown value: scalar, `{ value }`, or a one-item list of those. */
function pickValue(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) return pickValue(raw[0]);
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    return o.value != null ? String(o.value) : undefined;
  }
  return String(raw);
}

/** A product dropdown value → its numeric id (or null when none / taxonomy list). */
function productId(raw: unknown): number | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw.length ? productId(raw[0]) : null;
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (o.id != null) return Number(o.id);
    if (o.value != null) return Number(o.value);
    return null;
  }
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

interface LookItem {
  image: string;
  label: string;
  productId: number | null;
  top: number | string;
  left: number | string;
  card: string;
}

export interface ProductsLookbookData {
  title?: MultiLang;
  subtitle?: MultiLang;
  full_width?: boolean;
  mobile_slider?: boolean;
  items?: ItemRaw[];
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const productsLookbookConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as ProductsLookbookData;
    const c = ['s-block', 'products-lookbook', `products-lookbook--${d.position ?? 0}`];
    if (d.mobile_slider) c.push('mobile-slider');
    c.push('s-block--animate');
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

function buildItems(raw: ItemRaw[] | undefined, lang: string): LookItem[] {
  return (raw ?? [])
    .filter((item) => item.image)
    .map((item) => {
      const pid = item.has_product ? productId(item.product) : null;
      return {
        image: String(item.image),
        label: pickLang(item.promotion_label as MultiLang, lang),
        productId: pid,
        top: item.top != null && item.top !== '' ? item.top : 50,
        left: item.left != null && item.left !== '' ? item.left : 50,
        card: pickValue(item.card_position) || DEFAULT_CARD,
      };
    });
}

export const ProductsLookbook = memo(function ProductsLookbook({ data }: { data: ProductsLookbookData }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const title = pickLang(data.title as MultiLang, lang);
  const subtitle = pickLang(data.subtitle as MultiLang, lang);
  const mobileSlider = !!data.mobile_slider;
  const fullWidth = !!data.full_width;
  const position = data.position ?? 0;

  const items = buildItems(data.items, lang);
  const vars = { '--flex-item': items.length, '--height-item': '544px' } as React.CSSProperties;

  const [active, setActive] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [cache, setCache] = useState<Record<number, Product>>({});

  const closeAll = useCallback(() => {
    setOpenId(null);
    setPos(null);
  }, []);

  // click outside the card or the point closes the open box (mirrors the twig JS)
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const inCard = target.closest('.product-box custom-salla-product-card');
      const inPoint = target.closest('.products-lookbook__item--card__point');
      if (!inCard && !inPoint) closeAll();
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [closeAll]);

  const openPoint = useCallback(
    (pid: number, event: React.MouseEvent<HTMLElement>) => {
      if (openId === pid) {
        closeAll();
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      setPos({ top: rect.top + window.scrollY, left: rect.left + window.scrollX });
      setOpenId(pid);
      if (cache[pid]) return;
      const salla = (globalThis as any).salla;
      salla?.product
        ?.getDetails(pid, ['options', 'images', 'rating', 'brand', 'notify_availability', 'tags', 'category', 'sold_quantity'])
        .then(({ data: product }: { data: Product }) => {
          setCache((prev) => ({ ...prev, [pid]: product }));
        })
        .catch(() => {});
    },
    [openId, cache, closeAll]
  );

  if (!items.length) return null;

  const renderInner = (item: LookItem) => (
    <div className="products-lookbook__item__inner">
      <div className="products-lookbook__img">
        <img className="lazy" alt="" src={item.image} width={786} height={544} style={vars} loading="lazy" />
      </div>
      {item.label ? <h2 className="products-lookbook__label">{item.label}</h2> : null}
      {item.productId ? (
        <div className="products-lookbook__item--card" style={{ top: `${item.top}%`, left: `${item.left}%` }}>
          <div className="products-lookbook__item--card__point">
            <div className="products-lookbook__item--card__point__button">
              <salla-button
                shape="icon"
                loader-position="center"
                color="primary"
                aria-label="lookbook button"
                {...({
                  onClick: (e: React.MouseEvent<HTMLElement>) => openPoint(item.productId as number, e),
                  className: openId === item.productId ? 'active' : '',
                } as any)}
              >
                <span className="sicon-add text-lg" />
              </salla-button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {title || subtitle ? (
        <section className="products-lookbook__title home-block-title">
          <div className="container">
            {subtitle ? <div className="products-lookbook__title--subheading anime-item">{subtitle}</div> : null}
            {title ? (
              <>
                <h2 className="products-lookbook__title--mainheading anime-item">{title}</h2>
                <span className="enhanced-title-border home-block-line anime-item" />
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="products-lookbook__gallery">
        <div className={fullWidth ? '' : 'container'}>
          <div
            className={`products-lookbook__content ${mobileSlider ? ' !hidden md:!flex' : ''}`}
            style={vars}
          >
            {items.map((item, index) => (
              <div
                key={index}
                className={`products-lookbook__item ${active === index ? 'active' : ''} anime-item`}
                onMouseOver={() => {
                  if (active === index) return;
                  setActive(index);
                  closeAll();
                }}
              >
                {renderInner(item)}
              </div>
            ))}
          </div>

          {mobileSlider ? (
            <salla-slider
              show-controls="false"
              id={`lookbook-slider-${position}`}
              className="products-lookbook__slider !block md:!hidden anime-item"
            >
              <div slot="items">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className={`products-lookbook__item ${index === 0 ? 'active' : ''} swiper-slide`}
                  >
                    {renderInner(item)}
                  </div>
                ))}
              </div>
            </salla-slider>
          ) : null}
        </div>

        {/* Product cards, filled with the product the first time its (+) is pressed */}
        {items
          .filter((item) => item.productId)
          .map((item) => {
            const pid = item.productId as number;
            const isOpen = openId === pid;
            return (
              <div
                key={pid}
                id={`lookbook-${pid}`}
                className={`product-box ${item.card} ${isOpen ? 'active' : ''}`}
                data-product-id={pid}
                style={isOpen && pos ? { top: `${pos.top}px`, left: `${pos.left}px` } : undefined}
              >
                <div className="close-lookbook" onClick={(e) => { e.stopPropagation(); closeAll(); }} />
                {cache[pid] ? <ProductCard product={cache[pid]} lookbook /> : null}
              </div>
            );
          })}
      </section>
    </>
  );
});
