import { memo, useCallback, useState } from 'react';
import { Money } from '../common/Money';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';
import { useLinkedProducts, productImage, productPrices, scrollTrackTo } from '../../lib/tripleProducts';

/**
 * `review-products` home block — customer reviews next to the product they
 * bought. Each slide has a lifestyle photo, a review (quote/name/city/rating)
 * and the linked product's card, all filled from one fetch when the block nears
 * the screen. Port of `triple_twig/src/views/components/home/review-products.twig`
 * + `partials/review-products.js`. Styling: `review-products.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type ItemRaw = Record<string, any>;

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

interface Slide {
  image: string;
  productId: string;
  quote: string;
  name: string;
  city: string;
  rating: number;
}

export interface ReviewProductsData {
  kicker?: MultiLang;
  panel_bg?: string;
  slides?: ItemRaw[];
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const reviewProductsConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as ReviewProductsData;
    const c = ['s-block', 'tr-voices-block', `review-products-${d.position ?? 0}`];
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

function buildSlides(raw: ItemRaw[] | undefined, lang: string): Slide[] {
  return (raw ?? [])
    .map((item) => ({
      image: item.image as string,
      productId: productId(item.product),
      quote: pickLang(item.quote as MultiLang, lang),
      name: pickLang(item.name as MultiLang, lang),
      city: pickLang(item.city as MultiLang, lang),
      rating: Math.min(5, Math.max(0, Number(item.rating ?? 5))),
    }))
    .filter((s) => s.quote && s.image);
}

export const ReviewProducts = memo(function ReviewProducts({ data }: { data: ReviewProductsData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const kicker = pickLang(data.kicker as MultiLang, lang);
  const slides = buildSlides(data.slides, lang);
  const total = slides.length;

  const ids = slides.map((s) => s.productId).filter(Boolean);
  const [trackRef, byId, loaded] = useLinkedProducts<HTMLDivElement>(ids);
  const [index, setIndex] = useState(0);

  const go = useCallback(
    (next: number) => {
      if (!total) return;
      const i = (next + total) % total;
      setIndex(i);
      const track = trackRef.current;
      const slide = track?.querySelector<HTMLElement>(`.tr-voices__slide[data-index="${i}"]`);
      scrollTrackTo(track, slide ?? null);
    },
    [total, trackRef]
  );

  if (!total) return null;

  const style = data.panel_bg ? ({ '--voices-bg': data.panel_bg } as React.CSSProperties) : undefined;

  return (
    <div className="container">
      <div className="tr-voices" style={style}>
        <div className="tr-voices__track" ref={trackRef}>
          {slides.map((slide, i) => {
            const product = slide.productId ? byId.get(slide.productId) : undefined;
            const image = product ? productImage(product) : '';
            const { price, compare } = product ? productPrices(product) : { price: 0, compare: null };
            const loading = !!slide.productId && !loaded;
            // once fetched, a product that wasn't returned (hidden/deleted) hides its card
            const hideCard = !!slide.productId && loaded && !product;
            return (
              <article
                className="tr-voices__slide"
                data-index={i}
                key={i}
                aria-roledescription="slide"
                aria-label={`${i + 1} / ${total}`}
              >
                <div className="tr-voices__media">
                  <img className="tr-voices__img" src={slide.image} alt={slide.name} loading="lazy" decoding="async" />
                  {slide.productId && !hideCard ? (
                      <a
                        className={`tr-voices__card ${loading ? 'is-loading' : ''}`}
                        href={product?.url || '#'}
                        data-product-id={slide.productId}
                        aria-label={product?.name || ''}
                      >
                        <span className="tr-voices__card-media">
                          {image ? (
                            <img src={image} alt="" width={240} height={240} loading="lazy" decoding="async" />
                          ) : null}
                        </span>
                        <span className="tr-voices__card-body">
                          <span className="tr-voices__card-name">{product?.name || ''}</span>
                          <span className="tr-voices__card-price">
                            {product ? (
                              <>
                                <span className={`tr-price ${compare ? 'is-sale' : ''}`}><Money amount={price} /></span>
                                {compare ? <del className="tr-price-compare"> <Money amount={compare} /></del> : null}
                              </>
                            ) : null}
                          </span>
                        </span>
                      </a>
                  ) : null}
                </div>

                <div className="tr-voices__panel">
                  {kicker ? <p className="tr-voices__kicker">{kicker}</p> : null}
                  {slide.rating ? (
                    <span className="tr-voices__stars" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <i className={`sicon-star2${n <= slide.rating ? ' is-on' : ''}`} key={n} />
                      ))}
                    </span>
                  ) : null}
                  <blockquote className="tr-voices__quote">
                    <i className="sicon-quote tr-voices__quote-icon" aria-hidden="true" />
                    <p>{slide.quote}</p>
                  </blockquote>
                  {slide.name || slide.city ? (
                    <div className="tr-voices__who">
                      {slide.name ? <p className="tr-voices__name">{slide.name}</p> : null}
                      {slide.city ? <p className="tr-voices__city">{slide.city}</p> : null}
                    </div>
                  ) : null}
                  {total > 1 ? (
                    <div className="tr-voices__nav">
                      <button
                        type="button"
                        className="tr-voices__arrow"
                        onClick={() => go(index - 1)}
                        aria-label={t('blocks.home.voices_prev', 'السابق')}
                      >
                        <i className="sicon-arrow-right ltr:rotate-180" aria-hidden="true" />
                      </button>
                      <span className="tr-voices__count" dir="ltr">
                        {i + 1} / {total}
                      </span>
                      <button
                        type="button"
                        className="tr-voices__arrow"
                        onClick={() => go(index + 1)}
                        aria-label={t('blocks.home.voices_next', 'التالي')}
                      >
                        <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
});
