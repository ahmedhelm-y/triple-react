import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import type { ProductCardProps } from '@salla.sa/twilight-theme-engine/product';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useWishlist } from '@salla.sa/twilight-theme-engine/hooks/useWishlist';
import { registerNativeBookingHook } from '../../lib/nativeBooking';
import { useVideoProducts, CardVideo } from '../../lib/videoProducts';
import { Money } from '../common/Money';
import { TripleQuickView } from './TripleQuickView';

/**
 * Triple's product card — a 1:1 React port of the default (non-khadamaty) card
 * `custom-salla-product-card` from `triple_twig/src/assets/js/triple/product-card.js`.
 *
 * It renders the SAME DOM and class names as the Twig card so the ported card
 * SCSS (`04-components/triple-card-base.scss` + `triple-card.scss`) styles it
 * verbatim, and honours the same ~20 merchant settings the Twig
 * `product-card-props.twig` fed through `window.productCardProps`:
 *   hover_style (1/2/3/4), rounded_cards, mobile_mini_products (mini cart),
 *   primary_product_buttons, product_promo_bg, show_rating, show_discount,
 *   enhanced_add_btn_in_mobile, filled_normal/mini_cart, show_normal_countdown,
 *   hide_countdown_labels, …
 *
 * Interactivity uses the live storefront components/SDK exactly as the Twig card
 * did: `<salla-add-product-button>` (add to cart / notify-when-available),
 * `<salla-count-down>`, `<salla-rating-stars>`, `<salla-button>`, plus
 * `useWishlist` for the heart state and a React-state quick view (`TripleQuickView`).
 *
 * Settings are read from `salla.config` after mount (SSR renders the defaults so
 * hydration matches, then an effect applies the merchant's real values). The
 * khadamaty card variant (`use_khadamaty_product_card`) is a separate component.
 *
 * Variant ⇄ engine `layout`: vertical | horizontal | fullImage | minimal | special.
 */

/* ------------------------------------------------------------------ settings */

interface TripleCardSettings {
  hoverStyle: string;
  roundedCards: boolean;
  miniCards: boolean;
  primaryButtons: boolean;
  productPromoBg: string;
  showRating: boolean;
  showRatingCount: boolean;
  mobileEnhancedAddBtn: boolean;
  filledNormalCart: boolean;
  filledMiniCart: boolean;
  showNormalCountdown: boolean;
  hideCountdownLabels: boolean;
  showDiscount: boolean;
  fitType: string | false;
  showPriceAsDash: boolean;
  activateSecondImage: boolean;
  notifyInCard: boolean;
  placeholder: string;
  /** `window.productcard_options`: show product option swatches on the card. */
  cardOptionsEnabled: boolean;
  /** Render single-/multiple-choice options as buttons (theme settings). */
  optionSingleAsButton: boolean;
  optionMultipleAsButton: boolean;
  /** Current page slug — on-card options are suppressed on cart / PDP. */
  pageSlug: string;
}

/** Values that match the Twig defaults; used on the server and for the first
 *  client render so hydration matches before the effect reads `salla.config`. */
