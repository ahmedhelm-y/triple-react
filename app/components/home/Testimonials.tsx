import { memo } from 'react';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';

/**
 * `testimonials` home block (an engine default whose view Triple replaces) —
 * a slider of customer testimonials (avatar, name, text, stars), long ones
 * opening the full text in a `<salla-modal>`. With the `enable_second_reviews`
 * setting the block gets the "enhanced" look. Without server-provided items it
 * falls back to the native `<salla-reviews>`. Port of
 * `triple_twig/src/views/components/home/testimonials.twig`. Styling:
 * `04-components/triple-testimonials.scss` (+ shared `custom-reviews.scss`).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const MAX_LENGTH = 200;

interface TestimonialItemRaw {
  avatar?: string;
  name?: string;
  text?: string;
  stars?: number | string;
  [key: string]: unknown;
}

export interface TestimonialsData {
  items?: TestimonialItemRaw[];
  limit?: number | string;
  type?: string;
  sort?: string;
  hide_customer_info?: boolean;
  display_all_url?: string;
  position?: number;
  [key: string]: unknown;
}

function themeSetting(key: string): boolean {
  try {
    return !!(globalThis as any).salla?.config?.get?.(`theme.settings.${key}`);
  } catch {
    return false;
  }
}

export const testimonialsConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as TestimonialsData;
    const hasItems = Array.isArray(d.items) && d.items.length > 0;
    if (!hasItems) return 's-block s-block--testimonials container overflow-hidden';
    const enhanced = themeSetting('enable_second_reviews');
    return `s-block s-block--testimonials overflow-hidden s-block--animate relative${
      enhanced ? ' enhanced' : ''
    }`;
  },
};

const AVATAR_PLACEHOLDER = 'https://cdn.salla.network/images/s-empty.png?v=2.0.5';

function Stars({ stars }: { stars: number }) {
  if (!(stars > 0)) return null;
  return (
    <div className="w-full comment__rating text-sm rtl:space-x-reverse space-x-1">
      {Array.from({ length: Math.min(5, Math.round(stars)) }, (_, i) => (
        <i key={i} className="sicon-star2 inline-block text-amber-400" />
      ))}
    </div>
  );
}

export const Testimonials = memo(function Testimonials({ data }: { data: TestimonialsData }) {
  const { t } = useTranslation();
  const pos = data.position ?? 0;
  const items = Array.isArray(data.items) ? data.items : [];

  const openModal = (id: string) =>
    (document.getElementById(id) as { open?: () => void } | null)?.open?.();

  // No server items → the native reviews component (the Twig fallback).
  if (!items.length) {
    return (
      <salla-reviews
        {...({
          ...(data.display_all_url ? { 'display-all-link': true } : {}),
          ...(data.limit != null ? { limit: String(data.limit) } : {}),
          ...(data.sort ? { sort: data.sort } : {}),
          ...(data.hide_customer_info ? { 'hide-customer-info': true } : {}),
          ...(data.type ? { type: data.type } : {}),
        } as any)}
      />
    );
  }

  const autoplay = themeSetting('auto_play_products_slider');
  const longItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => (item.text || '').length > MAX_LENGTH);

  return (
    <div className="container">
      <div className="testimonials__inner relative">
        <div className="home-block-title">
          <h2
            data-triple="home-testimonials-title"
            className="testimonials__title text-center text-store-text-primary text-2xl lg:text-3xl font-bold leading-tight anime-item"
          >
            {t('blocks.home.testimonials', 'آراء العملاء')}
          </h2>
          <span className="enhanced-title-border home-block-line anime-item" />
        </div>

        <salla-slider
          className="reviews-slider s-scrollbar-slider"
          type="carousel"
          {...(autoplay ? { autoplay: true } : {})}
          show-controls="false"
          id="reviews--slider"
          {...({
            'slider-config': JSON.stringify({
              autoplay,
              spacebetween: 30,
              freeMode: { enabled: true, sticky: false },
              mousewheel: { enabled: true, forceToAxis: true },
              createElements: true,
              scrollbar: { auto: true, draggable: true },
            }),
          } as any)}
        >
          <div slot="items">
            {items.map((item, index) => {
              const text = item.text || '';
              const isLong = text.length > MAX_LENGTH;
              const stars = Number(item.stars) || 0;
              const avatar = item.avatar || '';
              return (
                <div key={index} className="review anime-item">
                  <div className="testimonials__review-card flex flex-col justify-between h-full w-full p-[1.4rem] bg-store-bg-secondary rounded-md shadow-[rgba(50,_50,_105,_0.15)_0px_2px_5px_0px,_rgba(0,_0,_0,_0.05)_0px_1px_1px_0px]">
                    <div className="testimonials__text-wrap relative text-store-text-primary break-words">
                      <p className="testimonials__text leading-6 text-sm mb-2 mt-2.5 md:mt-4 text-store-text-primary">
                        {isLong ? (
                          <>
                            {`${text.slice(0, MAX_LENGTH)}... `}
                            <button
                              type="button"
                              className="testimonials__read-more text-primary cursor-pointer underline"
                              onClick={() => openModal(`testimonial-comment--${index + 1}`)}
                              aria-label="Read More"
                            >
                              {t('blocks.home.read_more', 'اقرأ المزيد')}
                            </button>
                          </>
                        ) : (
                          text
                        )}
                      </p>
                    </div>

                    <div className="testimonials__review-author flex items-center mt-6 -mx-2">
                      <img
                        loading="lazy"
                        width={56}
                        height={56}
                        className="object-cover mx-2 rounded-full w-14 h-14"
                        src={avatar || AVATAR_PLACEHOLDER}
                        alt={item.name || ''}
                        decoding="async"
                      />
                      <div className="testimonials__review-author-info mx-2">
                        <p className="testimonials__review-author-name text-base mb-2 text-store-text-primary">
                          {item.name}
                        </p>
                        <Stars stars={stars} />
                      </div>
                    </div>
                    <i className="sicon-quote -scale-y-100 -scale-x-100 absolute top-4 end-4 text-3xl opacity-10 text-store-text-secondary" />
                  </div>
                </div>
              );
            })}
          </div>
        </salla-slider>
      </div>

      {longItems.map(({ item, index }) => {
        const stars = Number(item.stars) || 0;
        return (
          <salla-modal
            key={index}
            id={`testimonial-comment--${index + 1}`}
            className="singeCommentModal"
            {...({ icon: 'sicon-alert-engine', position: 'middle', width: 'lg', 'is-closable': 'true' } as any)}
          >
            <div className="text-center">
              <div className="testimonials-item swiper-slide w-full">
                <div className="p-2.5 md:p-5 h-full text-center">
                  {item.text}
                  <div className="flex items-center justify-center mt-5">
                    <div className="shrink-0">
                      <img
                        loading="lazy"
                        width={48}
                        height={48}
                        src={item.avatar || AVATAR_PLACEHOLDER}
                        alt={item.name || ''}
                        className="w-12 h-12 rounded-full border-2 border-primary object-cover"
                      />
                    </div>
                    <div className="ltr:ml-4 rtl:mr-4 ltr:text-left rtl:text-right">
                      <div className="font-bold">{item.name}</div>
                      <div className="testimonial__rating text-sm mt-2">
                        <salla-rating-stars size="small" value={stars} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </salla-modal>
        );
      })}
    </div>
  );
});
