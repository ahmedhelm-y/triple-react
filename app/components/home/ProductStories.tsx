import { Suspense, memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { product as productApi } from '@salla.sa/twilight-theme-engine/api/product';
import { Money } from '../common/Money';
import { collectionField, pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * Product stories (home component: home.product-stories) — `.tr-stories`.
 * Port of triple_twig `views/components/home/product-stories.twig` + `js/partials/product-stories.js`
 * (`<triple-stories>`) + `04-components/product-stories.scss`.
 * Round bubbles; a bubble opens a full-screen story player (vertical clips one after the other, progress
 * bars on top) with the story's product and an add-to-cart button. The products of all the stories are
 * fetched in one request the first time the player opens. Section classes are set in router.tsx.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function firstId(value: unknown): number | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value.length ? firstId(value[0]) : null;
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (Array.isArray(o.source_value)) return firstId(o.source_value[0]);
    if (o.id != null) return Number(o.id);
    if (o.value != null) return Number(o.value);
    return null;
  }
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function quickAdd(id: number | string) {
  const salla = (globalThis as unknown as { salla?: any }).salla;
  try {
    return Promise.resolve(salla?.cart?.addItem?.({ id, quantity: 1 }));
  } catch {
    return Promise.resolve();
  }
}

interface StoryRaw {
  [key: string]: unknown;
}
interface Story {
  cover: string;
  clip: string;
  caption: string;
  item: number | null;
}

export interface ProductStoriesData {
  heading?: MultiLang;
  stories?: StoryRaw[];
  ring_color?: string;
  position?: number;
  [key: string]: unknown;
}

export const productStoriesConfig: HomeComponentConfig = {
  className: (data) =>
    ['s-block', 'tr-stories-block', `product-stories-${(data as ProductStoriesData).position ?? 0}`, data.custom_classes as string | undefined]
      .filter(Boolean)
      .join(' '),
};

export const ProductStories = memo(function ProductStories({ data }: { data: ProductStoriesData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const heading = pickLang(data.heading, lang);

  const stories = useMemo<Story[]>(() => {
    const raw = (data.stories as StoryRaw[]) || [];
    const out: Story[] = [];
    for (const s of raw) {
      const cover = (collectionField(s, 'stories', 'cover') as string) || '';
      const clip = (collectionField(s, 'stories', 'clip') as string) || '';
      if (!(cover && clip)) continue;
      out.push({
        cover,
        clip,
        caption: pickLang(collectionField(s, 'stories', 'caption') as MultiLang, lang),
        item: firstId(collectionField(s, 'stories', 'item')),
      });
    }
    return out;
  }, [data.stories, lang]);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState(0);
  const [muted, setMuted] = useState(true);
  const [products, setProducts] = useState<Map<string, Product> | null>(null);
  const fetchedRef = useRef(false);

  const go = useCallback(
    (next: number) => {
      if (next < 0) next = 0;
      if (next >= stories.length) {
        dialogRef.current?.close();
        return;
      }
      setIndex(next);
      setSeen(0);
    },
    [stories.length]
  );

  const openPlayer = useCallback(
    (i: number) => {
      if (!fetchedRef.current) {
        fetchedRef.current = true;
        const ids = [...new Set(stories.map((s) => s.item).filter((x): x is number => x != null))];
        if (ids.length) {
          productApi
            .list({ source: 'selected', sourceValue: ids, perPage: ids.length })
            .then((res: any) => {
              const list: Product[] = Array.isArray(res) ? res : res?.data ?? [];
              setProducts(new Map(list.map((p) => [String(p.id), p])));
            })
            .catch(() => undefined);
        }
      }
      setOpen(true);
      setIndex(i);
      setSeen(0);
      dialogRef.current?.showModal();
    },
    [stories]
  );

  // Load + play the current story's clip whenever the player opens or the index changes.
  useEffect(() => {
    if (!open) return;
    const video = videoRef.current;
    const story = stories[index];
    if (!video || !story) return;
    video.src = story.clip;
    video.poster = story.cover;
    video.muted = muted;
    video.play()?.catch(() => undefined);
  }, [open, index, stories, muted]);

  const onClose = () => {
    setOpen(false);
    videoRef.current?.pause();
  };

  if (!stories.length) return null;

  const style = data.ring_color ? ({ '--story-ring': data.ring_color } as CSSProperties) : undefined;
  const current = stories[index];
  const product = current?.item != null ? products?.get(String(current.item)) : undefined;

  return (
    <div className="container block" style={style}>
      {heading && <h2 className="tr-stories__heading">{heading}</h2>}
      <div className="tr-stories__row">
        {stories.map((story, i) => (
          <button
            key={i}
            type="button"
            className="tr-stories__bubble"
            aria-label={`${t('blocks.home.story_open')} ${story.caption || i + 1}`}
            onClick={() => openPlayer(i)}
          >
            <span className="tr-stories__ring">
              <img src={story.cover} alt="" loading="lazy" decoding="async" />
            </span>
            {story.caption && <span className="tr-stories__caption">{story.caption}</span>}
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className="tr-stories__player"
        aria-label={heading || t('blocks.home.story_open')}
        onClose={onClose}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        onKeyDown={(e) => {
          const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
          const step = e.key === 'ArrowRight' ? (rtl ? -1 : 1) : e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0;
          if (step) go(index + step);
        }}
      >
        <div className="tr-stories__frame">
          <div className="tr-stories__bars" aria-hidden="true">
            {stories.map((_, i) => (
              <span key={i}>
                <i style={{ '--seen': i < index ? 1 : i === index ? seen : 0 } as CSSProperties} />
              </span>
            ))}
          </div>
          <div className="tr-stories__top">
            <span className="tr-stories__title">{current?.caption || ''}</span>
            <button
              type="button"
              className="tr-stories__icon"
              aria-label={t('blocks.home.story_sound')}
              aria-pressed={muted ? 'false' : 'true'}
              onClick={() => setMuted((m) => !m)}
            >
              <i className={muted ? 'sicon-volume-mute' : 'sicon-volume-high'} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="tr-stories__icon"
              aria-label={t('blocks.home.story_close')}
              onClick={() => dialogRef.current?.close()}
            >
              <i className="sicon-cancel" aria-hidden="true" />
            </button>
          </div>
          <video
            ref={videoRef}
            className="tr-stories__clip"
            playsInline
            preload="none"
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setSeen(v.currentTime / v.duration);
            }}
            onEnded={() => go(index + 1)}
          />
          <button
            type="button"
            className="tr-stories__tap tr-stories__tap--back"
            aria-label={t('blocks.home.story_back')}
            onClick={() => go(index - 1)}
          />
          <button
            type="button"
            className="tr-stories__tap tr-stories__tap--next"
            aria-label={t('blocks.home.story_next')}
            onClick={() => go(index + 1)}
          />
          <div className="tr-stories__product" hidden={!product}>
            {product && (
              <>
                <a className="tr-stories__item" href={product.url}>
                  {product.image?.url && <img src={product.image.url} alt="" />}
                  <span>
                    <b>{product.name}</b>
                    <span className="tr-stories__price">
                      <Money amount={product.sale_price || product.price} />
                    </span>
                  </span>
                </a>
                {product.is_available !== false && (
                  <button
                    type="button"
                    className="tr-stories__add"
                    aria-label={t('blocks.home.story_add')}
                    onClick={(e) => {
                      const button = e.currentTarget;
                      button.disabled = true;
                      quickAdd(product.id)
                        .catch(() => undefined)
                        .finally(() => (button.disabled = false));
                    }}
                  >
                    <i className="sicon-shopping-bag" aria-hidden="true" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
});
