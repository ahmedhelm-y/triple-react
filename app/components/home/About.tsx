import { memo } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * About the Store (Triple) — home block.
 * Port of triple_twig `views/components/home/about.twig` (static, no JS) + about.scss.
 * Media in a rounded frame over an offset color plate; the text card overlaps the media edge.
 *
 * `--about-bg` (the merchant's component_bg) is set inline on the component's own `.tr-about`
 * wrapper — NOT on the engine's section element, which registerHomeComponentConfig can only
 * give a className, not an inline style. about.scss targets the `.tr-about` class, so moving it
 * from <section> to this inner <div> changes nothing visually.
 */

export interface AboutData {
  subtitle?: MultiLang;
  title?: MultiLang;
  description?: MultiLang;
  component_bg?: string;
  transparent_bg?: boolean;
  is_video?: boolean;
  video_url?: string;
  image?: string;
  reverse_layout?: boolean;
  btn_text?: MultiLang;
  btn_link?: unknown;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface AboutProps {
  data: AboutData;
}

function asUrl(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length) {
    const first = value[0] as { value?: string } | string;
    return typeof first === 'string' ? first : first?.value ?? '';
  }
  return '';
}

export const About = memo(function About({ data }: AboutProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const { store } = useTwilight();

  const subtitle = pickLang(data.subtitle, lang);
  const title = pickLang(data.title, lang);
  const description = pickLang(data.description, lang);
  const btnText = pickLang(data.btn_text, lang);
  const btnLink = asUrl(data.btn_link);

  const hasVideo = Boolean(data.is_video && data.video_url);
  const hasMedia = hasVideo || (!data.is_video && Boolean(data.image));
  const bg = data.transparent_bg ? 'transparent' : data.component_bg || '#eeeeee';

  const wrapperClass = [
    'tr-about',
    hasMedia ? 'tr-about--media' : 'tr-about--text',
    data.reverse_layout ? 'tr-about--reverse' : '',
    data.transparent_bg ? 'tr-about--transparent' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClass} style={{ '--about-bg': bg } as CSSProperties}>
      <div className="container">
        <div className="tr-about__grid">
          {hasMedia && (
            <div className="tr-about__media">
              <div className="tr-about__frame">
                {hasVideo ? (
                  <video
                    className="tr-about__visual"
                    src={data.video_url}
                    loop
                    muted
                    playsInline
                    autoPlay
                    preload="none"
                  />
                ) : (
                  <img
                    className="tr-about__visual"
                    src={data.image}
                    alt={title || store?.name || ''}
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
            </div>
          )}

          <div className="tr-about__card">
            {subtitle && <p className="tr-pill tr-about__kicker">{subtitle}</p>}
            {title && <h2 className="tr-about__title">{title}</h2>}
            {description && (
              <p className="tr-about__text" style={{ whiteSpace: 'pre-line' }}>
                {description}
              </p>
            )}
            {btnText && btnLink && (
              <a href={btnLink} className="tr-btn tr-about__btn">
                <span>{btnText}</span>
                <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true"></i>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
