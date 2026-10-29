import { useEffect, useRef, useState } from 'react';

/**
 * Shared helpers for Triple home blocks that show linked products (complete-set,
 * review-products, compare-products, shop-the-feed, shoppable-video,
 * outfit-builder). Port of `triple_twig/src/assets/js/partials/triple-products.js`.
 *
 * Products are always fetched for the whole block in one request (never one per
 * card), and only when the block comes near the screen.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyProduct = Record<string, any>;

function salla(): any {
  return (globalThis as any).salla;
}

export function money(value: number): string {
  return salla()?.money?.(value) ?? String(value);
}

/** A product's price, plus its regular price while it is on sale. */
export function productPrices(product: AnyProduct): { price: number; compare: number | null } {
  const price = Number(product.is_on_sale ? product.sale_price : product.price) || 0;
  const regular = Number(product.regular_price) || 0;
  return { price, compare: product.is_on_sale && regular > price ? regular : null };
}

export function productImage(product: AnyProduct): string {
  return product.image?.url || product.thumbnail || '';
}

/** Normalize a JSON id list (or array) to a de-duplicated list of string ids. */
export function readIds(json: unknown): string[] {
  try {
    const arr = typeof json === 'string' ? JSON.parse(json || '[]') : json;
    return [...new Set((arr || []).filter(Boolean).map(String))] as string[];
  } catch {
    return [];
  }
}

/** One request for the given products (source "selected"); resolves to a Map id → product. */
export function fetchProducts(ids: string[]): Promise<Map<string, AnyProduct>> {
  const s = salla();
  if (!ids.length || !s?.product?.fetch) return Promise.resolve(new Map());
  const params = { source: 'selected', source_value: ids, limit: ids.length };
  const run = () => s.product.fetch(params);
  const call = s.api?.withoutNotifier ? s.api.withoutNotifier(run) : run();
  return call
    .then(({ data }: { data: AnyProduct[] }) => new Map((data || []).map((p) => [String(p.id), p] as const)))
    .catch(() => new Map());
}

/** One request for an arbitrary product query (e.g. a category); resolves to a Map id → product. */
export function fetchProductsQuery(query: Record<string, any>): Promise<Map<string, AnyProduct>> {
  const s = salla();
  if (!s?.product?.fetch) return Promise.resolve(new Map());
  const run = () => s.product.fetch(query);
  const call = s.api?.withoutNotifier ? s.api.withoutNotifier(run) : run();
  return call
    .then(({ data }: { data: AnyProduct[] }) => new Map((data || []).map((p) => [String(p.id), p] as const)))
    .catch(() => new Map());
}

/** Quick add (as salla-add-product-button does); errors are shown by Salla's notifier. */
export function quickAdd(id: number | string, quantity = 1): Promise<any> {
  return salla()?.cart?.addItem?.({ id, quantity, endpoint: 'quickAdd' }) ?? Promise.resolve();
}

/**
 * React hook: becomes `true` once the ref'd element comes near the screen (or
 * right away when IntersectionObserver is missing). Mirrors `whenNear`.
 */
export function useNearViewport<T extends Element>(margin = '400px 0px'): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near) return;
    if (!('IntersectionObserver' in window)) {
      setNear(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          setNear(true);
        }
      },
      { rootMargin: margin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near, margin]);
  return [ref, near];
}

/**
 * React hook: fetch the given product ids once the element is near the viewport.
 * Returns the ref to attach, and a Map of id → product (empty until loaded).
 */
export function useLinkedProducts<T extends Element>(
  ids: string[],
  margin?: string
): [React.RefObject<T | null>, Map<string, AnyProduct>, boolean] {
  const [ref, near] = useNearViewport<T>(margin);
  const [byId, setById] = useState<Map<string, AnyProduct>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const key = ids.join(',');
  useEffect(() => {
    if (!near || loaded) return;
    let alive = true;
    const s = salla();
    const run = () => fetchProducts(ids).then((map) => {
      if (!alive) return;
      setById(map);
      setLoaded(true);
    });
    (s?.onReady ? s.onReady().then(run) : run());
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, key]);
  return [ref, byId, loaded];
}

/**
 * Lazy, muted autoplay videos within `root`: attach the source when a
 * `video[data-lazy-video]` first scrolls into view, and pause it off screen
 * (unless the viewer paused it). Returns a disconnect fn. Mirrors `LazyVideo`.
 */
export function initLazyVideos(root: ParentNode): () => void {
  const videos = root.querySelectorAll<HTMLVideoElement>('video[data-lazy-video]');
  if (!videos.length || !('IntersectionObserver' in window)) {
    videos.forEach((video) => {
      if (!video.src) video.src = video.dataset.lazyVideo || '';
      video.play?.().catch(() => {});
    });
    return () => {};
  }
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach(({ target, isIntersecting }) => {
        const video = target as HTMLVideoElement;
        if (!isIntersecting) {
          video.pause();
          return;
        }
        if (!video.src) video.src = video.dataset.lazyVideo || '';
        if (video.hasAttribute('data-user-paused')) return;
        video.play().catch(() => {});
      }),
    { threshold: 0.25 }
  );
  videos.forEach((video) => observer.observe(video));
  return () => observer.disconnect();
}

/**
 * Scroll a horizontal scroll-snap track to one of its slides (RTL-aware). The
 * track must be the slides' offsetParent. Mirrors `scrollTrackTo`.
 */
export function scrollTrackTo(track: HTMLElement | null, slide: HTMLElement | null): void {
  if (!track || !slide) return;
  const rtl = getComputedStyle(track).direction === 'rtl';
  const left = rtl ? slide.offsetLeft + slide.offsetWidth - track.offsetWidth : slide.offsetLeft;
  track.scrollTo({ left, behavior: 'smooth' });
}
