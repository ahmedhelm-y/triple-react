import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useWishlist } from '@salla.sa/twilight-theme-engine/hooks/useWishlist';
import { Money } from '../common/Money';

/**
 * Triple's product-card quick view — a React port of `_renderQuickviewModal`
 * from `triple_twig/src/assets/js/triple/product-card.js`.
 *
 * The Twig card kept one `#quickview` element and rewrote its innerHTML on each
 * open; here every card renders this component only while its own quick view is
 * open (`TripleProductCard` holds the id in state). Product detail is fetched
 * with `salla.product.getDetails` exactly as before, and the body is built from
 * the live storefront components (`salla-slider`, `salla-product-options`,
 * `salla-add-product-button`, `salla-quantity-input`, …) so the ported quick
 * view SCSS in `04-components/triple-card.scss` styles it verbatim.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function sallaSdk(): any {
  return (globalThis as unknown as { salla?: any }).salla;
}

function money(v: number | string | null | undefined): string {
  const s = sallaSdk();
  if (s?.money) return s.money(v || 0);
  return String(v ?? '');
}

/** Port of the Twig card's `parseDate`: a discount-end date → "YYYY/MM/DD". */
function parseDate(input: string | number): string {
  let d: Date;
  if (typeof input === 'string' && input.includes('-')) {
    const parts = input.split('-');
    d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else {
    d = new Date(Number(input) * 1000 - 86400000);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

export interface TripleQuickViewProps {
  productId: number;
  onClose: () => void;
}

export function TripleQuickView({ productId, onClose }: TripleQuickViewProps) {
  const [p, setP] = useState<any | null>(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const closingRef = useRef(false);

  // Fetch detail (same `with[]` list as the Twig quick view).
  useEffect(() => {
    const s = sallaSdk();
    if (!s?.product?.getDetails) {
      setFailed(true);
      return;
    }
    let alive = true;
    s.product
      .getDetails(productId, [
        'options',
        'images',
        'rating',
        'brand',
        'notify_availability',
        'tags',
        'category',
        'sold_quantity',
      ])
      .then((res: { data: any }) => {
        if (alive) setP(res.data);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [productId]);

  // Enter transition + lock the page; unlock on unmount.
  useEffect(() => {
    const root = document.documentElement;
    const raf = requestAnimationFrame(() => setVisible(true));
    const t1 = window.setTimeout(() => setContentVisible(true), 50);
    const t2 = window.setTimeout(() => root.classList.add('quickview-opened'), 300);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      root.classList.remove('quickview-opened');
    };
  }, []);

  useEffect(() => {
    if (failed) onClose();
  }, [failed, onClose]);

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setContentVisible(false);
    document.documentElement.classList.remove('quickview-opened');
    window.setTimeout(onClose, 400);
  };

  if (typeof document === 'undefined') return null;

  const containerClass = `quickview${visible ? ' show' : ''}${contentVisible ? ' show-content transition' : ''}`;

  const body = (
    <div
      className={containerClass}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="quickview__overlay" onClick={close} />
      {!p ? (
        <div className="quickview__content circle">
          <button type="button" className="quickview__btn-close" onClick={close} />
          <div className="quick-view__loading" style={{ padding: 40, textAlign: 'center' }}>
            <salla-loading />
          </div>
        </div>
      ) : (
        <QuickViewContent p={p} onClose={close} />
      )}
    </div>
  );

  return createPortal(body, document.body);
}

/* --------------------------------------------------------------- the content */

function QuickViewContent({ p, onClose }: { p: any; onClose: () => void }) {
  const { t } = useTranslation();
  const wishlist = useWishlist();
  const images: any[] = Array.isArray(p.images) && p.images.length ? p.images : p.image ? [p.image] : [];
  const inWishlist = wishlist.has(Number(p.id));
  const description: string = p.description ? String(p.description).replace(/(<([^>]+)>)/gi, '') : '';

  const addLabel = (() => {
    if (p.has_preorder_campaign) return t('pages.products.pre_order_now', 'اطلب مسبقًا');
    if (p.status === 'sale' && p.type === 'booking') return t('pages.cart.book_now', 'احجز الآن');
    if (p.status === 'sale') return t('pages.cart.add_to_cart', 'أضف إلى السلة');
    if (p.type !== 'donating') return t('pages.products.out_of_stock', 'نفذت الكمية');
    return t('pages.products.donation_exceed', 'تم بلوغ المبلغ المطلوب');
  })();

  const notify = p.notify_availability;
  const notifyAttrs: Record<string, unknown> = notify
    ? {
        ...(notify.subscribed ? { 'is-subscribed': true } : {}),
        channels: (notify.channels || []).join(','),
        ...(notify.options ? { 'notify-options-availability': true } : {}),
      }
    : {};

  return (
    <div className="quickview__content circle">
      <button type="button" className="quickview__btn-close" onClick={onClose} />
      <div>
        <div className="product-quickview">
          <div className="row flex">
            {/* -------- images -------- */}
            <div className="img-quickview">
              <div className="product-quickview__images">
                <div className="quickview-images">
                  <salla-slider
                    {...({
                      id: `quickview-slider-${p.id}`,
                      loop: 'false',
                      'show-controls': images.length > 1 ? 'true' : 'false',
                      'auto-height': 'false',
                    } as any)}
                  >
                    {p.promotion_title ? (
                      <span
                        className="absolute top-4 left-4 z-[3] font-bold px-2.5 py-1.5 md:py-2 text-xs text-white max-w-[calc(100%-60px)]"
                        style={{ backgroundColor: 'var(--product-promo-bg, #ef4444)' }}
                      >
                        {p.promotion_title}
                      </span>
                    ) : null}
                    <div slot="items">
                      {images.map((img, i) => (
                        <div className="swiper-slide quickview-images__item" key={img.id ?? i}>
                          <a
                            data-fslightbox={`product_${p.id}`}
                            data-img-id={img.id}
                            data-slid-index={i}
                            data-caption={img.alt}
                            href={img.video_url || img.url}
                            aria-label={p.name}
                          >
                            <img
                              src={img.url}
                              alt={img.alt}
                              style={{ objectFit: 'cover' }}
                              className="h-full w-full"
                              loading={i === 0 ? 'eager' : 'lazy'}
                            />
                          </a>
                        </div>
                      ))}
                    </div>
                  </salla-slider>
                </div>
              </div>
            </div>

            {/* -------- info -------- */}
            <div className="quickview-single-info">
              <div className="content_product_detail">
                <div className="quickview__header flex justify-between">
                  {p.brand ? (
                    <a className="quickview-brand" href={p.brand.url} title={p.brand.name}>
                      <img src={p.brand.logo} title={p.brand.name} alt={p.brand.name} />
                    </a>
                  ) : null}
                  <div className="quickview-actions rtl:mr-auto ltr:ml-auto">
                    <salla-button
                      className={`btn--wishlist ${inWishlist ? 'is-added pulse-anime' : 'not-added un-favorited'}`}
                      data-id={p.id}
                      shape="icon"
                      fill="outline"
                      color="light"
                      {...({ 'loader-position': 'center' } as any)}
                      onClick={() => wishlist.toggle(Number(p.id))}
                    >
                      <i className="sicon-heart" />
                    </salla-button>
                    <salla-social-share {...({ url: p.url, 'url-name': p.name } as any)} />
                  </div>
                </div>

                <a href={p.url} className="hover:text-primary text-store-text-primary">
                  <h2 className="product-quickview_title">{p.name}</h2>
                </a>
                {p.subtitle ? (
                  <h3 className="product-quickview_sub-title text-store-text-secondary">{p.subtitle}</h3>
                ) : null}
                {p.is_taxable ? (
                  <small className="product-quickview__taxable text-store-text-secondary">
                    {t('pages.products.tax_included', 'شامل الضريبة')}
                  </small>
                ) : null}

                <div className="product-quickview__price">
                  <div className="price-container">
                    {p.is_on_sale ? (
                      <div className="rtl:space-x-reverse space-x-1">
                        <p className="sale-price text-red-400 font-bold text-lg inline-block">
                          <Money amount={p.sale_price} />
                        </p>
                        <span className="regular-price text-lg text-store-text-secondary line-through">
                          <Money amount={p.regular_price} />
                        </span>
                      </div>
                    ) : p.starting_price ? (
                      <>
                        <span className="starting-price-title font-bold text-store-text-secondary">
                          {t('pages.products.starting_price', 'يبدأ من')}
                        </span>
                        <p className="text-red-400 font-bold text-lg inline-block">
                          <Money amount={p.starting_price} />
                        </p>
                      </>
                    ) : (
                      <p className="total-price text-store-text-secondary font-bold text-lg">
                        <Money amount={p.price} />
                      </p>
                    )}
                  </div>
                </div>

                {/* stats: inventory / sold / remained */}
                <div className="quickview__stats flex flex-col space-y-5 mb-5">
                  <div className="inventory-content flex-grow shrink-0">
                    <div id="variant-inventory" className={p.is_out_of_stock ? 'out_stock' : ''}>
                      <i className={`${p.is_out_of_stock ? 'sicon-cancel-circle' : 'sicon-check-circle'} rtl:ml-1.5 ltr:mr-1.5`} />
                      {p.is_out_of_stock ? t('pages.products.out_of_stock', 'نفذت الكمية') : t('blocks.triple.in_stock', 'متوفر')}
                    </div>
                  </div>
                  {p.sold_quantity ? (
                    <div className="flex text-[#f11e1e] flex-grow shrink-0">
                      <span className="product-count-sale rtl:ml-1.5 ltr:mr-1.5">
                        <i className="sicon-fire" />
                      </span>
                      {t('pages.products.sold', 'تم بيع')} <span>&nbsp;{p.sold_quantity}</span>
                    </div>
                  ) : null}
                  {p.can_show_remained_quantity ? (
                    <div className="flex items-center flex-grow shrink-0 text-store-text-primary">
                      <span className="mx-1.5">{t('pages.products.remained', 'المتبقي')}</span>
                      {p.quantity}
                    </div>
                  ) : null}
                </div>

                {p.discount_ends ? (
                  <div className="countdown-single">
                    <h2>
                      <span className="icon">
                        <svg className="hourglass" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 206" preserveAspectRatio="none">
                          <path className="middle" d="M120 0H0v206h120V0zM77.1 133.2C87.5 140.9 92 145 92 152.6V178H28v-25.4c0-7.6 4.5-11.7 14.9-19.4 6-4.5 13-9.6 17.1-17 4.1 7.4 11.1 12.6 17.1 17zM60 89.7c-4.1-7.3-11.1-12.5-17.1-17C32.5 65.1 28 61 28 53.4V28h64v25.4c0 7.6-4.5 11.7-14.9 19.4-6 4.4-13 9.6-17.1 16.9z" />
                          <path className="outer" d="M93.7 95.3c10.5-7.7 26.3-19.4 26.3-41.9V0H0v53.4c0 22.5 15.8 34.2 26.3 41.9 3 2.2 7.9 5.8 9 7.7-1.1 1.9-6 5.5-9 7.7C15.8 118.4 0 130.1 0 152.6V206h120v-53.4c0-22.5-15.8-34.2-26.3-41.9-3-2.2-7.9-5.8-9-7.7 1.1-2 6-5.5 9-7.7zM70.6 103c0 18 35.4 21.8 35.4 49.6V192H14v-39.4c0-27.9 35.4-31.6 35.4-49.6S14 81.2 14 53.4V14h92v39.4C106 81.2 70.6 85 70.6 103z" />
                        </svg>
                      </span>
                    </h2>
                    <div className="countdown">
                      <salla-count-down date={parseDate(p.discount_ends)} labeled />
                    </div>
                  </div>
                ) : null}

                {p.rating ? (
                  <div className="product-rating-stars">
                    <salla-rating-stars value={p.rating.stars ? p.rating.stars : -1} reviews={p.rating.count} />
                  </div>
                ) : null}

                <div className="quickview-description text-store-text-secondary">
                  {description && description.length > 150 ? (
                    <>
                      <div>{description.slice(0, 150)} ...</div>
                      <a href={p.url} className="link--primary" title={p.name}>
                        {t('common.titles.more', 'المزيد')}
                      </a>
                    </>
                  ) : (
                    description
                  )}
                </div>

                {p.tags && p.tags.length ? (
                  <div className="quickview-tags mb-5">
                    {p.tags.map((tag: any, i: number) => (
                      <a href={tag.url} className="quickview-tags-tag" key={tag.id ?? i}>
                        <span>{tag.name}</span>
                      </a>
                    ))}
                  </div>
                ) : null}

                <form
                  className={`product-options ${p.is_donation ? '' : 'space-y-2.5 sm:space-y-5'}`}
                  id="single-product-form"
                  encType="multipart/form-data"
                  method="post"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sallaSdk()?.form?.onSubmit?.('cart.addItem', e.nativeEvent);
                  }}
                >
                  {p.options || p.show_availability ? (
                    <div className="text-sm">
                      <div className="option-item options-wrap w-full">
                        <salla-product-options
                          product-id={p.id}
                          {...({ options: JSON.stringify(p.options || []) } as any)}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="flex align-items-center">
                    <salla-add-product-button
                      quick-buy
                      className="btn--add-to-cart"
                      fill="outline"
                      width="wide"
                      type="submit"
                      product-id={p.id}
                      product-status={p.status}
                      product-type={p.type}
                      {...(notifyAttrs as any)}
                    >
                      <span className="flex items-center gap-2.5">
                        {p.status === 'sale' ? (
                          <i className={`text-[16px] sicon-${p.type === 'booking' ? 'calendar-time' : 'shopping'}`} />
                        ) : null}
                        {p.add_to_cart_label || addLabel}
                      </span>
                    </salla-add-product-button>

                    {p.is_donation || p.is_out_of_stock ? null : (
                      <div className="flex items-start flex-col rtl:mr-[10px] ltr:ml-[10px]">
                        <input type="hidden" name="id" value={p.id} />
                        {p.is_hidden_quantity ? (
                          <input type="hidden" value="1" name="quantity" />
                        ) : (
                          <salla-quantity-input
                            max={p.max_quantity}
                            value="1"
                            name="quantity"
                            className="border-gray-200 flex justify-end"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TripleQuickView;
