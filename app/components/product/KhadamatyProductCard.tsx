import { useEffect, useRef } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useWishlist } from '@salla.sa/twilight-theme-engine/hooks/useWishlist';
import { TripleProductCard, type TripleProductCardProps } from './TripleProductCard';
import { Money } from '../common/Money';

/**
 * Khadamaty product card — a 1:1 React port of the alternative card
 * `custom-salla-product-card` from `triple_twig/src/assets/js/partials/product-card.js`,
 * used when the merchant turns on `use_khadamaty_product_card`. It renders
 * Salla's classic `.s-product-card-*` markup (vertical / horizontal / special)
 * instead of Triple's own `.product-card__*` card.
 *
 * Like the Twig card, the full-image and minimal layouts fall back to Triple's
 * markup (`renderTripleCard`), so those delegate to {@link TripleProductCard};
 * the extra khadamaty look for them is the `khadamaty-card` marker class the
 * stylesheet keys off (`04-components/khadamaty-card.scss`). Whether this card or
 * Triple's renders is decided by {@link ProductCardSwitch}.
 *
 * Styling: the base `.s-product-card-*` rules in `04-components/product.scss`
 * plus the gaps + the two Triple layouts' khadamaty look in
 * `04-components/khadamaty-card.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function sallaSdk(): any {
  return (globalThis as unknown as { salla?: any }).salla;
}

function money(v: number | string | null | undefined): string {
  const s = sallaSdk();
  return s?.money ? s.money(v || 0) : String(v ?? '');
}

function priceFormat(price: number | string | null | undefined): string {
  if (!price || Number(price) === 0) {
    const s = sallaSdk();
    return s?.config?.get?.('store.settings.product.show_price_as_dash') ? '-' : '';
  }
  return money(price);
}

function num(v: number | null | undefined): string {
  const s = sallaSdk();
  return s?.helpers?.number ? s.helpers.number(v) : String(v ?? '');
}

function isPlaceholderUrl(url: string | undefined): boolean {
  const s = sallaSdk();
  if (s?.url?.is_placeholder && url) {
    try {
      return !!s.url.is_placeholder(url);
    } catch {
      /* fall through */
    }
  }
  return false;
}

function fitType(): string | false {
  const s = sallaSdk();
  return (s?.config?.get?.('store.settings.product.fit_type') as string | false) || false;
}

