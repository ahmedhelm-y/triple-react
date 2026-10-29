import { memo } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, asUrl, normalizeEndDate, type MultiLang } from '../../lib/homeBlockData';

/**
 * Offer Countdown (Triple) — home block.
 * Port of triple_twig `views/components/home/offer-countdown.twig` + offer-countdown.scss.
 * Texts at the start, the countdown + CTA in a frosted panel at the end, over an optional
 * image/video background. The countdown is Salla's `<salla-count-down>` (light DOM, so the
 * SCSS styles its inner `.s-count-down-*` parts).
 *
 * `--bg-color / --content-color / --overlay-opacity` are set inline on the component's own
 * `.tr-offer` element (the config className can't carry an inline style).
 */

export interface OfferCountdownData {
  add_top_space?: boolean;
  has_media?: boolean;
  is_video?: boolean;
  video_url?: string;
  bg_image?: string;
  bg_color?: string;
  content_color?: string;
  overlay_opacity?: number;
  title?: MultiLang;
  subtitle?: MultiLang;
  description?: MultiLang;
  end_datetime?: string;
  full_width?: boolean;
  end_text?: MultiLang;
  btn_text?: MultiLang;
  btn_link?: unknown;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface OfferCountdownProps {
  data: OfferCountdownData;
}

export const OfferCountdown = memo(function OfferCountdown({ data }: OfferCountdownProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const title = pickLang(data.title, lang);
  const subtitle = pickLang(data.subtitle, lang);
  const description = pickLang(data.description, lang);
  const endText = pickLang(data.end_text, lang);
  const btnText = pickLang(data.btn_text, lang);
  const btnLink = asUrl(data.btn_link);

  const endAt = normalizeEndDate(data.end_datetime);
  const hasVideo = Boolean(data.has_media && data.is_video && data.video_url);
  const hasImage = Boolean(data.has_media && !data.is_video && data.bg_image);
  const hasCta = Boolean(btnText && btnLink);
  const content = data.content_color || '#ffffff';

  const wrapperClass = [
    'tr-offer',
    hasVideo || hasImage ? 'tr-offer--media' : '',
    data.full_width ? '' : 'container tr-offer--boxed',
  ]
    .filter(Boolean)
    .join(' ');

  const style = {
    '--bg-color': data.bg_color || '#111827',
    '--content-color': content,
    '--overlay-opacity': (data.overlay_opacity ?? 25) / 100,
  } as CSSProperties;

  return (
    <div className={wrapperClass} style={style} data-position={data.position}>
      {(hasVideo || hasImage) && (
        <div className="tr-offer__bg" aria-hidden="true">
          {hasVideo ? (
            <video
              className="tr-offer__bg-media"
              src={data.video_url}
              muted
              loop
              playsInline
              autoPlay
              preload="none"
            />
          ) : (
            <img className="tr-offer__bg-media" src={data.bg_image} alt="" />
          )}
          <div className="tr-offer__shade"></div>
        </div>
      )}

      <div className="tr-offer__inner">
        <div className="tr-offer__text">
          {subtitle && <p className="tr-offer__kicker">{subtitle}</p>}
          {title && <h2 className="tr-offer__title">{title}</h2>}
          {description && (
            <p className="tr-offer__desc" style={{ whiteSpace: 'pre-line' }}>
              {description}
            </p>
          )}
        </div>

        {(endAt || hasCta) && (
          <div className="tr-offer__panel">
            {endAt && (
              <salla-count-down
                className="tr-offer__timer"
                date={endAt}
                labeled
                size="lg"
                style={{ color: content }}
                data-color={content}
                {...(endText ? { 'end-text': endText } : {})}
              ></salla-count-down>
            )}
            {hasCta && (
              <a href={btnLink} className="tr-offer__cta">
                <span>{btnText}</span>
                <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true"></i>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
