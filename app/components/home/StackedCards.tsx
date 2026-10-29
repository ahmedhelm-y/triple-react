import { memo } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import {
  pickLang,
  collectionField,
  resolveOption,
  asUrl,
  type MultiLang,
} from '../../lib/homeBlockData';

/**
 * Stacked Cards (Triple) — home block.
 * Port of triple_twig `views/components/home/stacked-cards.twig` (CSS-only, position: sticky) +
 * stacked-cards.scss. Big photo cards that stick a little lower than the previous one (--i) so
 * each new card slides over the one before it on scroll. `--stack-text` is set inline.
 */

interface CardRaw {
  [key: string]: unknown;
}

export interface StackedCardsData {
  kicker?: MultiLang;
  title?: MultiLang;
  cards?: CardRaw[];
  height?: unknown;
  text_color?: string;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface StackedCardsProps {
  data: StackedCardsData;
}

interface Card {
  image: string;
  label: string;
  title: string;
  text: string;
  btnText: string;
  link: string;
}

export const StackedCards = memo(function StackedCards({ data }: StackedCardsProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const cards: Card[] = (Array.isArray(data.cards) ? data.cards : [])
    .map((c) => ({
      image: (collectionField(c, 'cards', 'image') as string) || '',
      label: pickLang(collectionField(c, 'cards', 'label') as MultiLang, lang),
      title: pickLang(collectionField(c, 'cards', 'title') as MultiLang, lang),
      text: pickLang(collectionField(c, 'cards', 'text') as MultiLang, lang),
      btnText: pickLang(collectionField(c, 'cards', 'btn_text') as MultiLang, lang),
      link: asUrl(collectionField(c, 'cards', 'link')),
    }))
    .filter((c) => c.image && c.title);

  if (!cards.length) return null;

  const kicker = pickLang(data.kicker, lang);
  const title = pickLang(data.title, lang);
  const height = resolveOption(data.height, ['tall', 'medium'] as const, 'tall');
  const stackText = data.text_color || '#ffffff';

  return (
    <div className="container">
      {(kicker || title) && (
        <div className="tr-head">
          <div className="tr-head__text">
            {kicker && <p className="tr-head__subtitle">{kicker}</p>}
            {title && <h2 className="tr-head__title">{title}</h2>}
          </div>
        </div>
      )}

      <div
        className={`tr-stack tr-stack--${height}`}
        style={{ '--stack-text': stackText } as CSSProperties}
      >
        {cards.map((card, i) => {
          const num = i + 1 < 10 ? `0${i + 1}` : `${i + 1}`;
          return (
            <article
              key={i}
              className="tr-stack__card"
              style={{ '--i': i } as CSSProperties}
            >
              <img className="tr-stack__img" src={card.image} alt="" loading="lazy" decoding="async" />
              <div className="tr-stack__shade" aria-hidden="true"></div>
              <span className="tr-stack__num" aria-hidden="true">
                {num}
              </span>
              <div className="tr-stack__body">
                {card.label && <p className="tr-stack__label">{card.label}</p>}
                <h3 className="tr-stack__title">{card.title}</h3>
                {card.text && <p className="tr-stack__text">{card.text}</p>}
                {card.link && (
                  <a className="tr-stack__btn" href={card.link}>
                    <span>{card.btnText || t('blocks.home.stack_shop', 'Shop now')}</span>
                    <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true"></i>
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
});
