import { memo, useEffect, useMemo, useState } from 'react';
import { Money } from '../common/Money';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';
import { useNearViewport, fetchProducts, productPrices } from '../../lib/tripleProducts';

/**
 * `pack-product` home block — one featured product sold in packs. The main
 * product's name/image/links come with the block; each pack card is its own
 * Salla product (price fetched together in one request when the block nears the
 * screen). Selecting a pack drives the price and the add-to-cart / buy-now
 * actions. Port of `triple_twig/src/views/components/home/pack-product.twig` +
 * `partials/pack-product.js`. Styling: `pack-product.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type ItemRaw = Record<string, any>;
type AnyProduct = Record<string, any>;

function unwrap(raw: unknown): Record<string, any> | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) return raw.length ? unwrap(raw[0]) : undefined;
  if (typeof raw === 'object') return raw as Record<string, any>;
  return { value: raw };
}

function idOf(raw: unknown): string {
  const o = unwrap(raw);
  if (!o) return '';
  if (o.id != null && o.id !== '') return String(o.id);
  if (o.value != null && o.value !== '') return String(o.value);
  return '';
}

interface PackSetting {
  product_id: string;
  badge: string;
  badge_color?: string;
  badge_bg_color?: string;
  top_line: string;
  top_line_color?: string;
  sub_line: string;
  sub_line_color?: string;
  promo: string;
  promo_color?: string;
  footer: string;
  footer_color?: string;
  image?: string;
  featured: boolean;
  highlight: boolean;
}

export interface PackProductData {
  product?: unknown;
  packs?: ItemRaw[];
  sold_count?: string;
  reviews_count?: string;
  shipping_text?: MultiLang;
  primary_color?: string;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const packProductConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as PackProductData;
    const c = ['s-block', 'pack-product-block', `pack-product-${d.position ?? 0}`];
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

function stripTags(html: string): string {
  if (!html) return '';
  if (typeof window !== 'undefined' && window.DOMParser) {
    const text = new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
    return text.replace(/\s+/g, ' ').trim();
  }
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export const PackProduct = memo(function PackProduct({ data }: { data: PackProductData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const salla = (globalThis as any).salla;

  const main = unwrap(data.product);
  const productId = idOf(data.product);
  const name = (main?.name as string) || '';
  const url = (main?.url as string) || '#';
  const image =
    (main?.image?.url as string) || salla?.url?.asset?.('images/placeholder.png') || 'images/placeholder.png';
  const description = useMemo(() => stripTags((main?.description as string) || ''), [main?.description]);

  const settings: PackSetting[] = (data.packs ?? [])
    .map((item) => ({
      product_id: idOf(item.product),
      badge: pickLang(item.badge as MultiLang, lang),
      badge_color: item.badge_color,
      badge_bg_color: item.badge_bg_color,
      top_line: pickLang(item.top_line as MultiLang, lang),
      top_line_color: item.top_line_color,
      sub_line: pickLang(item.sub_line as MultiLang, lang),
      sub_line_color: item.sub_line_color,
      promo: pickLang(item.promo as MultiLang, lang),
      promo_color: item.promo_color,
      footer: pickLang(item.footer as MultiLang, lang),
      footer_color: item.footer_color,
      image: item.image,
      featured: !!item.featured,
      highlight: !!item.highlight,
    }))
    .filter((p) => p.product_id);

  const shippingLines = pickLang(data.shipping_text as MultiLang, lang)
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const sold = (data.sold_count ?? '').toString().trim();
  const reviews = (data.reviews_count ?? '').toString().trim();

  const [rootRef, near] = useNearViewport<HTMLDivElement>();
  const [byId, setById] = useState<Map<string, AnyProduct>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<number>(-1);
  const [qty, setQty] = useState(1);
  const [atcLoading, setAtcLoading] = useState<'add' | 'buy' | null>(null);

  const ids = useMemo(
    () => [...new Set([productId, ...settings.map((p) => p.product_id)].filter(Boolean))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productId, settings.map((p) => p.product_id).join(',')]
  );

  useEffect(() => {
    if (!near || loaded) return;
    let alive = true;
    const run = () =>
      fetchProducts(ids).then((map) => {
        if (!alive) return;
        setById(map);
        setLoaded(true);
      });
    (salla?.onReady ? salla.onReady().then(run) : run());
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, ids.join(',')]);

  // resolved pack cards (a pack whose product is hidden/deleted has no card)
  const packs = useMemo(
    () =>
      settings
        .map((s) => ({ ...s, product: byId.get(s.product_id) }))
        .filter((p): p is PackSetting & { product: AnyProduct } => !!p.product)
        .map((p) => ({ ...p, ...productPrices(p.product), img: p.image || p.product.image?.url || '' })),
    [settings, byId]
  );

  // select the featured pack (or the first) once loaded
  useEffect(() => {
    if (!loaded || !packs.length) return;
    const featured = packs.findIndex((p) => p.featured);
    setActive(featured >= 0 ? featured : 0);
    setQty(1);
  }, [loaded, packs]);

  const mainProduct = byId.get(productId);
  const current = active >= 0 ? packs[active] : null;
  const maxQty = Number((current?.product.max_quantity ?? mainProduct?.max_quantity) || 100) || 100;

  // the price row follows the selected pack, or the main product when no packs
  const priceSource = current || (mainProduct ? { ...productPrices(mainProduct) } : null);
  const onSale = !!priceSource && !!priceSource.compare && priceSource.compare > priceSource.price;
  const discountPct =
    onSale && priceSource && priceSource.compare
      ? Math.round(((priceSource.compare - priceSource.price) / priceSource.compare) * 100)
      : 0;

  const clamp = (v: number) => Math.min(maxQty, Math.max(1, Number(v) || 1));

  const addToCart = (checkout: boolean) => {
    const id = current?.product.id || productId;
    if (!id || atcLoading) return;
    setAtcLoading(checkout ? 'buy' : 'add');
    (salla?.cart?.addItem?.({ id, quantity: qty, endpoint: 'quickAdd' }) ?? Promise.resolve())
      .then(() => (checkout ? salla?.cart?.submit?.() : undefined))
      .catch(() => {})
      .finally(() => setAtcLoading(null));
  };

  const colorStyle = (...pairs: [string, string | undefined][]): React.CSSProperties | undefined => {
    const style: Record<string, string> = {};
    for (const [prop, value] of pairs) if (value) style[prop] = value;
    return Object.keys(style).length ? (style as React.CSSProperties) : undefined;
  };

  if (!productId) return null;

  const rootStyle = { '--pack-primary': data.primary_color || '#042b6e' } as React.CSSProperties;

  return (
    <div
      className={`pack-product${loaded ? ' is-loaded' : ''}`}
      ref={rootRef}
      style={rootStyle}
    >
      <div className="pack-product__wide">
        <div className="pack-product__preview">
          <div className="pack-product__media">
            <a className="pack-product__media-link" href={url} aria-label={name}>
              <figure className="pack-product__figure">
                <img className="pack-product__img" src={image} width={500} height={500} loading="lazy" decoding="async" alt={name} />
              </figure>
            </a>
          </div>

          <div className="pack-product__content">
            <h2 className="pack-product__title">{name}</h2>

            <div className="pack-product__price-row">
              <div className="pack-product__prices">
                <span className="pack-product__compare" hidden={!onSale}>
                  {onSale && priceSource?.compare ? <Money amount={priceSource.compare} /> : ''}
                </span>
                <span className={`pack-product__sale${onSale ? '' : ' pack-product__sale--plain'}`}>
                  {priceSource ? <Money amount={priceSource.price} /> : ''}
                </span>
                <span className="pack-product__badge" hidden={!onSale}>
                  {onSale ? `${discountPct}% ${t('blocks.home.pack_discount', 'خصم')}`.trim() : ''}
                </span>
              </div>
            </div>

            {reviews ? (
              <div className="pack-product__rating">
                <span className="pack-product__stars" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg className="pack-product__star" width="20" height="20" viewBox="0 0 30 32" focusable="false" key={i}>
                      <path fill="#fbbf24" d="M29.714 11.839c0 .321-.232.625-.464.857l-6.482 6.321 1.536 8.929c.018.125.018.232.018.357 0 .464-.214.893-.732.893-.25 0-.5-.089-.714-.214l-8.018-4.214-8.018 4.214c-.232.125-.464.214-.714.214-.518 0-.75-.429-.75-.893 0-.125.018-.232.036-.357l1.536-8.929-6.5-6.321c-.214-.232-.446-.536-.446-.857 0-.536.554-.75 1-.821l8.964-1.304 4.018-8.125c.161-.339.464-.732.875-.732s.714.393.875.732l4.018 8.125 8.964 1.304c.429.071 1 .286 1 .821z" />
                    </svg>
                  ))}
                </span>
                <span className="pack-product__rating-count">
                  ({reviews} {t('blocks.home.pack_reviews', 'تقييم')})
                </span>
              </div>
            ) : null}

            {sold ? (
              <div className="pack-product__sold">
                <span className="pack-product__sold-icon" aria-hidden="true">
                  <svg className="pack-product__blinker" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 511.269 511.269" width="20" height="20">
                    <path fill="#f3705a" d="M140.367,465.067C116.9,438.4,93.434,410.667,78.5,377.6c-14.933-35.2-19.2-75.733-11.733-114.133s24.533-74.667,49.067-105.6c-2.133,26.667,7.467,54.4,25.6,74.667c-10.667-51.2,6.4-106.667,40.533-147.2S263.034,18.133,312.1,0c-24.533,25.6-27.733,66.133-18.133,100.267c9.6,34.133,29.867,64,48,94.933c18.133,30.933,35.2,62.933,36.267,98.133c9.6-18.133,20.267-36.267,26.667-56.533c6.4-20.267,9.6-41.6,4.267-61.867c19.2,23.467,29.867,46.933,35.2,76.8c5.333,29.867,4.267,60.8,1.067,90.667c-4.267,33.067-12.8,67.2-30.933,94.933c-21.333,33.067-55.467,56.533-92.8,69.333C255.567,518.4,190.5,508.8,140.367,465.067z" />
                    <path fill="#ffd15c" d="M221.434,504.533C308.9,538.667,395.3,435.2,347.3,355.2c0-1.067-1.067-1.067-1.067-2.133c4.267,43.733-6.4,75.733-26.667,93.867c10.667-25.6,3.2-55.467-9.6-81.067c-12.8-24.533-30.933-46.933-44.8-70.4c-13.867-24.533-24.533-52.267-18.133-80c-25.6,19.2-43.733,48-51.2,78.933c-7.467,30.933-3.2,65.067,10.667,93.867c-16-11.733-27.733-30.933-28.8-51.2c-17.067,20.267-27.733,46.933-26.667,73.6C151.034,452.267,184.1,489.6,221.434,504.533z" />
                  </svg>
                </span>
                <span>{t('blocks.home.pack_bought', 'تم شراؤه')}</span>
                <strong className="pack-product__sold-num">{sold}</strong>
                <span>{t('blocks.home.pack_times', 'مرة')}</span>
              </div>
            ) : null}

            <div className="pack-product__desc" hidden={!description}>
              <h3 className="pack-product__desc-label">{t('blocks.home.pack_description', 'الوصف')}</h3>
              <p className="pack-product__desc-text">{description}</p>
            </div>

            <div className="pack-product__actions pack-product__actions--before">
              <div className="pack-product__qty">
                <button
                  type="button"
                  className="pack-product__qty-btn"
                  aria-label={t('blocks.home.pack_qty_decrease', 'إنقاص')}
                  onClick={() => setQty((q) => clamp(q - 1))}
                >
                  −
                </button>
                <input
                  className="pack-product__qty-input"
                  type="number"
                  min={1}
                  max={maxQty}
                  value={qty}
                  inputMode="numeric"
                  aria-label={t('blocks.home.pack_quantity', 'الكمية')}
                  onChange={(e) => setQty(clamp(Number(e.target.value)))}
                />
                <button
                  type="button"
                  className="pack-product__qty-btn"
                  aria-label={t('blocks.home.pack_qty_increase', 'زيادة')}
                  onClick={() => setQty((q) => clamp(q + 1))}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className={`pack-product__btn pack-product__btn--solid${atcLoading === 'add' ? ' is-atc-loading' : ''}`}
                onClick={() => addToCart(false)}
              >
                <span className="pack-product__spinner" aria-hidden="true" />
                <span>{t('pages.cart.add_to_cart', 'أضف للسلة')}</span>
              </button>
            </div>

            <div className="pack-product__actions pack-product__actions--after">
              <button
                type="button"
                className={`pack-product__btn pack-product__btn--outline${atcLoading === 'buy' ? ' is-atc-loading' : ''}`}
                onClick={() => addToCart(true)}
              >
                <span className="pack-product__spinner" aria-hidden="true" />
                <span>{t('blocks.home.pack_buy_now', 'اشترِ الآن')}</span>
              </button>
              <a className="pack-product__btn pack-product__btn--outline" href={url}>
                {t('blocks.home.pack_view_details', 'عرض التفاصيل')}
              </a>
            </div>

            <div
              className="pack-product__packs"
              role="listbox"
              aria-label={t('blocks.home.pack_options', 'الباقات')}
              hidden={!packs.length}
            >
              {packs.map((pack, index) => {
                const top = pack.top_line || pack.sub_line || pack.promo;
                return (
                  <button
                    type="button"
                    className={`pack-card${pack.highlight ? ' is-highlight' : ''}${active === index ? ' is-active' : ''}`}
                    role="option"
                    aria-selected={active === index ? 'true' : 'false'}
                    data-index={index}
                    key={index}
                    onClick={() => {
                      setActive(index);
                      setQty(1);
                    }}
                  >
                    {pack.badge ? (
                      <span className="pack-card__badge" style={colorStyle(['color', pack.badge_color], ['background', pack.badge_bg_color])}>
                        {pack.badge}
                      </span>
                    ) : null}
                    {top ? (
                      <span className="pack-card__top">
                        {pack.top_line ? (
                          <span className="pack-card__top-line" style={colorStyle(['color', pack.top_line_color])}>
                            {pack.top_line}
                          </span>
                        ) : null}
                        {pack.sub_line ? (
                          <span className="pack-card__sub-line" style={colorStyle(['color', pack.sub_line_color])}>
                            {pack.sub_line}
                          </span>
                        ) : null}
                        {pack.promo ? (
                          <span className="pack-card__promo" style={colorStyle(['color', pack.promo_color])}>
                            {pack.promo}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                    <span className="pack-card__media">
                      {pack.img ? (
                        <img className="pack-card__img" src={pack.img} width={209} height={209} loading="lazy" decoding="async" alt={pack.product.name} />
                      ) : null}
                    </span>
                    <span className="pack-card__prices">
                      <span className="pack-card__price"><Money amount={pack.price} /></span>
                      {pack.compare && pack.compare > pack.price ? (
                        <span className="pack-card__compare"><Money amount={pack.compare} /></span>
                      ) : null}
                    </span>
                    {pack.footer ? (
                      <span className="pack-card__footer" style={colorStyle(['color', pack.footer_color])}>
                        {pack.footer}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {shippingLines.length ? (
              <div className="pack-product__shipping">
                {shippingLines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});
