import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { asUrl, collectionField, pickLang, resolveOption, type MultiLang } from '../../lib/homeBlockData';

/**
 * Brand story (home component: home.brand-story) — `.tr-story`.
 * Port of triple_twig `views/components/home/brand-story.twig` + `js/partials/brand-story.js`
 * (the `<triple-story>` custom element) + `04-components/brand-story.scss`.
 * A photo collage (big + inset picture and a turning seal) beside the story, the founder's signature,
 * and a row of figures that count up when they come on screen. Section classes are set in router.tsx.
 */

interface FigureRaw {
  [key: string]: unknown;
}
interface Figure {
  amount: number;
  suffix: string;
  caption: string;
}

export interface BrandStoryProps {
  data: {
    main_photo?: string;
    inset_photo?: string;
    seal_text?: MultiLang;
    kicker?: MultiLang;
    headline?: MultiLang;
    story?: MultiLang;
    signature?: MultiLang;
    cta?: MultiLang;
    target?: unknown;
    figures?: FigureRaw[];
    photo_side?: unknown;
    position?: number;
    [key: string]: unknown;
  };
}

/** Wrapper `<section>` classes for `home.brand-story`. */
export const brandStoryConfig = {
  className: (data: BrandStoryProps['data']) =>
    ['s-block', 'tr-story-block', `brand-story-${data.position ?? 0}`, data.custom_classes as string | undefined]
      .filter(Boolean)
      .join(' '),
};

/** Figures that count from 0 to their amount once the row scrolls into view. */
function Figures({ figures }: { figures: Figure[] }) {
  const ref = useRef<HTMLDListElement>(null);
  const [values, setValues] = useState(() => figures.map((f) => f.amount));

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    let done = false;
    const run = () => {
      done = true;
      const start = performance.now();
      const duration = 1600;
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setValues(figures.map((f) => Math.round(f.amount * eased)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !done) run();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [figures]);

  return (
    <dl className="tr-story__figures" ref={ref}>
      {figures.map((figure, i) => (
        <div className="tr-story__figure" key={i}>
          <dt>
            <span>{values[i]}</span>
            {figure.suffix}
          </dt>
          {figure.caption && <dd>{figure.caption}</dd>}
        </div>
      ))}
    </dl>
  );
}

export const BrandStory = memo(function BrandStory({ data }: BrandStoryProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const kicker = pickLang(data.kicker, lang);
  const headline = pickLang(data.headline, lang);
  const story = pickLang(data.story, lang);
  const signature = pickLang(data.signature, lang);
  const cta = pickLang(data.cta, lang);
  const seal = pickLang(data.seal_text, lang);
  const side = resolveOption(data.photo_side, ['start', 'end'] as const, 'start');
  const target = asUrl(data.target);
  const position = data.position ?? 0;

  const figures = useMemo<Figure[]>(() => {
    const raw = (data.figures as FigureRaw[]) || [];
    const out: Figure[] = [];
    for (const item of raw) {
      const amount = Number(collectionField(item, 'figures', 'amount'));
      if (!Number.isFinite(amount) || collectionField(item, 'figures', 'amount') === '') continue;
      out.push({
        amount,
        suffix: (collectionField(item, 'figures', 'suffix') as string) || '',
        caption: pickLang(collectionField(item, 'figures', 'caption') as MultiLang, lang),
      });
    }
    return out;
  }, [data.figures, lang]);

  if (!(headline || story || data.main_photo)) return null;

  return (
    <div className="container block">
      <div className={`tr-story tr-story--${side}${data.main_photo ? '' : ' tr-story--no-photo'}`}>
        {data.main_photo && (
          <div className="tr-story__collage">
            <img className="tr-story__main" src={data.main_photo} alt={headline} loading="lazy" decoding="async" />
            {data.inset_photo && (
              <img className="tr-story__inset" src={data.inset_photo} alt="" loading="lazy" decoding="async" />
            )}
            {seal && (
              <svg className="tr-story__seal" viewBox="0 0 120 120" aria-hidden="true">
                <defs>
                  <path id={`story-seal-${position}`} d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
                </defs>
                <circle cx="60" cy="60" r="58" />
                <text>
                  <textPath href={`#story-seal-${position}`}>
                    {seal} • {seal} •
                  </textPath>
                </text>
              </svg>
            )}
          </div>
        )}

        <div className="tr-story__words">
          {kicker && <span className="tr-story__kicker">{kicker}</span>}
          {headline && <h2 className="tr-story__headline">{headline}</h2>}
          {story && (
            <p className="tr-story__text">
              {story.split('\n').map((line, i, all) => (
                <Fragment key={i}>
                  {line}
                  {i < all.length - 1 && <br />}
                </Fragment>
              ))}
            </p>
          )}
          {signature && <p className="tr-story__signature">{signature}</p>}

          {figures.length > 0 && <Figures figures={figures} />}

          {cta && target && (
            <Link className="tr-story__cta" to={target}>
              <span>{cta}</span>
              <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
});
