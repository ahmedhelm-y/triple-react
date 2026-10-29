import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { Money } from '../components/common/Money';

/**
 * Product-videos plumbing for Triple's product card, a 1:1 React port of the
 * video feature in `triple_twig/src/assets/js/triple/product-card.js`
 * (methods `_isVideoCard` / `_initVideoMode` / `_openVideoFeed` /
 * `_renderVideoProductTag` / `_renderVideoSlideInfo`, and the shared `h()`
 * reels popup).
 *
 * The Twig card discovers videos from a `data-product-videos` attribute on the
 * enclosing `.s-block--video-products` section. The engine wraps a React home
 * block in a `<section>` whose attributes it owns, so that DOM channel is not
 * available; instead the `video-products` block wraps its product list in
 * {@link VideoProductsProvider}, and {@link useVideoProducts} hands each card the
 * clip for its product plus the shared reels opener — the same data by a React
 * path. Outside that provider the hook returns `null` and the card is unchanged.
 *
 * Styling is reused verbatim: the on-card video uses `.product-card__video*`
 * (`04-components/triple-card.scss`); the full-screen feed uses `.video-popup` /
 * `.vpopup__*` (`04-components/video-popup.scss`).
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

/** Extracts the 11-char YouTube id from a watch / shorts / youtu.be / embed url. */
export function youtubeId(url: string): string | null {
  const m = String(url || '').match(/(?:shorts\/|watch\?v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export interface VideoItem {
  id: string;
  url: string;
  badge?: string;
  /** Derived from the url: a YouTube link plays in an iframe, anything else as `<video>`. */
  type: 'mp4' | 'youtube';
}

export type VideoAspect = 'vertical' | 'square' | 'horizontal';

interface VideoProductsValue {
  items: VideoItem[];
  byId: Map<string, VideoItem>;
  aspect: VideoAspect;
  badgePosition: 'left' | 'right';
  autoplayInView: boolean;
  productOnVideo: boolean;
  /** Opens the shared reels feed starting at the given item index. */
  openFeed: (startIndex: number) => void;
}

const VideoProductsContext = createContext<VideoProductsValue | null>(null);

/** Card-side accessor: the block's video config, or `null` when not inside a video block. */
export function useVideoProducts(): VideoProductsValue | null {
  return useContext(VideoProductsContext);
}

/** Normalises the block's raw `[{id,url,badge}]` pairs into typed {@link VideoItem}s. */
export function toVideoItems(
  pairs: Array<{ id: unknown; url?: unknown; badge?: unknown }>
): VideoItem[] {
  const out: VideoItem[] = [];
  for (const p of pairs || []) {
    const id = p?.id == null ? '' : String(p.id);
    const url = p?.url == null ? '' : String(p.url);
    if (!id || !url) continue;
    out.push({
      id,
      url,
      badge: p.badge ? String(p.badge) : undefined,
      type: youtubeId(url) ? 'youtube' : 'mp4',
    });
  }
  return out;
}

/**
 * Wraps a product list/slider so the cards inside it show their configured
 * clips and open the shared reels feed. Owns the feed's open state and renders
 * it (a portal) while a card has it open.
 */
export function VideoProductsProvider({
  items,
  aspect,
  badgePosition,
  autoplayInView,
  productOnVideo,
  children,
}: {
  items: VideoItem[];
  aspect: VideoAspect;
  badgePosition: 'left' | 'right';
  autoplayInView: boolean;
  productOnVideo: boolean;
  children: React.ReactNode;
}) {
  const [feedStart, setFeedStart] = useState<number | null>(null);

  const byId = useMemo(() => {
    const m = new Map<string, VideoItem>();
    items.forEach((v) => m.set(v.id, v));
    return m;
  }, [items]);

  const value = useMemo<VideoProductsValue>(
    () => ({
      items,
      byId,
      aspect,
      badgePosition,
      autoplayInView,
      productOnVideo,
      openFeed: setFeedStart,
    }),
    [items, byId, aspect, badgePosition, autoplayInView, productOnVideo]
  );

  return (
    <VideoProductsContext.Provider value={value}>
      {children}
      {feedStart !== null ? (
        <VideoFeed
          items={items}
          startIndex={feedStart}
          aspect={aspect}
          productOnVideo={productOnVideo}
          onClose={() => setFeedStart(null)}
        />
      ) : null}
    </VideoProductsContext.Provider>
  );
}

/* ------------------------------------------------------------------ on-card video */

/**
 * The clip shown in place of a video card's image (`_initVideoMode`). Plays
 * muted while on screen when the block autoplays, otherwise shows a play button
 * that starts it inline on the first tap; any later tap opens the reels feed.
 */
export function CardVideo({
  product,
  item,
  index,
  aspect: _aspect,
  badgePosition,
  autoplayInView,
  productOnVideo,
  placeholder,
  openFeed,
}: {
  product: Product;
  item: VideoItem;
  index: number;
  aspect: VideoAspect;
  badgePosition: 'left' | 'right';
  autoplayInView: boolean;
  productOnVideo: boolean;
  placeholder: string;
  openFeed: (startIndex: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(!autoplayInView);

  // Autoplay while on screen (muted): load the src only once seen, pause off-screen.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (typeof IntersectionObserver === 'undefined') {
      if (!video.getAttribute('src')) video.src = video.dataset.src || '';
      if (autoplayInView) video.play().catch(() => {});
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!video.getAttribute('src')) {
              video.src = video.dataset.src || '';
              video.load();
            }
            if (autoplayInView) {
              video.play().catch(() => {});
              video.classList.add('is-playing');
            }
          } else if (autoplayInView) {
            video.pause();
          }
        });
      },
      { threshold: 0.5 }
    );
    io.observe(video);
    return () => io.disconnect();
  }, [autoplayInView]);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const video = videoRef.current;
    if (paused && video) {
      if (!video.getAttribute('src')) {
        video.src = video.dataset.src || '';
        video.load();
      }
      video.muted = true;
      video.play().catch(() => {});
      video.classList.add('is-playing');
      setPaused(false);
      return;
    }
    openFeed(index);
  };

  const prices = product.is_on_sale ? (
    <>
      <span className="product-card__video-product-price">
        <Money amount={product.sale_price} />
      </span>{' '}
      <span className="product-card__video-product-regular">
        <Money amount={product.regular_price} />
      </span>
    </>
  ) : (
    <span className="product-card__video-product-price">
      <Money amount={product.starting_price || product.price} />
    </span>
  );

  const img = product.image?.url || (product as { thumbnail?: string }).thumbnail || placeholder;

  return (
    <div
      className={`product-card__video-wrap${paused ? ' video-paused' : ''}`}
      onClick={onClick}
    >
      <video
        ref={videoRef}
        className="product-card__video"
        muted
        loop
        playsInline
        preload="none"
        data-src={item.url}
      />
      {item.badge ? (
        <span className={`product-card__video-badge product-card__video-badge--${badgePosition}`}>
          <i className="sicon-video" /> {item.badge}
        </span>
      ) : null}
      {paused ? (
        <button
          type="button"
          className="product-card__video-play"
          aria-label="تشغيل الفيديو"
          onClick={onClick}
        >
          <i className="sicon-play" />
        </button>
      ) : null}
      {productOnVideo ? (
        <a
          className={`product-card__video-product${
            product.is_on_sale ? ' product-card__video-product--sale' : ''
          }`}
          href={product.url}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            className="product-card__video-product-img"
            src={img}
            alt={product.image?.alt || product.name}
            loading="lazy"
            onError={(e) => {
              const el = e.currentTarget;
              el.onerror = null;
              if (placeholder) el.src = placeholder;
            }}
          />
          <span className="product-card__video-product-info">
            <span className="product-card__video-product-name">{product.name}</span>
            <span className="product-card__video-product-prices">{prices}</span>
          </span>
        </a>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ reels feed */

/**
 * The full-screen vertical reels popup (`h()` in the Twig card, markup from
 * `#video-popup`). A scroll-snap feed of every clip in the block: the on-screen
 * slide plays (with sound, falling back to muted if autoplay is blocked), the
 * others pause, and each slide loads its product details on first view.
 */
function VideoFeed({
  items,
  startIndex,
  aspect,
  productOnVideo,
  onClose,
}: {
  items: VideoItem[];
  startIndex: number;
  aspect: VideoAspect;
  productOnVideo: boolean;
  onClose: () => void;
}) {
  const feedRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [active, setActive] = useState(startIndex);

  // Enter/leave transitions + the document-level open flag + Escape to close.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    document.documentElement.classList.add('video-popup-opened');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove('video-popup-opened');
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Jump to the clip the card opened, then track the on-screen slide.
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const slides = Array.from(feed.querySelectorAll<HTMLElement>('.vpopup__slide'));
    const target = slides[startIndex] || slides[0];
    if (target) feed.scrollTop = target.offsetTop;
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const i = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(i)) setActive(i);
          }
        });
      },
      { root: feed, threshold: [0, 0.6, 1] }
    );
    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closingRef = useRef(false);
  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setShown(false);
    window.setTimeout(onClose, 300);
  }, [onClose]);

  return createPortal(
    <div className={`video-popup show${shown ? ' show-content' : ''}`} data-aspect={aspect}>
      <div className="vpopup__overlay" onClick={close} />
      <div className="vpopup__content">
        <button type="button" className="vpopup__close" aria-label="إغلاق" onClick={close}>
          <i className="sicon-cancel" />
        </button>
        <div className="vpopup__feed" ref={feedRef}>
          {items.map((item, i) => (
            <VideoSlide
              key={`${item.id}-${i}`}
              item={item}
              index={i}
              active={active === i}
              productOnVideo={productOnVideo}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** One reels slide: the clip plus the product info/options/add-to-cart overlay. */
function VideoSlide({
  item,
  index,
  active,
  productOnVideo,
}: {
  item: VideoItem;
  index: number;
  active: boolean;
  productOnVideo: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const [muted, setMuted] = useState(false);
  const [seen, setSeen] = useState(active);

  useEffect(() => {
    if (active) setSeen(true);
  }, [active]);

  // mp4: play the active slide (unmuted, falling back to muted), pause the rest.
  useEffect(() => {
    if (item.type !== 'mp4') return;
    const video = videoRef.current;
    if (!video) return;
    if (!active) {
      video.pause();
      return;
    }
    if (!video.getAttribute('src')) video.setAttribute('src', item.url);
    video.currentTime = 0;
    video.muted = muted;
    const p = video.play();
    if (p && p.catch) {
      p.catch(() => {
        video.muted = true;
        setMuted(true);
        video.play().catch(() => {});
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, item.type, item.url]);

  // Progress bar.
  useEffect(() => {
    const video = videoRef.current;
    const fill = fillRef.current;
    if (!video || !fill) return;
    const onTime = () => {
      const pct = video.duration ? (video.currentTime / video.duration) * 100 : 0;
      fill.style.width = `${pct}%`;
    };
    video.addEventListener('timeupdate', onTime);
    return () => video.removeEventListener('timeupdate', onTime);
  }, []);

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
  };

  const yt = item.type === 'youtube' ? youtubeId(item.url) : null;

  return (
    <div className="vpopup__slide" data-index={index} data-type={item.type} data-src={item.url}>
      {yt ? (
        <div className="vpopup__media vpopup__media--yt">
          {active || seen ? (
            <iframe
              className="vpopup__yt"
              src={`https://www.youtube.com/embed/${yt}?autoplay=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${yt}`}
              title="YouTube"
              frameBorder="0"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          ) : null}
        </div>
      ) : (
        <div className="vpopup__media">
          <video
            ref={videoRef}
            className="vpopup__video"
            loop
            playsInline
            preload="none"
            data-src={item.url}
          />
        </div>
      )}

      {item.type === 'mp4' ? (
        <button
          type="button"
          className="vpopup__sound"
          aria-label="الصوت"
          onClick={toggleSound}
        >
          <i className={muted ? 'sicon-volume-mute' : 'sicon-volume-high'} />
        </button>
      ) : null}

      <div className="vpopup__info">
        {seen ? <VideoSlideInfo id={item.id} productOnVideo={productOnVideo} /> : null}
      </div>

      {item.type === 'mp4' ? (
        <div className="vpopup__progress">
          <span className="vpopup__progress-fill" ref={fillRef} />
        </div>
      ) : null}
    </div>
  );
}

/** The product card inside a reels slide, loaded lazily (`_renderVideoSlideInfo`). */
function VideoSlideInfo({ id, productOnVideo }: { id: string; productOnVideo: boolean }) {
  const [product, setProduct] = useState<any | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = sallaSdk();
    if (!s?.product?.getDetails) return;
    let alive = true;
    Promise.resolve(s.product.getDetails(id, ['options', 'notify_availability']))
      .then((res: { data?: any }) => {
        if (alive && res?.data) setProduct(res.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);

  // Mount the options web component imperatively so its `options` property is set.
  useEffect(() => {
    const holder = optionsRef.current;
    if (!holder || !product?.options?.length) return;
    holder.innerHTML = '';
    const el = document.createElement('salla-product-options') as any;
    el.setAttribute('product-id', String(product.id));
    el.options = product.options;
    holder.appendChild(el);
    return () => {
      holder.innerHTML = '';
    };
  }, [product]);

  if (!product) return null;

  const placeholder =
    sallaSdk()?.config?.get?.('theme.settings.placeholder') || '';
  const img = product.image?.url || product.thumbnail || placeholder;
  const hasOptions = !!product.options?.length;
  const label =
    product.add_to_cart_label ||
    sallaSdk()?.lang?.get?.('pages.cart.add_to_cart') ||
    'أضف إلى السلة';

  const notify = product.notify_availability;
  const notifyAttrs: Record<string, unknown> = {};
  if (notify) {
    if (notify.subscribed) notifyAttrs['is-subscribed'] = '';
    notifyAttrs.channels = (notify.channels || []).join(',');
    if (notify.options) notifyAttrs['notify-options-availability'] = '';
  }

  const priceRow = product.is_on_sale ? (
    <>
      <span className="vpopup__price-sale">
        <Money amount={product.sale_price} />
      </span>{' '}
      <span className="vpopup__price-regular">
        <Money amount={product.regular_price} />
      </span>
    </>
  ) : (
    <span className="vpopup__price-total">
      <Money amount={product.price} />
    </span>
  );

  const titleAndPrice = (
    <>
      <a href={product.url} className="vpopup__title">
        {product.name}
      </a>
      <div className="vpopup__price">{priceRow}</div>
    </>
  );

  return (
    <>
      {productOnVideo ? (
        <div className="vpopup__product">
          <img
            className="vpopup__product-img"
            src={img}
            alt={product.image?.alt || product.name}
            loading="lazy"
            onError={(e) => {
              const el = e.currentTarget;
              el.onerror = null;
              if (placeholder) el.src = placeholder;
            }}
          />
          <div className="vpopup__product-info">{titleAndPrice}</div>
        </div>
      ) : (
        titleAndPrice
      )}

      <form
        ref={formRef}
        className="vpopup__form"
        onSubmit={(e) => {
          e.preventDefault();
          sallaSdk()?.form?.onSubmit?.('cart.addItem', e.nativeEvent);
        }}
      >
        <input type="hidden" name="id" value={product.id} />
        <input type="hidden" name="quantity" value="1" />
        {hasOptions ? <div className="vpopup__options" ref={optionsRef} /> : null}
        <salla-add-product-button
          className="vpopup__add-btn btn--add-to-cart"
          product-id={product.id}
          product-status={product.status}
          product-type={product.type}
          {...({
            'quick-buy': '',
            width: 'wide',
            ...(hasOptions ? { type: 'submit' } : {}),
            ...notifyAttrs,
          } as any)}
        >
          {label}
        </salla-add-product-button>
      </form>
    </>
  );
}
