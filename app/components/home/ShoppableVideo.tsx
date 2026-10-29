import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Money } from '../common/Money';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';
import {
  useLinkedProducts,
  initLazyVideos,
  productImage,
  productPrices,
  quickAdd,
} from '../../lib/tripleProducts';

/**
 * `shoppable-video` home block — a wide muted video with the products seen in it
 * in a corner card (one at a time, taking turns every few seconds, paused on
 * hover). Play/pause + sound buttons; the dots pick a card; the bag button adds
 * it. Port of `triple_twig/src/views/components/home/shoppable-video.twig` +
 * `partials/shoppable-video.js`. Styling: `shoppable-video.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type ItemRaw = Record<string, any>;
const TURN = 4500;

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

export interface ShoppableVideoData {
  video_url?: string;
  poster?: string;
  kicker?: MultiLang;
  title?: MultiLang;
  text?: MultiLang;
  btn_text?: MultiLang;
  btn_link?: string;
  products?: ItemRaw[];
  height?: unknown;
  text_color?: string;
  overlay_opacity?: number;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const shoppableVideoConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as ShoppableVideoData;
    const c = ['s-block', 'tr-svideo-block', `shoppable-video-${d.position ?? 0}`];
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

function pickValue(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) return pickValue(raw[0]);
  if (typeof raw === 'object') return (raw as any).value != null ? String((raw as any).value) : undefined;
  return String(raw);
}

export const ShoppableVideo = memo(function ShoppableVideo({ data }: { data: ShoppableVideoData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const kicker = pickLang(data.kicker as MultiLang, lang);
  const title = pickLang(data.title as MultiLang, lang);
  const text = pickLang(data.text as MultiLang, lang);
  const btnText = pickLang(data.btn_text as MultiLang, lang);
  const height = pickValue(data.height) || 'tall';

  const ids = useMemo(
    () => (data.products ?? []).map((item) => productId(item.product)).filter(Boolean),
    [data.products]
  );
  const [rootRef, byId, loaded] = useLinkedProducts<HTMLDivElement>(ids);

  // resolved cards (a hidden/deleted product has no card)
  const cards = useMemo(() => ids.map((id) => ({ id, product: byId.get(id) })).filter((c) => c.product), [ids, byId]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const hoveredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // lazy-load the video itself
  useEffect(() => {
    if (!videoRef.current) return;
    const dispose = initLazyVideos(videoRef.current.parentNode as ParentNode);
    return dispose;
  }, []);

  const show = useCallback(
    (index: number, byVisitor = false) => {
      if (!cards.length) return;
      setActive((index + cards.length) % cards.length);
      if (byVisitor && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          if (!hoveredRef.current) setActive((cur) => (cur + 1) % cards.length);
        }, TURN * 2);
      }
    },
    [cards.length]
  );

  // start the turn timer once products are loaded
  useEffect(() => {
    if (!loaded || cards.length <= 1) return;
    timerRef.current = setInterval(() => {
      if (!hoveredRef.current) setActive((cur) => (cur + 1) % cards.length);
    }, TURN);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loaded, cards.length]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      video.removeAttribute('data-user-paused');
      setPlaying(true);
    } else {
      video.pause();
      video.setAttribute('data-user-paused', '');
      setPlaying(false);
    }
  };

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const [addingId, setAddingId] = useState<string | null>(null);
  const add = (id: string) => {
    if (addingId) return;
    setAddingId(id);
    quickAdd(id)
      .catch(() => {})
      .finally(() => setAddingId(null));
  };

  if (!data.video_url) return null;

  const style = {
    '--svideo-text': data.text_color || '#ffffff',
    '--svideo-shade': (data.overlay_opacity ?? 25) / 100,
  } as React.CSSProperties;

  return (
    <div className="container">
      <div className={`tr-svideo tr-svideo--${height === 'medium' ? 'medium' : 'tall'}`} style={style} ref={rootRef}>
        <video
          className="tr-svideo__video"
          muted
          loop
          playsInline
          /* eslint-disable-next-line react/no-unknown-property */
          {...({ 'webkit-playsinline': 'true' } as any)}
          preload="none"
          autoPlay
          data-lazy-video={data.video_url}
          ref={videoRef}
          {...(data.poster ? { poster: data.poster } : {})}
        />
        <div className="tr-svideo__shade" aria-hidden="true" />

        {kicker || title || text || (btnText && data.btn_link) ? (
          <div className="tr-svideo__text">
            {kicker ? <p className="tr-svideo__kicker">{kicker}</p> : null}
            {title ? <h2 className="tr-svideo__title">{title}</h2> : null}
            {text ? (
              <p className="tr-svideo__desc" dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br>') }} />
            ) : null}
            {btnText && data.btn_link ? (
              <a className="tr-svideo__btn" href={data.btn_link}>
                <span>{btnText}</span>
                <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="tr-svideo__controls">
          <button
            type="button"
            className="tr-svideo__control"
            aria-label={playing ? t('blocks.home.svideo_pause', 'إيقاف') : t('blocks.home.svideo_play', 'تشغيل')}
            onClick={togglePlay}
          >
            <i className={playing ? 'sicon-pause' : 'sicon-play'} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="tr-svideo__control"
            aria-label={muted ? t('blocks.home.svideo_sound_on', 'تشغيل الصوت') : t('blocks.home.svideo_sound_off', 'كتم')}
            onClick={toggleSound}
          >
            <i className={muted ? 'sicon-volume-mute' : 'sicon-volume-high'} aria-hidden="true" />
          </button>
        </div>

        {cards.length ? (
          <div
            className="tr-svideo__shop"
            onMouseEnter={() => (hoveredRef.current = true)}
            onMouseLeave={() => (hoveredRef.current = false)}
          >
            <div className="tr-svideo__cards">
              {cards.map((card, i) => {
                const product = card.product as any;
                const url = product.url || '#';
                const image = productImage(product);
                const { price, compare } = productPrices(product);
                return (
                  <div
                    className={`tr-svideo__card${active === i ? ' is-active' : ''}`}
                    data-product-id={card.id}
                    data-index={i}
                    key={card.id}
                  >
                    <a className="tr-svideo__media" href={url} tabIndex={-1} aria-hidden="true">
                      {image ? <img src={image} alt="" width={120} height={120} loading="lazy" decoding="async" /> : null}
                    </a>
                    <div className="tr-svideo__info">
                      <a className="tr-svideo__name" href={url}>
                        {product.name || ''}
                      </a>
                      <span className="tr-svideo__price">
                        <span className={`tr-price ${compare ? 'is-sale' : ''}`}><Money amount={price} /></span>
                        {compare ? <del className="tr-price-compare"> <Money amount={compare} /></del> : null}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`tr-svideo__add${addingId === card.id ? ' is-atc-loading' : ''}`}
                      aria-label={t('pages.cart.add_to_cart', 'أضف للسلة')}
                      onClick={() => add(card.id)}
                    >
                      <span className="tr-svideo__spinner" aria-hidden="true" />
                      <i className="sicon-shopping-bag" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
            {cards.length > 1 ? (
              <div className="tr-svideo__dots">
                {cards.map((card, i) => (
                  <button
                    type="button"
                    className={`tr-svideo__dot${active === i ? ' is-active' : ''}`}
                    data-svideo-dot={i}
                    aria-label={`${i + 1} / ${cards.length}`}
                    key={card.id}
                    onClick={() => show(i, true)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
});
