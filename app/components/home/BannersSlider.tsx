import { memo } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { collectionField, resolveOption, asUrl } from '../../lib/homeBlockData';

/**
 * Banners Slider (Triple) — home block.
 * Port of triple_twig `views/components/home/banners-slider.twig` + banners-slider.scss.
 * A `<salla-slider>` of full-width banners (per-language desktop/mobile image + link). The Swiper
 * `effect` and `autoplay` go through `slider-config` (not a typed salla-slider prop), spread as a
 * raw attribute.
 */

const EFFECTS = ['fade', 'slide', 'flip', 'cards', 'coverflow', 'cube'] as const;

interface BannerRaw {
  [key: string]: unknown;
}

export interface BannersSliderData {
  add_top_space?: boolean;
  full_width?: boolean;
  rounded?: boolean;
  show_controls?: boolean;
  autoplay?: boolean;
  effect?: unknown;
  fit_height?: boolean;
  object_fit?: boolean;
  banners?: BannerRaw[];
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface BannersSliderProps {
  data: BannersSliderData;
}

interface Banner {
  desktop: string;
  mobile: string | null;
  url: string;
}

export const BannersSlider = memo(function BannersSlider({ data }: BannersSliderProps) {
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');
  const effect = resolveOption(data.effect, EFFECTS, 'slide');

  const banners: Banner[] = (Array.isArray(data.banners) ? data.banners : [])
    .map((b) => {
      const hasEn = Boolean(collectionField(b, 'banners', 'has_en_media'));
      const useEn = isEn && hasEn;
      const imageEn = collectionField(b, 'banners', 'image_en') as string;
      const mobileEn = collectionField(b, 'banners', 'mobile_image_en') as string;
      const image = collectionField(b, 'banners', 'image') as string;
      const mobileImg = collectionField(b, 'banners', 'mobile_image') as string;
      const desktop = (useEn && imageEn) || image || '';
      const mobile = (useEn && mobileEn) || mobileImg || '';
      return {
        desktop: desktop || mobile,
        mobile: mobile && desktop && mobile !== desktop ? mobile : null,
        url: asUrl(collectionField(b, 'banners', 'url')),
      };
    })
    .filter((b) => b.desktop);

  if (!banners.length) return null;

  const rounded = data.rounded ? ' rounded-md' : '';
  const sliderExtra = {
    'slider-config': JSON.stringify({ effect, autoplay: Boolean(data.autoplay) }),
    'static-when-single': '',
  } as Record<string, string>;

  return (
    <div className={`banners-slider__inner ${data.full_width ? '' : 'container'}`}>
      <salla-slider
        id={`banners-slider--${data.position ?? 0}`}
        show-controls={data.show_controls ? 'true' : 'false'}
        pagination
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(sliderExtra as any)}
      >
        <div slot="items">
          {banners.map((banner, i) => (
            <a
              key={i}
              href={banner.url || '#'}
              className="swiper-slide"
              {...(banner.url ? {} : { 'aria-disabled': 'true' })}
            >
              <img
                style={{ height: 'auto', width: '100%' }}
                className={`banners-slider__image${rounded}${banner.mobile ? ' hidden md:block' : ''}`}
                src={banner.desktop}
                alt="Banner"
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
              {banner.mobile && (
                <img
                  style={{ height: 'auto', width: '100%' }}
                  className={`banners-slider__image banners-slider__image--mobile${rounded} md:hidden`}
                  src={banner.mobile}
                  alt="Banner"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              )}
            </a>
          ))}
        </div>
      </salla-slider>
    </div>
  );
});
