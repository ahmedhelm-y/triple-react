import { createElement, Fragment, useEffect, useMemo, useState } from 'react';
import { SallaQuickOrder } from '@salla.sa/twilight-components-react/quick-order';
import { SallaOffer } from '@salla.sa/twilight-components-react/offer';
import { SallaComments } from '@salla.sa/twilight-components-react/comments';
import { HookSlot } from '@salla.sa/twilight-theme-engine/hooks';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useProduct } from '@salla.sa/twilight-theme-engine/hooks/useProduct';
import { useComments } from '@salla.sa/twilight-theme-engine/hooks/useComments';
import { Breadcrumb, RenderWhenVisible } from '@salla.sa/twilight-theme-engine/common';
import { PageBlocks } from '@salla.sa/twilight-theme-engine/home';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import type { ProductPageProps } from '@salla.sa/twilight-theme-engine/routes/product';
import { ProductGallery } from './ProductGallery';
import { ProductDetails } from './ProductDetails';
import { AddToCartForm } from './AddToCartForm';
import { BlockHookSlot } from '../common';
import { ProductsSlider } from '../home';
import { collectionField, pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * "Similar products" slider. A separate component (not inline in
 * `ProductPage`) so `relatedCount` lives *inside* the product's keyed
 * `<Fragment>` and resets for free on every product → product navigation,
 * instead of needing a `useEffect` to reset it by hand.
 */
function RelatedProducts({ productId, title }: { productId: number; title: string }) {
  // `null` until the related-products list resolves; `0` once we know there are
  // none — then the lazy `<section>` / `.container` wrapper is dropped entirely
  // rather than left empty in the DOM.
  const [relatedCount, setRelatedCount] = useState<number | null>(null);

  return (
    <>
      <HookSlot name="product:related.start" />
      {/* Dropped once we know there are no related products, so no empty
          `<section>` / `.container` is left behind. `estimatedHeight="0"`: until
          then, don't reserve 400px for a block that may render nothing. */}
      {relatedCount !== 0 && (
        <RenderWhenVisible estimatedHeight="0px">
          <div className="container">
            <ProductsSlider
              data={{
                products: { source: 'related', source_value: productId },
                title,
                display_all_url: '',
              }}
              onResolve={setRelatedCount}
            />
          </div>
        </RenderWhenVisible>
      )}
      <HookSlot name="product:related.end" />
    </>
  );
}

/**
 * Product-single sidebar (design option `show_sidebar`, Twig parity:
 * product/single.twig): store policies (`sidebar_prolicy` — icon + title +
 * description) and a selected-products list (`sidebar_products`). Desktop (xl)
 * only, matching Twig's `hidden xl:block`.
 */
function ProductSidebar({ settings }: { settings?: Record<string, unknown> }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const policies = (((settings?.sidebar_prolicy as unknown[]) || []) as Record<string, unknown>[])
    .slice(0, 3)
    .map((p) => ({
      icon: (collectionField(p, 'sidebar_prolicy', 'icon') as string) || 'sicon-store',
      title: pickLang(collectionField(p, 'sidebar_prolicy', 'title') as MultiLang, lang),
      description: pickLang(collectionField(p, 'sidebar_prolicy', 'description') as MultiLang, lang),
    }))
    .filter((p) => p.title || p.description);

  let rawIds = settings?.sidebar_products as unknown;
  if (rawIds && typeof rawIds === 'object' && 'value' in (rawIds as object)) {
    rawIds = (rawIds as { value: unknown }).value;
  }
  const ids = (((rawIds as unknown[]) || []) as unknown[])
    .map((it) =>
      it && typeof it === 'object' && 'value' in it ? (it as { value: unknown }).value : it
    )
    .filter((v) => v != null)
    .slice(0, 4);

  if (!policies.length && !ids.length) return null;

  return (
    <div className="product-single__sidebar w-full xl:w-1/4 hidden xl:block px-[15px]">
      <div className="product-single__sidebar-content">
        {policies.length > 0 && (
          <div className="product-single__policy">
            {policies.map((p, i) => (
              <div className="policy-sidebar" key={i}>
                <div className="image">
                  <i className={p.icon} aria-hidden="true" />
                </div>
                <div className="content">
                  {p.title && <div className="title">{p.title}</div>}
                  {p.description && <div className="description">{p.description}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
        {ids.length > 0 && (
          <div className="collection-sidebar">
            <div className="title">{t('blocks.triple.selected_products', 'منتجات مختارة')}</div>
            <div className="content">
              {createElement('salla-products-list', {
                'horizontal-cards': '',
                source: 'selected',
                limit: '4',
                'source-value': JSON.stringify(ids),
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Theme fork of the engine `ProductPage` (wired in from
 * `app/routes/$slug.p$id.tsx`).
 *
 * Same structure as upstream, but renders the theme's flat-markup
 * {@link ProductDetails} / {@link AddToCartForm} and the theme's scroll-carousel
 * {@link ProductsSlider} for the "similar products" block (matching the homepage
 * product cards). The engine's bottom store-wide testimonials block is dropped —
 * `<SallaComments>` already covers product reviews on this page.
 *
 * Upgrade notes: `FORKS.md`.
 */
export function ProductPage({ product: initialProduct, page }: ProductPageProps) {
  const { theme, store } = useTwilight();
  // `show_sidebar` is a theme-specific design option not in the engine's ThemeSettings type.
  const showSidebar = !!(theme?.settings as Record<string, unknown> | undefined)?.show_sidebar;
  const { t } = useTranslation();
  const { product } = useProduct(initialProduct);
  const { commentsKey } = useComments();
  const blockScope = useMemo(() => ({ product_id: product.id }), [product.id]);

  // The Twig storefront bootstraps `salla.config` with `user.can_comment`; the
  // React SDK init doesn't, so it's `null` and `<salla-comment-form>` (and the
  // `<salla-comments>` container gate) render empty even for eligible buyers.
  // The engine *does* expose the same flag as `store.settings.product
  // .user_can_comment` — copy it across before the lazy comments block mounts.
  useEffect(() => {
    const salla = window.salla;
    if (!salla?.config?.set) return;
    if (salla.config.get('user.can_comment') != null) return;
    const canComment = salla.config.get('store.settings.product.user_can_comment');
    if (typeof canComment !== 'boolean') return;
    salla.config.set('user', { ...(salla.config.get('user') || {}), can_comment: canComment });
  }, []);

  // The engine breadcrumb replaces the product's category crumb with the page
  // you came from (a stored "referrer"). Drop it — synchronously, before
  // `<Breadcrumb>` mounts and reads it — so the real Home › Category › Product
  // trail shows. Guarded: `window` doesn't exist during SSR.
  useState(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage?.removeItem('breadcrumb-referrer');
    } catch {
      /* sessionStorage unavailable (private mode) */
    }
  });

  return (
    // Keyed Fragment (not a wrapper <div>): remounts the whole subtree on a
    // product → product navigation so gallery / form state resets, without
    // adding a node between `#main-content` and the page's sections.
    <Fragment key={product.id}>
      {/* App-block hook `product.single.before_product_info` — above the gallery / info grid */}
      <BlockHookSlot
        name="product.single.before_product_info"
        wrapper="s-before-product-info"
        className="!mt-0"
        scope={blockScope}
      />

      <div className="container">
        {theme?.settings?.product_show_breadcrumbs !== false && <Breadcrumb page={page} />}

        <HookSlot name="product:start" />

        <div
          className="flex flex-col items-start xl:flex-row-reverse xl:gap-2"
          id={`product-${product.id}`}
        >
          <div
            className={`flex flex-col items-start md:flex-row w-full ${showSidebar ? 'xl:w-3/4' : ''}`}
          >
            <ProductGallery product={product} />

            <div className="main-content md:sticky md:overflow-hidden md:top-24 w-full md:w-2/4 md:pb-16">
            <HookSlot name="product:details.start" />
            {/* Loader product: like Twig, the header price stays the unit price; only the SKU and barcode are live */}
            <ProductDetails
              product={initialProduct}
              sku={product.sku}
              barcode={product.barcode}
              showTags={theme.settings.show_tags}
            />
            <HookSlot name="product:details.end" />

            <HookSlot name="product:single.form.start" />
            <AddToCartForm product={product} stickyAddToCart={theme.settings.sticky_add_to_cart} />
            <HookSlot name="product:single.form.end" />
            {/* Twig renders this hook and its merchant blocks after the form */}
            <HookSlot name="product:single.description.end" context={{ product }} />
            <PageBlocks hook="product:single.description.end" scope={blockScope} />

            <SallaQuickOrder className="mt-5 md:-mb-2 block" />
            </div>
          </div>
          {showSidebar ? (
            <ProductSidebar settings={theme?.settings as Record<string, unknown>} />
          ) : null}
        </div>

        <SallaOffer />
      </div>

      {/* App-block hook `product.single.before_customer_reviews` — between the info and the reviews */}
      <BlockHookSlot
        name="product.single.before_customer_reviews"
        wrapper="s-before-reviews"
        scope={blockScope}
      />

      {store.settings?.rating?.show_on_product && (
        // `estimatedHeight="0"`: `RenderWhenVisible` hard-codes `min-height` on its
        // wrapper section and never clears it, so the default 400px leaves an empty
        // gap when the product has no reviews. Comments size themselves once present.
        <RenderWhenVisible estimatedHeight="0px" className="s-block--full-bg">
          <SallaComments key={commentsKey} itemId={product.id} type={'product' as never} />
        </RenderWhenVisible>
      )}

      {/* App-block hook `product.single.before_product_recommendations` — between the reviews and related */}
      <BlockHookSlot
        name="product.single.before_product_recommendations"
        wrapper="s-before-related"
        scope={blockScope}
      />

      <RelatedProducts productId={product.id} title={t('pages.products.similar_products')} />

      {/* App-block hook `product.single.after_product_recommendations` — end of the product page */}
      <BlockHookSlot
        name="product.single.after_product_recommendations"
        wrapper="s-after-related"
        scope={blockScope}
      />

      <HookSlot name="product:end" />
    </Fragment>
  );
}