function placeholderUrl(): string {
  const s = sallaSdk();
  const raw = s?.config?.get?.('theme.settings.placeholder');
  if (!raw) return '';
  if (/^https?:\/\//.test(String(raw))) return String(raw);
  try {
    return s?.url?.asset ? s.url.asset(raw) : String(raw);
  } catch {
    return String(raw);
  }
}

function inWishlistNow(id: number): boolean {
  const s = sallaSdk();
  try {
    return !s?.config?.isGuest?.() && (s?.storage?.get?.('salla::wishlist', []) || []).includes(id);
  } catch {
    return false;
  }
}

function formatDate(date: string | number): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function KhadamatyProductCard(props: TripleProductCardProps) {
  const {
    product,
    layout = 'vertical',
    className,
    withQuantity = false,
    withoutAddButton = false,
    withShadow = false,
    showRemained = false,
    hideCountdown = false,
    lookbook = false,
  } = props;

  const { t } = useTranslation();
  const wishlist = useWishlist();
  const barRef = useRef<SVGCircleElement>(null);

  const horizontal = layout === 'horizontal';
  const fullImage = layout === 'fullImage';
  const minimal = layout === 'minimal';
  const isSpecial = layout === 'special';

  const productId = Number(product.id);
  const showQuantity = withQuantity || isSpecial;
  const hideRemained = isSpecial ? !showRemained : false;

  // Special card's remaining-quantity pie.
  useEffect(() => {
    const bar = barRef.current;
    if (bar && isSpecial && product.quantity && !hideRemained) {
      const qty = product.quantity;
      const total = qty > 100 ? qty * 2 : 100;
      bar.style.strokeDashoffset = String(100 - (qty / total) * 100);
    }
  }, [isSpecial, product.quantity, hideRemained]);

  // full-image / minimal reuse Triple's card markup (renderTripleCard).
  if (fullImage || minimal) {
    return <TripleProductCard {...props} className={`khadamaty-card ${className || ''}`.trim()} />;
  }

  const inWishlist = wishlist.has(productId) || inWishlistNow(productId);
  const effectiveStatus =
    product.is_out_of_stock &&
    (globalThis as any).notify_when_available_in_card &&
    !['donating', 'financial_support'].includes(product.type)
      ? 'out-and-notify'
      : product.status;

  const remained = t('pages.products.remained', 'المتبقي');
  const donationAmountLabel = t('pages.products.donation_amount', 'قيمة التبرع');
  const startingPrice = t('pages.products.starting_price', 'يبدأ من');
  const outOfStock = t('pages.products.out_of_stock', 'نفذت الكمية');

  const addLabel = (): string => {
    if (product.has_preorder_campaign) return t('pages.products.pre_order_now', 'اطلب مسبقًا');
    if (product.status === 'sale' && product.type === 'booking')
      return t('pages.cart.book_now', 'احجز الآن');
    if (product.status === 'sale') return t('pages.cart.add_to_cart', 'أضف إلى السلة');
    if (product.type !== 'donating') return outOfStock;
    return t('pages.products.donation_exceed', 'تم بلوغ المبلغ المطلوب');
  };

  const imgUrl =
    product.image?.url || (product as { thumbnail?: string }).thumbnail || placeholderUrl() || '';
  const imgFit = isPlaceholderUrl(product.image?.url) ? 'contain' : fitType() || 'cover';
  const imgAlt = product.image?.alt || product.name;

  const hostClasses = ['s-product-card-entry', 'khadamaty-card'];
  if (lookbook) hostClasses.push('product-card');
  if (!horizontal) hostClasses.push('s-product-card-vertical');
  else hostClasses.push('s-product-card-horizontal');
  if (fitType() && !isSpecial) hostClasses.push('s-product-card-fit-height');
  if (isSpecial) hostClasses.push('s-product-card-special');
  if ((product as { donation?: unknown }).donation) hostClasses.push('s-product-card-donation');
  if (withShadow) hostClasses.push('s-product-card-shadow');
  if (product.is_out_of_stock) hostClasses.push('s-product-card-out-of-stock');
  if (className) hostClasses.push(className);

  const donation = (product as { donation?: any }).donation;

  // Badge over the image (preorder / promotion / remaining qty / out of stock).
  const preorderLabel = (product.preorder as { label?: string } | undefined)?.label;
  let badge: React.ReactNode = null;
  if (preorderLabel) badge = <div className="s-product-card-promotion-title">{preorderLabel}</div>;
  else if (product.promotion_title)
    badge = <div className="s-product-card-promotion-title">{product.promotion_title}</div>;
  else if (showQuantity && product.quantity)
    badge = (
      <div className="s-product-card-quantity">
        {remained} {num(product.quantity)}
      </div>
    );
  else if (showQuantity && product.is_out_of_stock)
    badge = <div className="s-product-card-out-badge">{outOfStock}</div>;

  const showDash = !!sallaSdk()?.config?.get?.('store.settings.product.show_price_as_dash');
  const priceBlock = product.is_on_sale ? (
    <div className="s-product-card-sale-price">
      <h4>
        <Money amount={product.sale_price} dash={showDash} />
      </h4>
      <span>
        <Money amount={product.regular_price} dash={showDash} />
      </span>
    </div>
  ) : product.starting_price ? (
    <div className="s-product-card-starting-price">
      <p>{startingPrice}</p>
      <h4>
        {' '}
        <Money amount={product.starting_price} dash={showDash} />{' '}
      </h4>
    </div>
  ) : (
    <h4 className="s-product-card-price">
      <Money amount={product.price} dash={showDash} />
    </h4>
  );

  const wishlistBtn = (
    <salla-button
      shape="icon"
      fill="outline"
      color="light"
      aria-label="Add or remove to wishlist"
      className={`s-product-card-wishlist-btn animated ${
        inWishlist ? 's-product-card-wishlist-added pulse-anime' : 'not-added un-favorited'
      }`}
      data-id={productId}
      onClick={() => wishlist.toggle(productId)}
    >
      <i className="sicon-heart" />
    </salla-button>
  );

  return (
    <custom-salla-product-card id={String(product.id)} className={hostClasses.join(' ')}>
      <div className="s-product-card-image">
        <a href={product.url} aria-label={imgAlt}>
          <img
            className={`s-product-card-image-${imgFit}`}
            src={imgUrl}
            alt={imgAlt}
            loading="lazy"
          />
          {badge}
        </a>
        {!horizontal ? wishlistBtn : null}
      </div>

      <div className="s-product-card-content">
        {isSpecial && product.quantity && !hideRemained ? (
          <div className="s-product-card-content-pie">
            <span>
              <b>{num(product.quantity)}</b>
              {remained}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="-2 -1 36 34"
              className="s-product-card-content-pie-svg"
            >
              <circle cx="16" cy="16" r="15.9155" className="s-product-card-content-pie-svg-base" />
              <circle
                ref={barRef}
                cx="16"
                cy="16"
                r="15.9155"
                className="s-product-card-content-pie-svg-bar"
              />
            </svg>
          </div>
        ) : null}

        <div
          className={`s-product-card-content-main ${
            isSpecial ? 's-product-card-content-extra-padding' : ''
          }`}
        >
          <h3 className="s-product-card-content-title">
            <a href={product.url}>{product.name}</a>
          </h3>
          {product.subtitle ? (
            <p className="s-product-card-content-subtitle opacity-80">{product.subtitle}</p>
          ) : null}
        </div>

        {donation ? (
          <>
            <salla-progress-bar {...({ donation: JSON.stringify(donation) } as any)} />
            <div className="s-product-card-donation-input">
              {donation.can_donate && donation.custom_amount_enabled ? (
                <>
                  <label htmlFor={`donation-amount-${product.id}`}>
                    {donationAmountLabel} <span>*</span>
                  </label>
                  <input
                    type="text"
                    id={`donation-amount-${product.id}`}
                    name="donating_amount"
                    className="s-form-control"
                    placeholder={donationAmountLabel}
                    onInput={(e) => {
                      const input = e.currentTarget;
                      sallaSdk()?.helpers?.inputDigitsOnly?.(input);
                      const btn = input
                        .closest('.s-product-card-content')
                        ?.querySelector('salla-add-product-button');
                      btn?.setAttribute('donating-amount', input.value);
                    }}
                  />
                </>
              ) : null}
            </div>
          </>
        ) : null}

        <div
          className={`s-product-card-content-sub ${
            isSpecial ? 's-product-card-content-extra-padding' : ''
          }`}
        >
          {donation?.can_donate ? null : priceBlock}
          {product.rating?.stars ? (
            <div className="s-product-card-rating">
              <i className="sicon-star2 before:text-orange-300" />
              <span>{product.rating.stars}</span>
            </div>
          ) : null}
        </div>

        {isSpecial && product.discount_ends && !hideCountdown ? (
          <salla-count-down
            date={formatDate(product.discount_ends as string)}
            {...({ 'end-of-day': true, boxed: true, labeled: true } as any)}
          />
        ) : null}

        {!withoutAddButton ? (
          <div className="s-product-card-content-footer gap-2">
            <salla-add-product-button
              fill="outline"
              {...({ width: 'wide' } as any)}
              product-id={product.id}
              product-status={effectiveStatus}
              product-type={product.type}
            >
              {product.status === 'sale' ? (
                <i
                  className={`text-base sicon-${
                    product.type === 'booking' ? 'calendar-time' : 'shopping-bag'
                  }`}
                />
              ) : null}
              <span>{product.add_to_cart_label || addLabel()}</span>
            </salla-add-product-button>
            {horizontal ? wishlistBtn : null}
          </div>
        ) : null}
      </div>
    </custom-salla-product-card>
  );
}
