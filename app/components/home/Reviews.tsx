import { memo } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { pickLang, collectionField, type MultiLang } from '../../lib/homeBlockData';

/**
 * Custom Reviews (Triple) — home block.
 * Port of triple_twig `views/components/home/reviews.twig` + reviews.scss.
 * A `<salla-slider>` of merchant-authored review cards (name, avatar, stars, text); long reviews
 * get a "read more" that opens a `<salla-modal>` with the full text, plus a "view all" link.
 */

const MAX_LENGTH = 200;

interface ReviewRaw {
  [key: string]: unknown;
}

export interface ReviewsData {
  title?: MultiLang;
  subtitle?: MultiLang;
  has_bg?: boolean;
  items?: ReviewRaw[];
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface ReviewsProps {
  data: ReviewsData;
}

interface Review {
  name: string;
  image: string;
  rate: number;
  review: string;
  modalId: string;
  isLong: boolean;
}

function Stars({ rate }: { rate: number }) {
  return (
    <div className="w-full comment__rating text-sm rtl:space-x-reverse space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={`sicon-star2 inline-block ${star <= rate ? 'text-amber-400' : 'text-gray-400'}`}
        ></i>
      ))}
    </div>
  );
}

export const Reviews = memo(function Reviews({ data }: ReviewsProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const pos = data.position ?? 0;

  const reviews: Review[] = (Array.isArray(data.items) ? data.items : []).map((item, index) => {
    const review = pickLang(collectionField(item, 'items', 'review') as MultiLang, lang);
    return {
      name: pickLang(collectionField(item, 'items', 'name') as MultiLang, lang),
      image: (collectionField(item, 'items', 'image') as string) || '',
      rate: Number(collectionField(item, 'items', 'rate')) || 5,
      review,
      modalId: `testimonial-comment-${pos}-${index + 1}`,
      isLong: review.length > MAX_LENGTH,
    };
  });

  if (!reviews.length) return null;

  const title = pickLang(data.title, lang);
  const subtitle = pickLang(data.subtitle, lang);
  const longReviews = reviews.filter((r) => r.review && r.isLong);

  const openModal = (id: string) => (document.getElementById(id) as { open?: () => void } | null)?.open?.();

  return (
    <>
      <div className="container">
        <div className="testimonials__inner relative">
          {(title || subtitle) && (
            <div className="home-block-title">
              {title && (
                <h2 className="testimonials__title text-center text-store-text-primary text-2xl lg:text-3xl font-bold leading-tight">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="testimonials__subtitle text-center mt-2 text-store-text-secondary">
                  {subtitle}
                </p>
              )}
              <span className="enhanced-title-border home-block-line"></span>
            </div>
          )}

          <salla-slider
            className="reviews-slider s-scrollbar-slider"
            type="carousel"
            auto-play
            show-controls="false"
            id={`reviews-${pos}-slider`}
          >
            <div slot="items">
              {reviews.map((item, index) => (
                <div key={index} className="review anime-item swiper-slide">
                  <div className="testimonials__review-card flex flex-col justify-between h-full w-full p-[1.4rem] bg-store-bg-secondary rounded-md shadow-[rgba(50,_50,_105,_0.15)_0px_2px_5px_0px,_rgba(0,_0,_0,_0.05)_0px_1px_1px_0px]">
                    {item.review && (
                      <div className="testimonials__text-wrap relative text-store-text-secondary break-words">
                        <p className="testimonials__text leading-6 text-sm mb-2 mt-2.5 md:mt-4 text-store-text-primary">
                          {item.isLong ? (
                            <>
                              {`${item.review.slice(0, MAX_LENGTH)}... `}
                              <button
                                type="button"
                                className="testimonials__read-more text-primary cursor-pointer underline"
                                onClick={() => openModal(item.modalId)}
                                aria-label="Read More"
                              >
                                {t('blocks.home.read_more', 'Read more')}
                              </button>
                            </>
                          ) : (
                            item.review
                          )}
                        </p>
                      </div>
                    )}

                    <div className="testimonials__review-author flex items-center mt-6 -mx-2">
                      {item.image && (
                        <img
                          width={56}
                          height={56}
                          className="object-cover mx-2 rounded-full w-14 h-14"
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <div className="testimonials__review-author-info mx-2">
                        <p className="testimonials__review-author-name text-base mb-2 text-store-text-primary">
                          {item.name}
                        </p>
                        <Stars rate={item.rate} />
                      </div>
                    </div>
                    <i className="sicon-quote -scale-y-100 -scale-x-100 absolute top-4 end-4 text-3xl opacity-10 text-store-text-secondary"></i>
                  </div>
                </div>
              ))}
            </div>
          </salla-slider>
        </div>

        <div className="testimonials__view-all-wrap flex items-center gap-8 mt-5">
          <span className="h-px bg-gray-200 flex-1 block"></span>
          <Link
            className="btn btn--outline-primary h-10 grow-0 gap-1.5 group !px-2 !rounded-none"
            to="/testimonials"
          >
            <span>{t('blocks.home.display_all', 'View All')}</span>
            <i className="sicon-keyboard_arrow_left ltr:rotate-180 text-xl rtl:group-hover:-translate-x-2 ltr:group-hover:translate-x-2 transition-transform duration-300"></i>
          </Link>
          <span className="h-px bg-gray-200 flex-1 block"></span>
        </div>
      </div>

      {longReviews.map((long) => (
        <salla-modal key={long.modalId} id={long.modalId} width="sm">
          <div className="testimonials__modal">
            <div className="testimonials__review-author flex items-center mb-4 -mx-2">
              {long.image && (
                <img
                  width={56}
                  height={56}
                  className="object-cover mx-2 rounded-full w-14 h-14"
                  src={long.image}
                  alt={long.name}
                  loading="lazy"
                />
              )}
              <div className="testimonials__review-author-info mx-2">
                <p className="testimonials__review-author-name text-base mb-2 text-store-text-primary">
                  {long.name}
                </p>
                <Stars rate={long.rate} />
              </div>
            </div>
            <p
              className="testimonials__text leading-6 text-sm text-store-text-primary break-words"
              style={{ whiteSpace: 'pre-line' }}
            >
              {long.review}
            </p>
          </div>
        </salla-modal>
      ))}
    </>
  );
});
