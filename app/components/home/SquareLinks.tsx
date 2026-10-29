import { memo } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, collectionField, asUrl, type MultiLang } from '../../lib/homeBlockData';

/**
 * Square Links (Triple) — home block.
 * Port of triple_twig `views/components/home/square-links.twig` + square-links.scss.
 * A grid (default) or a `<salla-slider>` carousel of image links. The lazy-image swap becomes a
 * plain `loading="lazy"` image. salla-slider's extra Swiper config (only `autoplay` here) maps to
 * the typed `auto-play` attribute.
 */

interface LinkRaw {
  [key: string]: unknown;
}

export interface SquareLinksData {
  title?: MultiLang;
  description?: MultiLang;
  is_slider?: boolean;
  merge_links_with_top_component?: boolean;
  simplified_links?: boolean;
  vertical_links?: boolean;
  rounded_links?: boolean;
  grayscale_links?: boolean;
  auto_play?: boolean;
  show_controls?: boolean;
  centered_force?: boolean;
  full_width?: boolean;
  links?: LinkRaw[];
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface SquareLinksProps {
  data: SquareLinksData;
}

interface Link {
  image: string;
  title: string;
  subtitle: string;
  url: string;
}

export const SquareLinks = memo(function SquareLinks({ data }: SquareLinksProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const links: Link[] = (Array.isArray(data.links) ? data.links : [])
    .map((link) => ({
      image: (collectionField(link, 'links', 'image') as string) || '',
      title: pickLang(collectionField(link, 'links', 'title') as MultiLang, lang),
      subtitle: pickLang(collectionField(link, 'links', 'subtitle') as MultiLang, lang),
      url: asUrl(collectionField(link, 'links', 'url')),
    }))
    .filter((l) => l.image || l.title);

  if (!links.length) return null;

  const title = pickLang(data.title, lang);
  const description = pickLang(data.description, lang);
  const container = data.full_width ? '' : 'container';
  const rounded = data.rounded_links ? 'rounded-2xl' : '';
  const size = data.vertical_links
    ? { w: 300, h: 400, ratio: 'aspect-[3/4]' }
    : { w: 280, h: 260, ratio: 'aspect-[14/13]' };
  const imageClass = `${size.ratio}${data.grayscale_links ? ' grayscale hover:grayscale-0' : ''} w-full ${rounded} object-cover group-hover:scale-110 duration-400`;

  const items = links.map((link, i) => {
    const Tag = data.is_slider ? 'div' : 'li';
    const itemClass = data.is_slider
      ? `swiper-slide ${data.simplified_links ? 'slide--one-sixth' : 'slide--one-fourth'}`
      : 'square-links__item';
    return (
      <Tag key={i} className={`${itemClass} anime-item text-center group`}>
        <a href={link.url || '#'} aria-label={link.title || 'Link'}>
          <div className={`square-links__image-wrap overflow-hidden ${rounded}`}>
            <img
              width={size.w}
              height={size.h}
              className={imageClass}
              src={link.image}
              alt={link.title || 'Link Image'}
              loading="lazy"
              decoding="async"
            />
          </div>
          {link.title && (
            <h3 className="square-links__item-title mt-1 md:mt-2 text-base font-semibold leading-7 tracking-tight text-store-text-primary">
              {link.title}
            </h3>
          )}
          {link.subtitle && (
            <p className="square-links__item-subtitle text-sm leading-6 text-store-text-secondary">
              {link.subtitle}
            </p>
          )}
        </a>
      </Tag>
    );
  });

  return (
    <div>
      {(title || description) && (
        <div className="container text-center home-block-title">
          {title && (
            <h2 className="square-links__title text-3xl font-bold tracking-tight text-store-text-primary sm:text-4xl">
              {title}
            </h2>
          )}
          {description && (
            <p className="square-links__subtitle mt-2 text-lg leading-8 text-store-text-secondary">
              {description}
            </p>
          )}
          <span className="enhanced-title-border home-block-line"></span>
        </div>
      )}

      {data.is_slider ? (
        <div className={container}>
          <salla-slider
            id={`square-links-slider-${data.position ?? 0}`}
            className="s-scrollbar-slider"
            type="carousel"
            controls-outer
            show-controls={data.show_controls ? 'true' : 'false'}
            auto-play={Boolean(data.auto_play)}
          >
            <div slot="items">{items}</div>
          </salla-slider>
        </div>
      ) : (
        <ul role="list" className={`square-links__grid ${container} grid gap-x-6 gap-y-6 auto-fit-grid`}>
          {items}
        </ul>
      )}
    </div>
  );
});
