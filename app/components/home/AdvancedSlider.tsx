import { memo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { pickLang, collectionField, resolveOption, type MultiLang } from '../../lib/homeBlockData';

/**
 * Advanced Slider — Triple's hero slider (home.advanced-slider).
 * Port of triple_twig `views/components/home/advanced-slider.twig` + advanced-slider.scss.
 * A `<salla-slider>` of full-bleed image/video slides (per-language + mobile/desktop media), each
 * with a frosted caption panel (title / desc / button) positioned left/center/right. The Swiper
 * config (effect, speed, autoplay, loop, fade) goes through `slider-config` (raw attribute). The
 * height / default button colors (`--sliderHeight`, `--btnBg`, …) are set inline on the slider.
 */

const FITS = ['cover', 'contain', 'fill', 'none', 'scale-down'] as const;
const POSITIONS = [
  'center',
  'top',
  'bottom',
  'left',
  'right',
  'left-top',
  'left-bottom',
  'right-top',
  'right-bottom',
] as const;
const CONTENT_POS = ['left', 'center', 'right'] as const;

interface SlideRaw {
  [key: string]: unknown;
}

export interface AdvancedSliderData {
  auto_height?: boolean;
  slider_height?: number;
  mobile_slider_height?: number;
  slider_delay?: number;
  slider_speed?: number;
  effect?: unknown;
  add_top_space?: boolean;
  show_controls?: boolean;
  show_pagination?: boolean;
  slides?: SlideRaw[];
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface AdvancedSliderProps {
  data: AdvancedSliderData;
}

export const AdvancedSlider = memo(function AdvancedSlider({ data }: AdvancedSliderProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const isEn = lang.startsWith('en');
  const { store } = useTwilight();
  const storeName = store?.name || '';

  const slides = Array.isArray(data.slides) ? data.slides : [];
  const slidesCount = slides.length;
  const [ready, setReady] = useState<Set<number>>(() => new Set());
  const markReady = (i: number) => setReady((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));

  if (!slidesCount) return null;

  const effect = resolveOption(data.effect, ['fade', 'slide', 'cards', 'flip', 'coverflow', 'cube'] as const, 'fade');
  const autoHeight = Boolean(data.auto_height);
  const sliderHeight = autoHeight ? 'auto' : `${data.slider_height ?? 100}vh`;
  const mobileSliderHeight = autoHeight ? 'auto' : `${data.mobile_slider_height ?? 100}vh`;

  const cf = (s: SlideRaw, key: string) => collectionField(s, 'slides', key);
  const firstBg = (cf(slides[0], 'btn_bg') as string) || '#111111';
  const firstColor = (cf(slides[0], 'btn_color') as string) || '#ffffff';

  const sliderConfig = {
    effect,
    slidesPerView: 1,
    speed: (data.slider_speed ?? 2) * 1000,
    autoplay:
      slidesCount > 1 ? { delay: (data.slider_delay ?? 5) * 1000, disableOnInteraction: false } : false,
    allowTouchMove: slidesCount > 1,
    loop: slidesCount > 1,
    fadeEffect: { crossFade: true },
  };
  const sliderExtra = {
    'slider-config': JSON.stringify(sliderConfig),
    'static-when-single': '',
  } as Record<string, string>;

  const sliderStyle = {
    '--sliderHeight': sliderHeight,
    '--mobileSliderHeight': mobileSliderHeight,
    '--btnBg': firstBg,
    '--btnColor': firstColor,
  } as CSSProperties;

  return (
    <salla-slider
      id={`advanced-slider-${data.position ?? 0}`}
      show-controls={data.show_controls && slidesCount > 1 ? 'true' : 'false'}
      {...(autoHeight ? { 'auto-height': true } : {})}
      {...(data.show_pagination && slidesCount > 1 ? { pagination: true } : {})}
      style={sliderStyle}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(sliderExtra as any)}
    >
      <div slot="items">
        {slides.map((slide, i) => {
          const useEnMedia = isEn && Boolean(cf(slide, 'has_en_media'));
          const useEnVideo = isEn && Boolean(cf(slide, 'has_en_video'));
          const image = (useEnMedia && (cf(slide, 'image_en') as string)) || (cf(slide, 'image') as string) || '';
          const mobileImage =
            (useEnMedia && (cf(slide, 'mobile_image_en') as string)) ||
            (cf(slide, 'mobile_image') as string) ||
            image;
          const video = (useEnVideo && (cf(slide, 'video_url_en') as string)) || (cf(slide, 'video_url') as string) || '';
          const mobileVideo =
            (useEnVideo && (cf(slide, 'video_url_mobile_en') as string)) ||
            (cf(slide, 'video_url_mobile') as string) ||
            video;
          const isVideo = Boolean(cf(slide, 'is_video')) && Boolean(video);
          const fit = resolveOption(cf(slide, 'object_fit'), FITS, 'cover');
          const focus = resolveOption(cf(slide, 'object_position'), POSITIONS, 'center');
          const contentPos = resolveOption(cf(slide, 'content_position'), CONTENT_POS, 'left');
          const title = pickLang(cf(slide, 'title') as MultiLang, lang);
          const desc = pickLang(cf(slide, 'desc') as MultiLang, lang);
          const btnText = pickLang(cf(slide, 'btn_text') as MultiLang, lang);
          const btnLink = (cf(slide, 'btn_link') as string) || '';
          const fullLink = Boolean(cf(slide, 'full_link')) && Boolean(btnLink);
          const outlined = Boolean(cf(slide, 'outlined_btn'));
          const btnBg = (cf(slide, 'btn_bg') as string) || '#111111';
          const btnColor = (cf(slide, 'btn_color') as string) || '#ffffff';
          const mediaClass = `tr-hero__media object-${fit} object-${focus} w-full h-full`;
          const slideStyle = { '--btnBg': btnBg, '--btnColor': btnColor } as CSSProperties;
          const onReady = () => markReady(i);

          const media = isVideo ? (
            <>
              <video
                className={`${mediaClass} !block sm:!hidden`}
                src={mobileVideo}
                loop
                muted
                playsInline
                autoPlay
                preload="none"
                onLoadedData={onReady}
                onError={onReady}
              />
              <video
                className={`${mediaClass} !hidden sm:!block`}
                src={video}
                loop
                muted
                playsInline
                autoPlay
                preload="none"
                onLoadedData={onReady}
                onError={onReady}
              />
            </>
          ) : image ? (
            <>
              <img
                className={`${mediaClass} !block sm:!hidden`}
                src={mobileImage}
                alt={title || storeName}
                fetchPriority={i === 0 ? 'high' : undefined}
                loading={i === 0 ? 'eager' : 'lazy'}
                onLoad={onReady}
                onError={onReady}
              />
              <img
                className={`${mediaClass} !hidden sm:!block`}
                src={image}
                alt={title || storeName}
                fetchPriority={i === 0 ? 'high' : undefined}
                loading={i === 0 ? 'eager' : 'lazy'}
                onLoad={onReady}
                onError={onReady}
              />
            </>
          ) : null;

          const caption = (title || desc || btnText) && (
            <div className="tr-hero__caption">
              <div className="container">
                <div className={`tr-hero__align tr-hero__align--${contentPos}`}>
                  <div className="tr-hero__panel">
                    {title && <h2 className="tr-hero__title">{title}</h2>}
                    {desc && <p className="tr-hero__text">{desc}</p>}
                    {btnText &&
                      (btnLink && !fullLink ? (
                        <a href={btnLink} className={`tr-hero__btn${outlined ? ' is-outlined' : ''}`}>
                          <span>{btnText}</span>
                          <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true"></i>
                        </a>
                      ) : (
                        <span className={`tr-hero__btn${outlined ? ' is-outlined' : ''}`}>
                          <span>{btnText}</span>
                          <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true"></i>
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          );

          const inner = (
            <>
              {media}
              {caption}
            </>
          );

          return (
            <div
              key={i}
              className={`tr-hero__slide relative${ready.has(i) ? ' slide-ready' : ''}`}
              style={slideStyle}
            >
              {fullLink ? (
                <a href={btnLink} className="tr-hero__link block w-full h-full" aria-label={title || storeName}>
                  {inner}
                </a>
              ) : (
                inner
              )}
            </div>
          );
        })}
      </div>
    </salla-slider>
  );
});