const DEFAULT_SETTINGS: TripleCardSettings = {
  hoverStyle: 'hover_style_1',
  roundedCards: false,
  miniCards: false,
  primaryButtons: false,
  productPromoBg: '#ef4444',
  showRating: false,
  showRatingCount: false,
  mobileEnhancedAddBtn: false,
  filledNormalCart: false,
  filledMiniCart: false,
  showNormalCountdown: false,
  hideCountdownLabels: false,
  showDiscount: false,
  fitType: false,
  showPriceAsDash: false,
  activateSecondImage: false,
  notifyInCard: false,
  placeholder: '',
  cardOptionsEnabled: false,
  optionSingleAsButton: false,
  optionMultipleAsButton: false,
  pageSlug: '',
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function sallaSdk(): any {
  return (globalThis as unknown as { salla?: any }).salla;
}

function readSettings(): TripleCardSettings {
  const s = sallaSdk();
  if (!s?.config?.get) return DEFAULT_SETTINGS;
  const get = (k: string, d: unknown): unknown => {
    try {
      const v = s.config.get(k);
      return v === undefined || v === null ? d : v;
    } catch {
      return d;
    }
  };
  const ts = (k: string, d: unknown) => get(`theme.settings.${k}`, d);
  const win = globalThis as unknown as Record<string, unknown>;

  let placeholder = String(ts('placeholder', '') || '');
  if (placeholder && !/^https?:\/\//.test(placeholder) && s.url?.asset) {
    try {
      placeholder = s.url.asset(placeholder);
    } catch {
      /* keep as-is */
    }
  }

  return {
    hoverStyle: (ts('hover_style', 'hover_style_1') as string) || 'hover_style_1',
    roundedCards: !!ts('rounded_cards', false),
    miniCards: !!ts('mobile_mini_products', false),
    primaryButtons: !!ts('primary_product_buttons', false),
    productPromoBg: (ts('product_promo_bg', '#ef4444') as string) || '#ef4444',
    showRating: !!ts('show_rating', false),
    showRatingCount: !!win.show_rating_count,
    mobileEnhancedAddBtn: !!ts('enhanced_add_btn_in_mobile', false),
    filledNormalCart: !!ts('filled_normal_cart', false),
    filledMiniCart: !!ts('filled_mini_cart', false),
    showNormalCountdown: !!ts('show_normal_countdown', false),
    hideCountdownLabels: !!ts('hide_countdown_labels', false),
    showDiscount: !!ts('show_discount', false),
    fitType: (get('store.settings.product.fit_type', false) as string | false) || false,
    showPriceAsDash: !!get('store.settings.product.show_price_as_dash', false),
    activateSecondImage: !!win.activate_second_image,
    notifyInCard: !!win.notify_when_available_in_card,
    placeholder,
    cardOptionsEnabled: !!win.productcard_options,
    optionSingleAsButton: !!(win.show_singleSelection ?? ts('show_singleSelection', false)),
    optionMultipleAsButton: !!(win.show_multipleOption ?? ts('show_multipleOption', false)),
    pageSlug: String(get('page.slug', '') || ''),
  };
}

/* -------------------------------------------------------------------- helpers */

function money(v: number | string | null | undefined): string {
  const s = sallaSdk();
  if (s?.money) return s.money(v || 0);
  return String(v ?? '');
}

function priceFormat(price: number | string | null | undefined, showPriceAsDash: boolean): string {
  if (!price || Number(price) === 0) return showPriceAsDash ? '-' : money(0);
  return money(price);
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

/* ---------------------------------------------------------------- sub-pieces */

function WishlistButton({
  productId,
  inWishlist,
  onToggle,
  label,
  extraClass = '',
}: {
  productId: number;
  inWishlist: boolean;
  onToggle: () => void;
  label: string;
  extraClass?: string;
}) {
  return (
    <div className="wishlist" data-title={label}>
      <salla-button
        shape="icon"
        fill="outline"
        color="primary"
        aria-label="Add or remove to wishlist"
        className={`btn--wishlist heart-next-add-button animated ${
          inWishlist ? 'is-added pulse-anime' : 'not-added un-favorited'
        } ${extraClass}`.trim()}
        data-id={productId}
        onClick={onToggle}
      >
        <i className="sicon-heart" />
      </salla-button>
    </div>
  );
}

function QuickviewButton({
  productId,
  label,
  onOpen,
}: {
  productId: number;
  label: string;
  onOpen: (id: number) => void;
}) {
  return (
    <div className="quickview-btn" data-title={label}>
      <salla-button
        fill="outline"
        aria-label="Quick view"
        {...({ 'data-product-id': productId } as Record<string, unknown>)}
        onClick={() => onOpen(productId)}
      >
        <i className="sicon-eye" />
      </salla-button>
    </div>
  );
}

function AddButton({
  product,
  status,
  extraClass,
  shape,
  fill,
  size,
  width,
  type,
  formId,
  withIcon = true,
  labelText,
}: {
  product: Product;
  status: string;
  extraClass: string;
  shape?: string;
  fill?: string;
  size?: string;
  width?: string;
  /** `type="submit"` when the card wraps its content in a cart form (on-card options). */
  type?: string;
  /** Associates a button rendered OUTSIDE the form (the image overlay add buttons) with it. */
  formId?: string;
  withIcon?: boolean;
  labelText?: string;
}) {
  const extra: Record<string, unknown> = {};
  if (shape) extra.shape = shape;
  if (size) extra.size = size;
  if (fill) extra.fill = fill;
  if (width) extra.width = width;
  if (type) extra.type = type;
  if (formId) extra.form = formId;
  return (
    <salla-add-product-button
      className={extraClass}
      aria-label="Add to cart button"
      product-id={product.id}
      product-status={status}
      product-type={product.type}
      {...(extra as any)}
    >
      {withIcon && (
        <i className={`text-[16px] sicon-${product.type === 'booking' ? 'calendar-time' : 'shopping'}`} />
      )}
      {labelText}
    </salla-add-product-button>
  );
}

/** Wraps the card content in a `cart.addItem` form when on-card product options
 *  are active, so the selected option values submit with "add to cart" — the
 *  Twig card's `z ? '<form …>'` wrapper. Module-scoped so it keeps a stable
 *  identity across renders. */
function ContentFormWrap({
  active,
  formId,
  productId,
  onSubmit,
  children,
}: {
  active: boolean;
  formId: string;
  productId: number | string;
  onSubmit: (e: { preventDefault: () => void; nativeEvent: Event }) => void;
  children: ReactNode;
}) {
  if (!active) return <>{children}</>;
  return (
    <form
      id={formId}
      className="content-wrap donating-wrap form product-form"
      encType="multipart/form-data"
      method="post"
      onSubmit={onSubmit}
    >
      <input type="hidden" name="id" value={productId} />
      <input type="hidden" name="quantity" value="1" />
      {children}
    </form>
  );
}

/* --------------------------------------------------------------------- props */

export interface TripleProductCardProps extends ProductCardProps {
  /** Special card: render the remaining-quantity pie (special_product block). */
  showRemained?: boolean;
  /** Hide every countdown on this card (special blocks with `hide_countdown`). */
  hideCountdown?: boolean;
  /** Special single-product layout: force the normal-cart button to show. */
  specialSingleProduct?: boolean;
  /** Card opened from the products lookbook. */
  lookbook?: boolean;
}

/* ---------------------------------------------------------------- component */

export function TripleProductCard(props: TripleProductCardProps) {
  const {
    product,
    layout = 'vertical',
    className,
    withQuantity = false,
    withoutAddButton = false,
    index,
    imagePriority = false,
    showRemained = false,
    hideCountdown = false,
    specialSingleProduct = false,
    lookbook = false,
  } = props;

  const { t } = useTranslation();
  const wishlist = useWishlist();
  const [settings, setSettings] = useState<TripleCardSettings>(DEFAULT_SETTINGS);
  const [quickViewId, setQuickViewId] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cardOptions, setCardOptions] = useState<any[] | null>(
    (product.options as unknown[] | undefined)?.length ? (product.options as any[]) : null
  );
  const circleBarRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    registerNativeBookingHook();
    setSettings(readSettings());
  }, []);

  const horizontal = layout === 'horizontal';
  const fullImage = layout === 'fullImage';
  const minimal = layout === 'minimal';
  const isSpecial = layout === 'special';

  const {
    hoverStyle,
    roundedCards,
    miniCards,
    primaryButtons,
    productPromoBg,
    showRating,
    showRatingCount,
    mobileEnhancedAddBtn,
    filledNormalCart,
    filledMiniCart,
    showNormalCountdown,
    hideCountdownLabels,
    showDiscount,
    fitType,
    showPriceAsDash,
    activateSecondImage,
    notifyInCard,
    placeholder,
    cardOptionsEnabled,
    optionSingleAsButton,
    optionMultipleAsButton,
    pageSlug,
  } = settings;

  const productId = Number(product.id);
  const inWishlist = wishlist.has(productId);

  const canNotify =
    product.is_out_of_stock &&
    notifyInCard &&
    !['donating', 'financial_support'].includes(product.type);
  const effectiveStatus = canNotify ? 'out-and-notify' : product.status;

  const remainedLabel = t('pages.products.remained', 'المتبقي');
  const outOfStockLabel = t('pages.products.out_of_stock', 'نفذت الكمية');
  const notifyLabel = t('pages.products.notify_availability', 'أعلمني عند التوفر');
  const quickViewLabel = t('blocks.triple.quick_view', 'عرض سريع');
  const addToWishlistLabel = t('pages.products.add_to_wishlist', 'أضف إلى المفضلة');

  const addLabel = useMemo(() => {
    if (product.has_preorder_campaign) return t('pages.products.pre_order_now', 'اطلب مسبقًا');
    if (product.status === 'sale' && product.type === 'booking')
      return t('pages.cart.book_now', 'احجز الآن');
    if (product.status === 'sale') return t('pages.cart.add_to_cart', 'أضف إلى السلة');
    if (product.type !== 'donating') return t('pages.products.out_of_stock', 'نفذت الكمية');
    return t('pages.products.donation_exceed', 'تم بلوغ المبلغ المطلوب');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.has_preorder_campaign, product.status, product.type, t]);
  const addToCartLabel = product.add_to_cart_label || addLabel;

  // Product videos: when this card's product has a clip in the enclosing
  // `video-products` block, the clip replaces the image and opens the reels feed
  // (port of the Twig card's `_isVideoCard` / `_initVideoMode`).
  const videoCtx = useVideoProducts();
  const videoItem = videoCtx?.byId.get(String(product.id));
  const isVideoCard = !!videoItem && !fullImage && !horizontal && !minimal;
  const videoIndex = isVideoCard
    ? videoCtx!.items.findIndex((v) => v.id === String(product.id))
    : -1;

  const imageUrl = product.image?.url || (product as { thumbnail?: string }).thumbnail || '';
  const imgIsPlaceholder = isPlaceholderUrl(product.image?.url);
  const objectFit = imgIsPlaceholder ? 'contain' : fitType || 'cover';
  const dims = imageUrl.match(/-(\d+)x(\d+)-/);
  const firstRow = imagePriority || (typeof index === 'number' && index < 4);

  const secondImageUrl =
    activateSecondImage && !fullImage && (product.images?.length ?? 0) > 1
      ? product.images?.[1]?.url
      : undefined;

  const promoBadge =
    product.promotion_title ||
    (product.preorder as { label?: string } | undefined)?.label ||
    '';

  // --- the remaining-quantity pie (special cards) ---
  useEffect(() => {
    const bar = circleBarRef.current;
    if (bar && isSpecial && showRemained && product.quantity) {
      const qty = product.quantity;
      const total = qty > 100 ? qty * 2 : 100;
      bar.style.strokeDashoffset = String(100 - (qty / total) * 100);
    }
  }, [isSpecial, showRemained, product.quantity]);

  // On-card options: eligible layouts/pages, enabled via `window.productcard_options`.
  const optionsEligible =
    cardOptionsEnabled &&
    product.type === 'product' &&
    pageSlug !== 'cart' &&
    pageSlug !== 'product.single' &&
    !fullImage &&
    !horizontal &&
    !minimal;
  const showCardOptions = !!(optionsEligible && cardOptions?.length);
  const submitType = showCardOptions ? 'submit' : undefined;
  const optionsConfig = useMemo(
    () =>
      JSON.stringify({
        ...(optionSingleAsButton ? { 'single-option': { type: 'button' } } : {}),
        ...(optionMultipleAsButton ? { 'multiple-option': { type: 'button' } } : {}),
      }),
    [optionSingleAsButton, optionMultipleAsButton]
  );
  const cardFormId = useMemo(
    () => `product-card-form-${product.id}-${Math.random().toString(36).slice(2, 8)}`,
    [product.id]
  );
  const handleCardFormSubmit = (e: { preventDefault: () => void; nativeEvent: Event }) => {
    e.preventDefault();
    sallaSdk()?.form?.onSubmit?.('cart.addItem', e.nativeEvent);
  };

  // Lazily fetch options for list products that have options but didn't ship them.
  useEffect(() => {
    if (!optionsEligible || !product.has_options || cardOptions?.length) return;
    const s = sallaSdk();
    const api = s?.product?.api?.fetchOptions;
    if (typeof api !== 'function') return;
    let alive = true;
    Promise.resolve(api.call(s.product.api, [productId]))
      .then((res: { data?: Array<{ id: number | string; options?: unknown[] }> }) => {
        const found = res?.data?.find((d) => parseInt(String(d.id), 10) === productId);
        if (alive && found?.options?.length) setCardOptions(found.options as any[]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsEligible, product.has_options, productId, cardOptions]);

  /* ---- host class list (mirrors the Twig card's classList sequence) ---- */
  const classes = ['product-card'];
  if (fullImage) classes.push('s-product-card-full-image', 'product-card__full-image');
  if (minimal) classes.push('s-product-card-minimal', 'product-card--minimal', 'product-card--horizontal');
  if (product.image) classes.push('has-image');
  classes.push(hoverStyle || 'hover_style_3');
  if (roundedCards) classes.push('product-card--rounded');
  if (primaryButtons) classes.push('product-card--primary-buttons');
  if (isSpecial) classes.push('product-card--special');
  if (product.discount_ends && showNormalCountdown) classes.push('has-countdown');
  if (miniCards && !horizontal && !isSpecial) classes.push('product-card--simplified');
  if (mobileEnhancedAddBtn && !horizontal && !isSpecial) classes.push('product-card--enhanced-btn');
  if (filledNormalCart) classes.push('product-card--filled-normal-cart');
  if (filledMiniCart) classes.push('product-card--filled-mini-cart');
  if (horizontal && !isSpecial && !fullImage) classes.push('product-card--horizontal');
  if (!horizontal && !fullImage && !minimal) classes.push('product-card--vertical');
  if (fitType && !fullImage && !isSpecial && !minimal) classes.push('product-card--fit-height');
  if (product.is_out_of_stock) classes.push('out-of-stock');
  if (secondImageUrl && !isVideoCard) classes.push('product-card--has-second-image');
  if (isVideoCard) classes.push('product-card--has-video');
  if (className) classes.push(className);

  /* ---- render-time conditions (mirror the Twig card exactly) ---- */
  const showImageMobileAdd =
    (!(
      horizontal ||
      fullImage ||
      (product.is_out_of_stock && !canNotify) ||
      miniCards ||
      mobileEnhancedAddBtn ||
      withoutAddButton
    ) ||
      (lookbook && miniCards));
  const showImageHover1Add =
    !withoutAddButton &&
    !(product.is_out_of_stock && !canNotify) &&
    hoverStyle === 'hover_style_1' &&
    !horizontal &&
    !fullImage &&
    !minimal;

  const showNormalCountdownEl =
    !!product.discount_ends &&
    showNormalCountdown &&
    !fullImage &&
    product.is_on_sale &&
    !hideCountdown &&
    !isSpecial &&
    !minimal;
  const showSpecialCountdownEl =
    !!product.discount_ends && isSpecial && !hideCountdown && !fullImage && !minimal;

  const showContentButtons = !((hoverStyle === 'hover_style_1' && !horizontal) || fullImage);
  const showContentHorizontalMobileAdd =
    horizontal && !(product.is_out_of_stock && !canNotify) && !withoutAddButton && !fullImage;
  const showMiniCart =
    !(horizontal || !miniCards || withoutAddButton || mobileEnhancedAddBtn || isSpecial || fullImage);
  const showEnhancedCart =
    !(horizontal || withoutAddButton || !mobileEnhancedAddBtn || lookbook || isSpecial || fullImage);
  const showNormalCart =
    !(
      (horizontal || hoverStyle !== 'hover_style_4' || withoutAddButton || fullImage || minimal) &&
      !specialSingleProduct
    );

  const wishlistBtn = (extraClass?: string) => (
    <WishlistButton
      productId={productId}
      inWishlist={inWishlist}
      onToggle={() => wishlist.toggle(productId)}
      label={addToWishlistLabel}
      extraClass={extraClass}
    />
  );
  const quickviewBtn = (
    <QuickviewButton productId={productId} label={quickViewLabel} onOpen={setQuickViewId} />
  );

  /* ---- price block (Twig `getProductPrice`) ---- */
  const priceBlock = (
    <div
      className={`flex product-card__price ${
        horizontal ? '' : 'whitespace-nowrap'
      } price-wrapper gap-4 items-center justify-center`}
    >
      <div
        className={`${product.is_on_sale ? '' : 'hidden'} price_is_on_sale flex items-center ${
          horizontal ? 'gap-1' : 'gap-2'
        }`}
      >
        <p
          className={`total-price ${
            fullImage ? 'text-red-400' : 'text-red-600'
          } font-bold inline-block text-lg`}
        >
          <Money amount={product.sale_price} dash={showPriceAsDash} />
        </p>
        <span
          className={`before-price ${
            fullImage ? 'text-gray-100' : 'text-store-text-secondary'
          } line-through whitespace-nowrap leading-none`}
        >
          <Money amount={product.regular_price} dash={showPriceAsDash} />
        </span>
      </div>
      <div
        className={`starting-or-normal-price gap-2 items-center ${
          product.is_on_sale ? 'hidden' : 'flex'
        }`}
      >
        {product.starting_price ? (
          <span className="starting-price-title font-bold text-store-text-secondary">
            {t('pages.products.starting_price', 'يبدأ من')}
          </span>
        ) : null}
        <p className="total-price font-bold inline-block text-store-text-secondary text-lg">
          <Money amount={product.starting_price || product.price} dash={showPriceAsDash} />
        </p>
      </div>
      {showDiscount && product.is_on_sale ? (
        <div className="product-card__discount">
          {product.sale_price ? (
            <span className="font-bold text-red-600">
              {t('pages.products.discount', 'خصم')}{' '}
              {Math.round(
                ((product.regular_price - product.sale_price) / product.regular_price) * 100
              )}
              %
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <custom-salla-product-card
        id={`product-${product.id}`}
        className={classes.join(' ')}
        {...(lookbook ? { lookbook: 'true' } : {})}
      >
        {/* -------------------------------------------------------- image */}
        <div className={fullImage ? 's-product-card-image-full' : 'product-card__image'}>
          <a href={product.url}>
            {!isVideoCard ? (
              <img
                className={`h-full w-full main-image transition-opacity hover:opacity-90 object-${objectFit}`}
                src={imageUrl}
                {...(dims ? { width: Number(dims[1]), height: Number(dims[2]) } : {})}
                loading={firstRow ? 'eager' : 'lazy'}
                {...(firstRow ? { fetchPriority: 'high' as const } : {})}
                alt={product.name}
                onError={(e) => {
                  const img = e.currentTarget;
                  img.onerror = null;
                  if (placeholder) img.src = placeholder;
                }}
              />
            ) : null}
            {secondImageUrl && !isVideoCard ? (
              <img
                className={`second-image w-full h-full hover:opacity-90 transition-opacity object-${
                  imgIsPlaceholder ? 'contain' : 'cover'
                }`}
                src={secondImageUrl}
                alt={product.name}
                decoding="async"
                loading="lazy"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.onerror = null;
                  if (placeholder) img.src = placeholder;
                }}
              />
            ) : null}
          </a>

          {isVideoCard && videoItem ? (
            <CardVideo
              product={product}
              item={videoItem}
              index={videoIndex}
              aspect={videoCtx!.aspect}
              badgePosition={videoCtx!.badgePosition}
              autoplayInView={videoCtx!.autoplayInView}
              productOnVideo={videoCtx!.productOnVideo}
              placeholder={placeholder}
              openFeed={videoCtx!.openFeed}
            />
          ) : null}

          {fullImage ? (
            <a href={product.url} aria-label={product.name} className="s-product-card-overlay" />
          ) : null}

          {promoBadge ? (
            <div className="product-card__promotion" style={{ backgroundColor: productPromoBg }}>
              {promoBadge}
            </div>
          ) : null}

          {withQuantity && product.quantity ? (
            <div
              style={{ backgroundColor: productPromoBg }}
              data-triple="product-card-badge"
              className={`absolute top-4 z-1 font-bold px-2.5 py-1.5 md:py-2 text-xs text-white left-2 md:right-2 md:left-[unset] ${
                horizontal ? '' : 'max-w-[calc(100%-60px)]'
              }`}
            >
              {remainedLabel} {product.quantity}
            </div>
          ) : null}

          {product.is_out_of_stock ? (
            <span className="product-card__out-label">{outOfStockLabel}</span>
          ) : null}

          {!minimal ? (
            <div className="product-card__actions">
              {!fullImage ? wishlistBtn() : null}
              {quickviewBtn}
            </div>
          ) : null}

          {hoverStyle === 'hover_style_1' && !horizontal && !fullImage && !minimal ? (
            <div className="product-card__buttons">
              {wishlistBtn()}
              {quickviewBtn}
            </div>
          ) : null}

          {hoverStyle === 'hover_style_4' && !horizontal && !fullImage && !minimal ? (
            <div className="product-card__buttons normal">
              {wishlistBtn()}
              {quickviewBtn}
            </div>
          ) : null}

          {showImageMobileAdd ? (
            <div className="product-card__addToCart mobile">
              <AddButton
                product={product}
                status={effectiveStatus}
                extraClass="product-card__addToCart__btn"
                labelText={addToCartLabel}
                type={submitType}
                formId={showCardOptions ? cardFormId : undefined}
              />
            </div>
          ) : null}

          {showImageHover1Add ? (
            <div className="product-card__addToCart">
              <AddButton
                product={product}
                status={effectiveStatus}
                extraClass="product-card__addToCart__btn"
                labelText={addToCartLabel}
                type={submitType}
                formId={showCardOptions ? cardFormId : undefined}
              />
            </div>
          ) : null}

          {isSpecial && product.quantity && showRemained ? (
            <div
              data-quantity={product.quantity}
              data-total={product.quantity > 100 ? 2 * product.quantity : 100}
              className="pie-wrapper"
            >
              <span>
                <b id="staProductQty" title={product.quantity.toLocaleString()} data-quantity={product.quantity}>
                  {product.quantity.toLocaleString()}
                </b>{' '}
                {remainedLabel}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -1 36 34" className="pie-svg">
                <circle cx="16" cy="16" r="15.9155" className="circle_base" />
                <circle ref={circleBarRef} cx="16" cy="16" r="15.9155" className="circle_bar" />
              </svg>
            </div>
          ) : null}
        </div>

        {/* content — wrapped in a cart form when on-card options are active */}
        <ContentFormWrap
          active={showCardOptions}
          formId={cardFormId}
          productId={product.id}
          onSubmit={handleCardFormSubmit}
        >
        <div className="product-card__content">
          <div className="product-card__content-wrapper">
            <div className="product-card__title">
              <a href={product.url}>{product.name}</a>
            </div>

            {product.subtitle && !minimal ? (
              <p className="product-card__subtitle text-sm text-store-text-secondary leading-6 mb-2.5">
                {product.subtitle}
              </p>
            ) : null}

            {product.rating?.stars && showRating ? (
              <div className="s-product-card-rating">
                <salla-rating-stars
                  size="small"
                  value={product.rating.stars}
                  {...(showRatingCount ? { reviews: product.rating.count } : {})}
                />
              </div>
            ) : null}

            <div className="product-options">
              {showCardOptions ? (
                <salla-product-options
                  product-id={product.id}
                  {...({ options: JSON.stringify(cardOptions), config: optionsConfig } as any)}
                />
              ) : null}
            </div>

            {priceBlock}

            {showNormalCountdownEl ? (
              <salla-count-down
                className="product-card-countdown"
                date={parseDate(product.discount_ends as string)}
                {...(hideCountdownLabels ? {} : { labeled: true })}
                boxed
              />
            ) : null}

            {showSpecialCountdownEl ? (
              <salla-count-down date={parseDate(product.discount_ends as string)} labeled boxed />
            ) : null}

            {fullImage ? (
              <div className="flex items-center gap-2 justify-center mt-4 product-card__full-image-actions">
                <div
                  className="addToCart text-white"
                  data-title={
                    canNotify ? notifyLabel : product.is_out_of_stock ? outOfStockLabel : product.add_to_cart_label
                  }
                >
                  <AddButton
                    product={product}
                    status={effectiveStatus}
                    shape="icon"
                    fill="outline"
                    extraClass="addToCart__btn"
                    withIcon
                  />
                </div>
                <div
                  className="wishlist text-white"
                  data-title={product.is_out_of_stock ? outOfStockLabel : product.add_to_cart_label}
                >
                  <salla-button
                    shape="icon"
                    fill="outline"
                    color="primary"
                    aria-label="wishlist button"
                    className={`btn--wishlist animated ${inWishlist ? 'is-added pulse-anime' : ''}`.trim()}
                    data-id={productId}
                    onClick={() => wishlist.toggle(productId)}
                  >
                    <i className="sicon-heart" />
                  </salla-button>
                </div>
              </div>
            ) : null}

            {showContentButtons ? (
              <div className="product-card__buttons">
                {!minimal ? wishlistBtn() : null}
                {quickviewBtn}
                {!withoutAddButton ? (
                  <div
                    className="addToCart"
                    data-title={
                      canNotify
                        ? notifyLabel
                        : product.is_out_of_stock
                          ? outOfStockLabel
                          : addToCartLabel
                    }
                  >
                    <AddButton
                      product={product}
                      status={effectiveStatus}
                      fill="outline"
                      extraClass="addToCart__btn"
                      withIcon
                      type={submitType}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {showContentHorizontalMobileAdd ? (
              <div className="product-card__addToCart mobile">
                <AddButton
                  product={product}
                  status={effectiveStatus}
                  extraClass="product-card__addToCart__btn"
                  labelText={addToCartLabel}
                />
              </div>
            ) : null}
          </div>

          {showMiniCart ? (
            <div className="product-card__mini-cart mt-2">
              <AddButton
                product={product}
                status={effectiveStatus}
                fill="outline"
                size="sm"
                width="wide"
                extraClass="product-card__mini-cart__btn"
                labelText={addToCartLabel}
                type={submitType}
              />
            </div>
          ) : null}

          {showEnhancedCart ? (
            <div className="product-card__enhanced-mini-cart">
              <div className="product-card__enhanced-mini-cart-divider" />
              <salla-add-product-button
                className="product-card__enhnaced-mini-cart__btn"
                product-id={product.id}
                fill="outline"
                product-status={effectiveStatus}
                product-type={product.type}
                {...({ size: 'sm', width: 'wide', ...(submitType ? { type: submitType } : {}) } as any)}
              >
                <div className="product-card__enhanced-mini-cart__btn--inner">
                  <span className="rtl:mr-auto ltr:ml-auto enhanced-label">{addToCartLabel}</span>
                  <i
                    className={`text-[16px] sicon-${
                      product.is_out_of_stock
                        ? 'minus-circle'
                        : product.type === 'booking'
                          ? 'calendar-time'
                          : 'add'
                    } ltr:ml-auto rtl:mr-auto enhanced-icon`}
                  />
                </div>
              </salla-add-product-button>
            </div>
          ) : null}

          {showNormalCart ? (
            <div className="product-card__normal-cart mt-2">
              <AddButton
                product={product}
                status={effectiveStatus}
                fill="outline"
                size="sm"
                width="wide"
                extraClass="product-card__normal-cart__btn"
                labelText={addToCartLabel}
                type={submitType}
              />
            </div>
          ) : null}
        </div>
        </ContentFormWrap>
      </custom-salla-product-card>

      {quickViewId != null ? (
        <TripleQuickView productId={quickViewId} onClose={() => setQuickViewId(null)} />
      ) : null}
    </>
  );
}

export default TripleProductCard;
