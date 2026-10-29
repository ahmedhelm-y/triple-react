import { memo, useCallback } from 'react';
import { Money } from '../common/Money';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';
import { useLinkedProducts, productImage, productPrices, scrollTrackTo } from '../../lib/tripleProducts';

/**
 * `shop-the-feed` home block — social photos in a sideways slider, each with
 * small thumbnails of the products seen in it (tip = name + price), all filled
 * from one fetch when the block nears the screen. Port of
 * `triple_twig/src/views/components/home/shop-the-feed.twig` +
 * `partials/shop-the-feed.js`. Styling: `shop-the-feed.scss`.
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

interface Post {
  image: string;
  link?: string;
  ids: string[];
}

export interface ShopTheFeedData {
  kicker?: MultiLang;
  title?: MultiLang;
  account_name?: string;
  account_link?: string;
  posts?: ItemRaw[];
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const shopTheFeedConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as ShopTheFeedData;
    const c = ['s-block', 'tr-feed-block', `shop-the-feed-${d.position ?? 0}`];
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

function buildPosts(raw: ItemRaw[] | undefined): Post[] {
  return (raw ?? [])
    .filter((item) => item.image)
    .map((item) => {
      const ids: string[] = [];
      for (let n = 1; n <= 2; n++) {
        const id = productId(item[`product_${n}`]);
        if (id) ids.push(id);
      }
      return { image: String(item.image), link: item.link as string | undefined, ids };
    });
}

export const ShopTheFeed = memo(function ShopTheFeed({ data }: { data: ShopTheFeedData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const kicker = pickLang(data.kicker as MultiLang, lang);
  const title = pickLang(data.title as MultiLang, lang);
  const posts = buildPosts(data.posts);
  const allIds = posts.flatMap((p) => p.ids);

  const [trackRef, byId, loaded] = useLinkedProducts<HTMLDivElement>(allIds);

  const currentIndex = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 0;
    const box = track.getBoundingClientRect();
    const rtl = getComputedStyle(track).direction === 'rtl';
    const list = [...track.querySelectorAll<HTMLElement>('.tr-feed__post')];
    const index = list.findIndex((post) => {
      const rect = post.getBoundingClientRect();
      return rtl ? rect.right <= box.right + 2 : rect.left >= box.left - 2;
    });
    return Math.max(0, index);
  }, [trackRef]);

  const step = useCallback(
    (direction: number) => {
      const track = trackRef.current;
      if (!track) return;
      const list = [...track.querySelectorAll<HTMLElement>('.tr-feed__post')];
      const count = list.length;
      let index = currentIndex() + direction;
      const end = track.scrollWidth - track.clientWidth - Math.abs(track.scrollLeft) < 4;
      if (direction > 0 && end) index = 0;
      if (index < 0) index = count - 1;
      scrollTrackTo(track, list[Math.min(index, count - 1)] ?? null);
    },
    [trackRef, currentIndex]
  );

  if (!posts.length) return null;

  return (
    <div className="container">
      <div className="tr-feed">
        <div className="tr-head">
          <div className="tr-head__text">
            {kicker ? <p className="tr-head__subtitle">{kicker}</p> : null}
            {title ? <h2 className="tr-head__title">{title}</h2> : null}
          </div>
          <div className="tr-head__action tr-feed__actions">
            {data.account_link ? (
              <a className="tr-feed__follow" href={data.account_link} target="_blank" rel="noopener">
                {data.account_name ? (
                  <span className="tr-feed__account" dir="ltr">
                    {data.account_name}
                  </span>
                ) : null}
                <span className="tr-feed__follow-btn">{t('blocks.home.feed_follow', 'تابعنا')}</span>
              </a>
            ) : null}
            {posts.length > 1 ? (
              <>
                <button
                  type="button"
                  className="tr-feed__arrow"
                  aria-label={t('blocks.home.feed_prev', 'السابق')}
                  onClick={() => step(-1)}
                >
                  <i className="sicon-arrow-right ltr:rotate-180" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="tr-feed__arrow"
                  aria-label={t('blocks.home.feed_next', 'التالي')}
                  onClick={() => step(1)}
                >
                  <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="tr-feed__track" ref={trackRef}>
          {posts.map((post, i) => (
            <figure className="tr-feed__post" data-index={i} key={i}>
              <img className="tr-feed__img" src={post.image} alt="" loading="lazy" decoding="async" />
              {post.link ? (
                <a
                  className="tr-feed__source"
                  href={post.link}
                  target="_blank"
                  rel="noopener"
                  aria-label={t('blocks.home.feed_open_post', 'افتح المنشور')}
                >
                  <i className="sicon-instagram" aria-hidden="true" />
                </a>
              ) : null}
              {post.ids.length ? (
                <figcaption className="tr-feed__products">
                  {post.ids.map((id) => {
                    const product = byId.get(id);
                    const hide = loaded && !product;
                    if (hide) return null;
                    const image = product ? productImage(product) : '';
                    const { price, compare } = product ? productPrices(product) : { price: 0, compare: null };
                    return (
                      <a
                        className={`tr-feed__product ${!product ? 'is-loading' : ''}`}
                        href={product?.url || '#'}
                        data-product-id={id}
                        aria-label={product?.name || ''}
                        key={id}
                      >
                        <span className="tr-feed__thumb">
                          {image ? <img src={image} alt="" width={96} height={96} loading="lazy" decoding="async" /> : null}
                        </span>
                        <span className="tr-feed__tip">
                          <span className="tr-feed__tip-name">{product?.name || ''}</span>
                          <span className="tr-feed__tip-price">
                            {product ? (
                              <>
                                <span className={`tr-price ${compare ? 'is-sale' : ''}`}><Money amount={price} /></span>
                                {compare ? <del className="tr-price-compare"> <Money amount={compare} /></del> : null}
                              </>
                            ) : null}
                          </span>
                        </span>
                      </a>
                    );
                  })}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
});
