import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Money } from '../common/Money';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';
import { initLazyVideos } from '../../lib/tripleProducts';

/**
 * `mini-product-details` home block — up to three rich product cards, each with
 * a gallery (image/video thumbs), rating, sold count, price (re-priced when
 * options change), description, options and add-to-cart / buy-now. The server
 * renders the skeleton; each card loads its product and fills in. Port of
 * `triple_twig/src/views/components/home/mini-product-details.twig` +
 * `partials/mini-product.js`. Styling: `mini-product-details.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type ItemRaw = Record<string, any>;
type AnyProduct = Record<string, any>;

const DETAILS = ['options', 'images', 'rating', 'sold_quantity', 'notify_availability'];
const FAST_CHECKOUT = 'https://cdn.assets.salla.network/prod/@salla.sa/fast-checkout-widget/v0.0.47/widget.esm.js';

function pickValue(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) return pickValue(raw[0]);
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    return o.value != null ? String(o.value) : undefined;
  }
  return String(raw);
}

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

const latinDigits = (value: unknown) =>
  String(value ?? '').replace(/[٠-٩۰-۹]/g, (ch) => String(ch.charCodeAt(0) % 16));
const toInt = (value: unknown) => Number(latinDigits(value).replace(/\D/g, '')) || 0;

interface CardConf {
  productId: string;
  aspect: string;
  fit: string;
  videoUrl?: string;
  hideThumbs: boolean;
  soldCount?: string;
  showSold: boolean;
  customRating: boolean;
  ratingValue?: string;
  ratingCount?: string;
  showDescription: boolean;
  showOptions: boolean;
  showBuyNow: boolean;
  buyNowLabel: string;
  marquee: string;
  marqueeIcon?: string;
  marqueeBg?: string;
  marqueeColor?: string;
  borderColor?: string;
  eager: boolean;
}

export interface MiniProductDetailsData {
  title?: MultiLang;
  subtitle?: MultiLang;
  add_top_space?: boolean;
  items?: ItemRaw[];
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const miniProductDetailsConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as MiniProductDetailsData;
    const c = [
      's-block--mini-product',
      `s-block--mini-product--${d.position ?? 0}`,
      'container',
    ];
    if (d.add_top_space) c.push('s-block');
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

function buildCards(items: ItemRaw[] | undefined, lang: string): CardConf[] {
  return (items ?? [])
    .map((item, i) => {
      const pid = productId(item.product);
      return {
        productId: pid,
        aspect: pickValue(item.media_aspect) || 'square',
        fit: pickValue(item.media_fit) || 'cover',
        videoUrl: item.show_video && item.video_url ? String(item.video_url) : undefined,
        hideThumbs: !!item.hide_thumbs,
        soldCount: item.sold_count ? String(item.sold_count) : undefined,
        showSold: !!item.show_sold,
        customRating: !!item.custom_rating,
        ratingValue: item.rating_value != null ? String(item.rating_value) : undefined,
        ratingCount: item.rating_count != null ? String(item.rating_count) : undefined,
        showDescription: !!item.show_description,
        showOptions: !!item.show_options,
        showBuyNow: !!item.show_buy_now,
        buyNowLabel: pickLang(item.buy_now_label as MultiLang, lang),
        marquee: pickLang(item.marquee_text as MultiLang, lang),
        marqueeIcon: item.marquee_icon as string | undefined,
        marqueeBg: item.marquee_bg as string | undefined,
        marqueeColor: item.marquee_color as string | undefined,
        borderColor: item.border_color as string | undefined,
        eager: i === 0,
      };
    })
    .filter((c) => c.productId);
}

export const MiniProductDetails = memo(function MiniProductDetails({ data }: { data: MiniProductDetailsData }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const title = pickLang(data.title as MultiLang, lang);
  const subtitle = pickLang(data.subtitle as MultiLang, lang);
  const cards = useMemo(() => buildCards(data.items, lang), [data.items, lang]);

  if (!cards.length) return null;
  const cols = Math.min(cards.length, 3);

  return (
    <>
      {title || subtitle ? (
        <div className="text-center home-block-title mb-8">
          {title ? (
            <h2
              data-triple="home-mini-product-title"
              className="mini-product__block-title text-3xl font-bold tracking-tight text-store-text-primary sm:text-4xl"
            >
              {title}
            </h2>
          ) : null}
          {subtitle ? (
            <p
              data-triple="home-mini-product-subtitle"
              className="mini-product__block-subtitle mt-2 text-lg leading-8 text-store-text-secondary"
            >
              {subtitle}
            </p>
          ) : null}
          <div className="my-2 mx-auto w-28 h-0 border-2 border-primary home-block-line" />
        </div>
      ) : null}

      <div
        className={`mini-product__grid mini-product__grid--${cols}`}
        style={{ '--mp-cols': cols } as React.CSSProperties}
      >
        {cards.map((card, i) => (
          <MiniProductCard card={card} key={i} />
        ))}
      </div>
    </>
  );
});

function loadFastCheckout() {
  if (typeof document === 'undefined' || document.getElementById('fast-checkout-js')) return;
  const script = Object.assign(document.createElement('script'), {
    id: 'fast-checkout-js',
    type: 'module',
    src: FAST_CHECKOUT,
  });
  document.head.appendChild(script);
}

const MiniProductCard = memo(function MiniProductCard({ card }: { card: CardConf }) {
  const { t } = useTranslation();
  const salla = (globalThis as any).salla;

  const rootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLElement>(null);
  const buyNowRef = useRef<HTMLElement>(null);
  const pendingRef = useRef(0);

  const [product, setProduct] = useState<AnyProduct | null>(null);
  const [failed, setFailed] = useState(false);
  const [mediaIndex, setMediaIndex] = useState<number | 'video'>(card.videoUrl ? 'video' : 0);
  const [price, setPrice] = useState<{ price: number; regular: number; onSale: boolean; startsFrom: boolean } | null>(null);
  const [priceFailed, setPriceFailed] = useState(false);

  const money = (value: unknown): string => {
    const n = Number(value);
    if (n && n !== 0) return salla?.money?.(n) ?? String(n);
    return salla?.config?.get?.('store.settings.product.show_price_as_dash') ? '-' : salla?.money?.(0) ?? '0';
  };

  const timesText = (count: number): string => {
    const key = count === 1 ? 'bought_once' : count === 2 ? 'bought_twice' : count <= 10 ? 'bought_few' : 'bought_many';
    const form = t(`blocks.triple.${key}`, ':count');
    return (form || ':count').replace(':count', count.toLocaleString());
  };

  // load the product once Salla is ready
  useEffect(() => {
    let alive = true;
    const run = () =>
      (salla?.api?.withoutNotifier
        ? salla.api.withoutNotifier(() => salla.product.getDetails(card.productId, DETAILS))
        : salla?.product?.getDetails?.(card.productId, DETAILS) ?? Promise.reject()
      )
        .then(({ data }: { data: AnyProduct }) => {
          if (!alive || !data) return;
          setProduct(data);
          const p = data.is_on_sale ? data.sale_price : data.starting_price || data.price;
          setPrice({
            price: Number(p) || 0,
            regular: Number(data.regular_price) || 0,
            onSale: !!data.is_on_sale,
            startsFrom: !!data.starting_price,
          });
        })
        .catch(() => alive && setFailed(true));
    (salla?.onReady ? salla.onReady(() => salla.lang?.onLoaded?.()).then(run) : run());
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.productId]);

  // lazy video + options element + buy-now widget + price events, after the product fills in
  useEffect(() => {
    if (!product) return;
    const disposers: Array<() => void> = [];

    if (card.videoUrl && rootRef.current) {
      disposers.push(initLazyVideos(rootRef.current));
    }

    // options: salla-product-options takes its data as properties
    const box = optionsRef.current;
    if (card.showOptions && box && formRef.current) {
      const options = product.options;
      if (options?.length && product.type === 'product') {
        const el = document.createElement('salla-product-options') as any;
        el.options = options;
        el.productId = product.id;
        el.uniqueKey = Math.floor(10000 + 90000 * Math.random());
        const config: Record<string, unknown> = {};
        if ((window as any).show_singleSelection) config['single-option'] = { type: 'button' };
        if ((window as any).show_multipleOption) config['multiple-option'] = { type: 'button' };
        el.config = JSON.stringify(config);
        box.innerHTML = '';
        box.appendChild(el);
      } else {
        box.hidden = true;
      }
    }

    // buy-now fast-checkout widget
    const widget = buyNowRef.current as any;
    if (card.showBuyNow && widget) {
      const storeId = salla?.config?.get?.('store.id');
      const needsOptions = !card.showOptions && (product.options || []).some((o: any) => o.required);
      if (product.status !== 'sale' || product.type !== 'product' || !storeId || needsOptions) {
        widget.classList.add('is-unavailable');
      } else {
        widget.setAttribute('language', salla?.lang?.locale ?? 'ar');
        widget.setAttribute('store-id', storeId);
        widget.setAttribute('api', salla?.config?.get?.('store.api'));
        widget.setAttribute('products', JSON.stringify([Number(product.id)]));
        widget.config = { user: salla?.config?.get?.('user'), failure_url: window.location.href };
        loadFastCheckout();
      }
    }

    // once every required option is picked, ask Salla for the price of that combination
    const form = formRef.current;
    const onChange = () => {
      if (!form) return;
      const complete = Array.from(form.elements as any as HTMLInputElement[])
        .filter((f) => f.required && !f.disabled)
        .every((f) =>
          f.type === 'radio' ? !!form.querySelector(`input[name="${f.name}"]:checked`) : !!f.value
        );
      if (!complete) return;
      pendingRef.current++;
      salla?.product?.getPrice?.(new FormData(form));
    };
    form?.addEventListener('change', onChange);
    disposers.push(() => form?.removeEventListener('change', onChange));

    // price events carry the product id only: react when this card asked
    const onPrice = (response: any, pid: any) => {
      if (String(pid) !== String(card.productId) || !pendingRef.current) return;
      pendingRef.current--;
      const d = response?.data || {};
      setPriceFailed(false);
      setPrice({
        price: Number(d.price) || 0,
        regular: Number(d.regular_price) || 0,
        onSale: !!d.has_sale_price && d.regular_price > d.price,
        startsFrom: false,
      });
    };
    const onPriceFail = (_error: any, pid: any) => {
      if (String(pid) !== String(card.productId) || !pendingRef.current) return;
      pendingRef.current--;
      setPriceFailed(true);
    };
    const offPrice = salla?.event?.on?.('product::price.updated', onPrice);
    const offFail = salla?.event?.on?.('product::price.updated.failed', onPriceFail);
    if (typeof offPrice === 'function') disposers.push(offPrice);
    if (typeof offFail === 'function') disposers.push(offFail);

    return () => disposers.forEach((d) => d());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const images: AnyProduct[] = product
    ? product.images?.length
      ? product.images
      : [{ url: product.image?.url || product.thumbnail, alt: product.name }]
    : [];
  const showThumbs = (images.length + (card.videoUrl ? 1 : 0)) > 1 && !card.hideThumbs;
  const placeholderFit =
    images[0] && salla?.url?.is_placeholder?.(images[0].url) ? ({ objectFit: 'contain' } as React.CSSProperties) : undefined;

  const soldCount = toInt(card.soldCount) || product?.sold_quantity || 0;
  const ratingStars = product?.rating?.stars;
  const ratingValue =
    ratingStars || Math.min(5, Number(latinDigits(card.ratingValue).replace(',', '.')) || 0);
  const ratingReviews = ratingStars ? product?.rating?.count || 0 : toInt(card.ratingCount);

  const savePercent =
    price && price.onSale && price.regular > price.price
      ? Math.round(((price.regular - price.price) / price.regular) * 100)
      : 0;

  const addAttrs: Record<string, any> = { 'product-id': card.productId, width: 'wide' };
  if (product) {
    const notify =
      product.is_out_of_stock &&
      !!(window as any).notify_when_available_in_card &&
      !['donating', 'financial_support'].includes(product.type);
    addAttrs['product-status'] = notify ? 'out-and-notify' : product.status;
    addAttrs['product-type'] = product.type;
    if (product.base_currency_price) addAttrs.amount = product.base_currency_price;
    if (product.is_require_shipping) addAttrs['required-shipping'] = '';
    if (product.can_quick_buy) addAttrs['quick-buy'] = '';
    if (product.has_preorder_campaign) addAttrs['has-pre-order'] = '';
    const av = product.notify_availability;
    if (av) {
      if (av.subscribed) addAttrs['is-subscribed'] = '';
      addAttrs.channels = (av.channels || []).join(',');
      addAttrs['subscribed-options'] = JSON.stringify(av.subscribed_options || []);
      if (av.options) addAttrs['notify-options-availability'] = '';
    }
  }
  const addLabel =
    product?.add_to_cart_label ||
    t(product?.status === 'sale' ? 'pages.cart.add_to_cart' : 'pages.products.out_of_stock', 'أضف للسلة');

  const description = useMemo(() => {
    const html = (product?.description || '').replace(/<[^>]+>/g, ' ');
    if (typeof window !== 'undefined' && window.DOMParser) {
      return (new DOMParser().parseFromString(html, 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim();
    }
    return html.replace(/\s+/g, ' ').trim();
  }, [product?.description]);

  const hiddenQty = product && (product.is_hidden_quantity || product.type === 'booking');

  return (
    <div
      className={`mini-product mini-product--${card.aspect} mini-product--fit-${card.fit} bg-storeBG${
        product ? ' is-loaded' : ''
      }${failed ? ' is-failed' : ''}${product?.is_out_of_stock ? ' out-of-stock' : ''}${hiddenQty ? ' without-qty' : ''}`}
      data-product-id={card.productId}
      ref={rootRef}
      style={{ '--mp-border': card.borderColor || '#eeeeee' } as React.CSSProperties}
    >
      <div className="mini-product__media">
        {!product ? (
          <div className="mini-product__main">
            <span className="is-skel absolute inset-0" />
          </div>
        ) : (
          <>
            <div className="mini-product__main">
              {card.videoUrl && mediaIndex === 'video' ? (
                <video
                  className="mini-product__main-video"
                  data-lazy-video={card.videoUrl}
                  poster={images[0]?.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="none"
                />
              ) : (
                <img
                  className="mini-product__main-img"
                  src={(typeof mediaIndex === 'number' ? images[mediaIndex] : images[0])?.url}
                  alt={(typeof mediaIndex === 'number' ? images[mediaIndex] : images[0])?.alt || product.name}
                  style={placeholderFit}
                  {...(card.eager
                    ? { loading: 'eager' as const, fetchPriority: 'high' as any }
                    : { loading: 'lazy' as const })}
                />
              )}
              <a className="mini-product__main-link" href={product.url} aria-label={product.name} />
            </div>
            {showThumbs ? (
              <div className="mini-product__thumbs">
                {card.videoUrl ? (
                  <button
                    type="button"
                    className={`mini-product__thumb is-video${mediaIndex === 'video' ? ' is-active' : ''}`}
                    aria-label="video"
                    onClick={() => setMediaIndex('video')}
                  >
                    <img src={images[0]?.url} alt="" loading="lazy" />
                    <i className="sicon-play" />
                  </button>
                ) : null}
                {images.map((img, i) => (
                  <button
                    type="button"
                    className={`mini-product__thumb${!card.videoUrl && mediaIndex === i ? ' is-active' : ''}`}
                    data-index={i}
                    aria-label={img.alt || ''}
                    key={i}
                    onClick={() => setMediaIndex(i)}
                  >
                    <img src={img.url} alt="" loading={card.eager && i < 4 ? 'eager' : 'lazy'} />
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>

      {card.marquee ? (
        <div
          className="mini-product__marquee"
          style={{ backgroundColor: card.marqueeBg || '#111111', color: card.marqueeColor || '#ffffff' }}
        >
          <div className="mini-product__marquee-inner">
            <ul>
              {Array.from({ length: 12 }, (_, i) => (
                <li key={i} {...(i === 0 ? {} : { 'aria-hidden': true })}>
                  <span>{card.marquee}</span>
                  <i className={card.marqueeIcon || 'sicon-star'} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <form
        className="mini-product__form"
        encType="multipart/form-data"
        method="post"
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          salla?.form?.onSubmit?.('cart.addItem', e.nativeEvent);
        }}
      >
        <input type="hidden" name="id" value={card.productId} />
        <div className="mini-product__info">
          <div className="mini-product__meta">
            {card.showSold ? (
              <span className="mini-product__sold" hidden={!soldCount}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 23c-4.4 0-8-3.1-8-7.6 0-3.1 1.8-5.3 3.4-7 .4-.4 1.1-.1 1.1.5 0 1.4.6 2.6 1.6 3.2.2-3.5 1.8-6.6 4.6-9 .4-.3 1-.1 1.1.4.5 2.6 2 4.2 3.4 5.9 1.4 1.7 2.8 3.5 2.8 6.3C22 19.9 16.4 23 12 23z"
                  />
                  <path d="M12 21c-2 0-3.5-1.4-3.5-3.3 0-1.6 1-2.7 2-3.7.3-.3.8-.1.9.3.2.8.7 1.4 1.4 1.6.2-1.4.8-2.6 1.8-3.6.3-.3.8-.2.9.2.3 1.2 1 2 1.5 2.8.5.7.9 1.4.9 2.4 0 2-1.8 3.3-5.9 3.3z" />
                </svg>
                <span className="mini-product__sold-text">
                  {soldCount ? `${t('blocks.triple.bought', 'تم شراؤه')} ${timesText(Number(soldCount))}` : ''}
                </span>
              </span>
            ) : null}
            {ratingValue > 0 ? (
              <salla-rating-stars
                class="mini-product__rating"
                size="small"
                {...({ value: ratingValue, reviews: ratingReviews } as any)}
              />
            ) : null}
          </div>

          <a className="mini-product__name" href={product?.url || '#'}>
            {product ? product.name : <span className="is-skel-line" />}
          </a>
          {!product ? <span className="mini-product__price-skel is-skel" /> : null}
          {product && price ? (
            <div className={`mini-product__price${price.onSale ? ' is-on-sale' : ''}`} hidden={priceFailed}>
              <span className="starting-price-title" hidden={!price.startsFrom || price.onSale}>
                {t('pages.products.starting_price', 'يبدأ من')}
              </span>
              <span className="total-price"><Money amount={price.price} /></span>
              <span className="before-price" hidden={!price.onSale}>
                <Money amount={price.regular} />
              </span>
              <span className="mini-product__save" hidden={!savePercent}>
                {savePercent ? `${t('blocks.triple.you_save', 'وفّرت')} ${savePercent}%` : ''}
              </span>
            </div>
          ) : null}
          <div className="mini-product__out" hidden={!priceFailed}>
            {t('pages.products.out_of_stock', 'نفذت الكمية')}
          </div>

          {card.showDescription ? (
            <p className="mini-product__desc text-store-text-secondary" hidden={!description}>
              {description}
            </p>
          ) : null}
          {card.showOptions ? <div className="mini-product__options" ref={optionsRef} /> : null}

          <div className="mini-product__actions">
            <div className="mini-product__buy">
              {hiddenQty ? (
                <input type="hidden" name="quantity" value="1" />
              ) : (
                <salla-quantity-input
                  class="mini-product__qty"
                  name="quantity"
                  {...({ value: 1, ...(product?.max_quantity ? { max: product.max_quantity } : {}) } as any)}
                />
              )}
              <salla-add-product-button
                class="mini-product__add"
                ref={addRef as any}
                {...(addAttrs as any)}
              >
                <span className="mini-product__add-label">{addLabel}</span>
              </salla-add-product-button>
            </div>
            {card.showBuyNow ? (
              <salla-mini-checkout-widget
                class="mini-product__buy-now"
                ref={buyNowRef as any}
                {...((card.buyNowLabel.trim() ? { label: card.buyNowLabel.trim() } : {}) as any)}
              />
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
});
