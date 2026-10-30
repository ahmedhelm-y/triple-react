import { memo, useMemo, type CSSProperties } from 'react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { collectionField, pickLang, resolveOption, type MultiLang } from '../../lib/homeBlockData';

/**
 * Review wall (home component: home.review-wall) — `.tr-wall`.
 * Port of triple_twig `views/components/home/review-wall.twig` + `04-components/review-wall.scss`.
 * A summary card (average stars, count, link to testimonials) beside a wall of review cards in three
 * columns; moving columns repeat their cards once and glide by half. CSS-only. Phones scroll sideways.
 * Section classes are set in router.tsx.
 */

interface VoiceRaw {
  [key: string]: unknown;
}
interface Voice {
  person: string;
  city: string;
  photo: string;
  stars: number;
  words: string;
}

export interface ReviewWallProps {
  data: {
    heading?: MultiLang;
    voices?: VoiceRaw[];
    moving?: boolean;
    position?: number;
    [key: string]: unknown;
  };
}

/** Wrapper `<section>` classes for `home.review-wall`. */
export const reviewWallConfig = {
  className: (data: ReviewWallProps['data']) =>
    ['s-block', 'tr-wall-block', `review-wall-${data.position ?? 0}`, data.custom_classes as string | undefined]
      .filter(Boolean)
      .join(' '),
};

const Stars = ({ on, big }: { on: number; big?: boolean }) => (
  <span className={`tr-wall__stars${big ? ' tr-wall__stars--big' : ''}`} aria-hidden="true">
    {[1, 2, 3, 4, 5].map((i) => (
      <i key={i} className={`sicon-star2${i <= on ? ' is-on' : ''}`} />
    ))}
  </span>
);

export const ReviewWall = memo(function ReviewWall({ data }: ReviewWallProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const heading = pickLang(data.heading, lang);

  const voices = useMemo<Voice[]>(() => {
    const raw = (data.voices as VoiceRaw[]) || [];
    const out: Voice[] = [];
    for (const v of raw) {
      const words = pickLang(collectionField(v, 'voices', 'words') as MultiLang, lang);
      if (!words) continue;
      out.push({
        person: pickLang(collectionField(v, 'voices', 'person') as MultiLang, lang),
        city: pickLang(collectionField(v, 'voices', 'city') as MultiLang, lang),
        photo: (collectionField(v, 'voices', 'photo') as string) || '',
        stars: Number(resolveOption(collectionField(v, 'voices', 'stars'), ['1', '2', '3', '4', '5'] as const, '5')),
        words,
      });
    }
    return out;
  }, [data.voices, lang]);

  if (!voices.length) return null;

  const average = Math.round((voices.reduce((s, v) => s + v.stars, 0) / voices.length) * 10) / 10;
  const moving = data.moving !== false && voices.length > 2;
  const columns: Voice[][] = [[], [], []];
  voices.forEach((v, i) => columns[i % 3].push(v));

  return (
    <div className="container">
      <div className={`tr-wall${moving ? ' tr-wall--moving' : ''}`}>
        <div className="tr-wall__summary">
          <h2 className="tr-wall__heading">{heading || t('blocks.home.wall_heading')}</h2>
          <p className="tr-wall__average">
            <b>{average}</b>
            <span>/5</span>
          </p>
          <Stars on={Math.round(average)} big />
          <p className="tr-wall__count">
            {voices.length} {t('blocks.home.wall_count')}
          </p>
          <Link className="tr-wall__all" to="testimonials">
            {t('blocks.home.wall_all')}
          </Link>
        </div>

        <div className="tr-wall__columns">
          {columns.map((own, ci) =>
            own.length ? (
              <div className="tr-wall__column" key={ci} style={{ '--wall-time': `${26 + ci * 6}s` } as CSSProperties}>
                <div className="tr-wall__run">
                  {(moving ? [1, 2] : [1]).map((copy) =>
                    own.map((voice, i) => (
                      <figure className="tr-wall__card" key={`${copy}-${i}`} aria-hidden={copy === 2 ? true : undefined}>
                        <span className="tr-wall__stars" role="img" aria-label={`${voice.stars}/5`}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <i key={s} className={`sicon-star2${s <= voice.stars ? ' is-on' : ''}`} aria-hidden="true" />
                          ))}
                        </span>
                        <blockquote>{voice.words}</blockquote>
                        {(voice.person || voice.photo) && (
                          <figcaption>
                            {voice.photo ? (
                              <img src={voice.photo} alt="" loading="lazy" decoding="async" />
                            ) : (
                              <span className="tr-wall__initial" aria-hidden="true">
                                {voice.person.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span>
                              <b>{voice.person}</b>
                              {voice.city && <small>{voice.city}</small>}
                            </span>
                          </figcaption>
                        )}
                      </figure>
                    ))
                  )}
                </div>
              </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
});
