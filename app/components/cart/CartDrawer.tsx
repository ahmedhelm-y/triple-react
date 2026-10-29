import { useCallback, useEffect, useRef, useState } from 'react';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { Money } from '../common/Money';

/**
 * Triple side cart drawer — opens from any `[data-drawer-id="cart-drawer"]`
 * trigger (and, with `open_drawer_on_add`, after an add to cart), loads the cart
 * through the live SDK and keeps its items/totals in sync with `cart::updated`.
 * Port of `triple_twig/src/views/pages/partials/triple/cart-drawer.twig` +
 * `js/partials/cart-drawer.js`. Styling: `04-components/triple-extras.scss`.
 *
 * It renders with React (not innerHTML) but drives the cart through the same
 * `window.salla` SDK the Twig theme used, so totals, coupons, quantity updates
 * and checkout behave identically.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function sallaSdk(): any {
  return (globalThis as unknown as { salla?: any }).salla;
}
function money(v: number | string | null | undefined): string {
  const s = sallaSdk();
  return s?.money ? s.money(v || 0) : String(v ?? '');
}
function lang(key: string, fallback: string): string {
  const s = sallaSdk();
  try {
    const v = s?.lang?.get?.(key);
    return v && v !== key ? v : fallback;
  } catch {
    return fallback;
  }
}

interface CartData {
  items?: any[];
  count?: number;
  total?: number;
  sub_total?: number;
  total_discount?: number;
}

const CheckoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M2 12C2 8.46252 2 6.69377 3.0528 5.5129C3.22119 5.32403 3.40678 5.14935 3.60746 4.99087C4.86213 4 6.74142 4 10.5 4H13.5C17.2586 4 19.1379 4 20.3925 4.99087C20.5932 5.14935 20.7788 5.32403 20.9472 5.5129C22 6.69377 22 8.46252 22 12C22 15.5375 22 17.3062 20.9472 18.4871C20.7788 18.676 20.5932 18.8506 20.3925 19.0091C19.1379 20 17.2586 20 13.5 20H10.5C6.74142 20 4.86213 20 3.60746 19.0091C3.40678 18.8506 3.22119 18.676 3.0528 18.4871C2 17.3062 2 15.5375 2 12Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 16H11.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14.5 16L18 16" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 9H22" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

function CartDrawerItem({ item, index }: { item: any; index: number }) {
  const s = sallaSdk();
  const url = item.product_url || s?.url?.get?.(`*/p${item.product_id}`) || '#';
  const hiddenOptionsRef = useRef<HTMLDivElement>(null);

  // Mount hidden options for cart mode (the SDK reads them on quantity/option change).
  useEffect(() => {
    const holder = hiddenOptionsRef.current;
    if (!holder || !item.options?.length) return;
    holder.innerHTML = '';
    const el = document.createElement('salla-product-options') as any;
    el.setAttribute('product-id', String(item.product_id));
    el.options = item.options;
    holder.appendChild(el);
    (typeof el.componentOnReady === 'function' ? el.componentOnReady() : Promise.resolve())
      .then(() => {
        try {
          el.enterCartMode?.();
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
    return () => {
      holder.innerHTML = '';
    };
  }, [item.product_id, item.options]);

  const selectedOptions = (item.options || [])
    .map((option: any) => {
      const sel = option.details?.find((d: any) => d.is_selected);
      return sel ? { name: option.name, value: sel.name } : null;
    })
    .filter(Boolean) as { name: string; value: string }[];

  return (
    <form
      className="cart-drawer-item p-2.5 md:p-4 rounded mb-2.5 relative"
      id={`cart-drawer-item-${item.id}`}
      data-item-id={item.id}
      style={{ ['--i' as any]: index }}
      onChange={(e) => s?.form?.onChange?.('cart.updateItem', e.nativeEvent)}
    >
      <input type="hidden" name="id" value={item.id} />
      {item.options?.length ? (
        <div className="cart-drawer-hidden-options" aria-hidden="true" ref={hiddenOptionsRef} />
      ) : null}

      <div className="flex rtl:space-x-reverse space-x-4 items-start justify-between">
        <a href={url} className="shrink-0 relative overflow-hidden rounded block w-20 h-20">
          <img
            src={item.product_image}
            alt={item.product_name}
            className="flex-none w-20 h-20 object-center object-cover"
            loading="lazy"
          />
          <div
            className={`free-ribbon absolute top-[7px] -right-[26px] w-24 bg-red-600 text-white text-[10px] font-bold text-center py-0.5 rotate-45 shadow-md ${
              item.price == 0 ? '' : 'hidden'
            }`}
          >
            {lang('pages.loyalty_program.free_product', 'منتج مجاني')}
          </div>
        </a>
        <div className="flex-1 space-y-1">
          <h4 className="text-store-text-primary leading-6 text-sm">
            <a href={url}>{item.product_name}</a>
          </h4>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm text-store-text-secondary line-through item-regular-price ${item.offer ? '' : 'hidden'}`}>
              <Money amount={item.product_price} />
            </span>
            <span className={`text-sm text-store-text-secondary line-through item-original-price ${item.is_on_sale ? '' : 'hidden'}`}>
              <Money amount={item.original_price} />
            </span>
            <span className="item-price text-sm text-store-text-primary">
              <Money amount={item.price} />
            </span>
          </div>

          {selectedOptions.length ? (
            <ul className="text-sm text-store-text-secondary mt-1 space-y-0.5">
              {selectedOptions.map((o, i) => (
                <li key={i}>
                  {o.name}: {o.value}
                </li>
              ))}
            </ul>
          ) : null}

          <div className={`flex items-center gap-1.5 offer-row ${item.offer ? '' : 'hidden'}`}>
            <i className="sicon-discount-calculator text-store-text-secondary offer-icon" />
            <span className="text-sm text-store-text-secondary offer-name">
              {item.offer ? item.offer.names : ''}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            {item.is_hidden_quantity || item.type === 'donating' ? (
              <span />
            ) : (
              <salla-quantity-input
                {...({
                  'cart-item-id': item.id,
                  max: item.max_quantity,
                  value: item.quantity,
                  name: 'quantity',
                } as any)}
                aria-label={lang('common.elements.quantity', 'الكمية')}
              />
            )}
            <p className="text-store-text-primary flex-none font-bold text-sm">
              <span className="inline-block item-total">
                {item.is_available ? (
                  <Money amount={item.total} />
                ) : (
                  lang('pages.cart.out_of_stock', 'نفذت الكمية')
                )}
              </span>
            </p>
          </div>
        </div>
      </div>

      <span className="absolute -top-[0.625rem] rtl:-left-[0.625rem] ltr:-right-[0.625rem]">
        <salla-button
          {...({ shape: 'icon', size: 'small', color: 'danger' } as any)}
          type="button"
          className="cart-drawer-item__delete"
          aria-label={lang('pages.cart.remove_item', 'حذف')}
          onClick={() => s?.cart?.deleteItem?.(item.id).catch(() => {})}
        >
          <i className="sicon-trash text-base" />
        </salla-button>
      </span>
    </form>
  );
}

export function CartDrawer() {
  const { theme, store } = useTwilight();
  const { t } = useTranslation();
  const s = (theme?.settings ?? {}) as Record<string, any>;

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadedRef = useRef(false);
  const hasUpdateRef = useRef(true);
  const qtyMapRef = useRef<Record<string, number>>({});
  const openRef = useRef(false);
  openRef.current = open;

  const withCheckout = !!s.show_drawer_checkout_btn;
  const taxIncluded = !!(store as any)?.settings?.tax?.taxable_prices_enabled;

  const load = useCallback(() => {
    const sdk = sallaSdk();
    if (!sdk?.api?.cart?.details) return;
    if (loadedRef.current && !hasUpdateRef.current) return;
    setLoading(true);
    setError(false);
    sdk.api.cart
      .details()
      .then(({ data }: any) => {
        const c: CartData = data.cart;
        qtyMapRef.current = {};
        (c.items || []).forEach((it: any) => {
          qtyMapRef.current[it.id] = it.quantity;
        });
        setCart(c);
        loadedRef.current = true;
        hasUpdateRef.current = false;
      })
      .catch((err: unknown) => {
        setError(true);
        loadedRef.current = false;
        hasUpdateRef.current = true;
        sallaSdk()?.log?.('loadCartDrawer failed', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const doOpen = useCallback(() => {
    setClosing(false);
    setOpen(true);
    document.body.style.overflow = 'hidden';
    load();
  }, [load]);

  const doClose = useCallback(() => {
    setClosing(true);
    setOpen(false);
    window.setTimeout(() => {
      setClosing(false);
      document.body.style.overflow = '';
    }, 300);
  }, []);

  // Open from any [data-drawer-id="cart-drawer"] trigger; Escape closes.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const trigger = (e.target as HTMLElement).closest?.('[data-drawer-id="cart-drawer"]');
      if (trigger) {
        e.preventDefault();
        doOpen();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openRef.current) doClose();
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [doOpen, doClose]);

  // Live cart sync: updates refresh state, a failed quantity update reverts the input,
  // and (with open_drawer_on_add) an add opens the drawer.
  useEffect(() => {
    const sdk = sallaSdk();
    const bind = () => {
      const ev = sallaSdk()?.cart?.event;
      ev?.onUpdated?.((c: CartData) => {
        hasUpdateRef.current = true;
        (c.items || []).forEach((it: any) => {
          qtyMapRef.current[it.id] = it.quantity;
        });
        if (openRef.current) setCart(c);
      });
      ev?.onItemUpdatedFailed?.((_err: unknown, itemId: string) => {
        const qty = qtyMapRef.current[itemId];
        const input = document.querySelector(
          `#cart-drawer salla-quantity-input[cart-item-id="${itemId}"]`
        ) as any;
        if (input && qty != null && typeof input.setValue === 'function') input.setValue(qty, false);
      });
      if (s.open_drawer_on_add) {
        ev?.onItemAdded?.(() => {
          hasUpdateRef.current = true;
          doOpen();
        });
      }
    };
    if (sdk?.onReady) sdk.onReady().then(bind);
    else bind();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!s.enable_cart_drawer) return null;

  const isEmpty = !loading && !error && cart && !cart.items?.length;
  const count = cart?.count || 0;

  const checkoutBtn = (
    <salla-button
      className="cart-drawer-submit"
      {...({ 'loader-position': 'center', width: 'wide', color: 'primary', fill: 'solid' } as any)}
      onClick={(e) => {
        (e.currentTarget as any).load?.();
        sallaSdk()?.cart?.submit?.();
      }}
    >
      <span>{lang('pages.cart.complete_order', 'إتمام الطلب')}</span>
      <CheckoutIcon />
    </salla-button>
  );
  const viewCartBtn = (
    <salla-button
      {...({
        href: sallaSdk()?.url?.get?.('cart'),
        width: 'wide',
        color: withCheckout ? 'gray' : 'primary',
        fill: withCheckout ? 'outline' : 'solid',
      } as any)}
    >
      <span className="sicon-cart" />
      <span>{lang('pages.cart.view_cart', 'عرض السلة')}</span>
    </salla-button>
  );

  return (
    <div
      id="cart-drawer"
      className={`advanced-content-drawer cart-drawer ${open ? 'is-open animate-in' : ''} ${
        closing ? 'is-closing' : ''
      } ${loading ? 'is-loading' : ''} ${isEmpty ? 'cart-is-empty' : ''} ${error ? 'cart-has-error' : ''}`}
      data-checkout-btn={withCheckout ? '1' : ''}
    >
      <div className="drawer-backdrop" onClick={doClose} />
      <div className="drawer-container bg-storeBG" role="dialog" aria-modal="true" aria-label={lang('blocks.triple.cart', 'السلة')}>
        <div className="drawer-header">
          <h3 className="drawer-title text-store-text-primary">
            {lang('blocks.triple.cart', 'السلة')}
            <span className="cart-products-count text-store-text-secondary text-sm">
              {count ? ` (${count})` : ''}
            </span>
          </h3>
          <button className="drawer-close" aria-label={lang('common.elements.close', 'إغلاق')} onClick={doClose}>
            <i className="sicon-cancel" />
          </button>
        </div>

        <div className="drawer-body">
          <div id="cart-drawer__items">
            {error ? (
              <div className="no-content-placeholder cart-drawer-error">
                <i className="sicon-cancel-circle icon" />
                <p>{lang('pages.checkout.try_again', 'حدث خطأ، يرجى المحاولة مرة أخرى')}</p>
                <salla-button
                  className="cart-drawer-retry"
                  {...({ color: 'primary', fill: 'outline', size: 'small' } as any)}
                  onClick={() => {
                    loadedRef.current = false;
                    hasUpdateRef.current = true;
                    load();
                  }}
                >
                  {lang('common.elements.try_again', 'إعادة المحاولة')}
                </salla-button>
              </div>
            ) : isEmpty ? (
              <div className="no-content-placeholder">
                <i className="sicon-shopping-bag icon" />
                <p>{lang('pages.cart.empty_cart', 'سلة التسوّق فارغة')}</p>
              </div>
            ) : (
              (cart?.items || []).map((item: any, i: number) => (
                <CartDrawerItem key={item.id} item={item} index={i} />
              ))
            )}
          </div>
        </div>

        <div className="drawer-footer">
          {s.show_drawer_coupon ? <salla-cart-coupons className="cart-drawer-coupons" /> : null}

          <div className="cart-drawer__subtotal-row flex justify-between text-sm">
            <span className="cart-drawer__subtotal-label text-store-text-secondary" data-triple="cart-drawer-subtotal-label">
              {lang('blocks.triple.products_total', 'إجمالي المنتجات')}
            </span>
            <b className="cart-drawer-subtotal text-store-text-primary">
              <Money amount={cart?.sub_total || 0} />
            </b>
          </div>

          <div className={`cart-drawer-discount flex justify-between text-sm ${cart?.total_discount ? '' : 'hidden'}`}>
            <span className="cart-drawer__discount-label text-store-text-secondary">
              {lang('blocks.triple.discount', 'الخصم')}
            </span>
            <b className="cart-drawer-discount-value text-store-text-primary">
              {cart?.total_discount ? (
                <>
                  - <Money amount={cart.total_discount} />
                </>
              ) : (
                ''
              )}
            </b>
          </div>

          <div className="cart-drawer-total flex justify-between items-center border-t border-gray-100 pt-3">
            <div>
              <h5 className="cart-drawer__total-label text-store-text-primary" data-triple="cart-drawer-final-total-label">
                {lang('blocks.triple.total', 'الإجمالي')}
              </h5>
              {taxIncluded ? (
                <small className="cart-drawer__tax-note text-store-text-secondary opacity-70">
                  <span className="text-red-600">*</span>
                  {lang('blocks.triple.tax_included', 'شامل الضريبة')}
                </small>
              ) : null}
            </div>
            <strong data-cart-total className="cart-drawer__total-value text-store-text-primary text-lg">
              <Money amount={cart?.total || 0} />
            </strong>
          </div>

          <div className="drawer-actions flex flex-col gap-2.5">
            {withCheckout ? (
              <div className="drawer-actions-row">
                {checkoutBtn}
                {viewCartBtn}
              </div>
            ) : (
              viewCartBtn
            )}
          </div>

          <button
            className="drawer-close btn btn--link w-full !font-normal !py-1 text-store-text-primary"
            onClick={doClose}
          >
            {lang('blocks.triple.continue_shopping', 'مواصلة التسوّق')}
          </button>

          {s.show_drawer_payments ? <salla-payments className="cart-drawer-payments" /> : null}
        </div>
      </div>
    </div>
  );
}
