import { memo } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { asUrl } from '../../lib/homeBlockData';

/**
 * Double Banner (Triple) — home block.
 * Port of triple_twig `views/components/home/double-banner.twig` (static, no JS) + double-banner.scss.
 * Two side-by-side image banners (optional per-language image + link).
 */

export interface DoubleBannerData {
  fit_height?: boolean;
  rounded?: boolean;
  col_in_mobile?: boolean;
  first_banner_image?: string;
  first_banner_image_en?: string;
  first_banner_url?: unknown;
  second_banner_image?: string;
  second_banner_image_en?: string;
  second_banner_url?: unknown;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface DoubleBannerProps {
  data: DoubleBannerData;
}

export const DoubleBanner = memo(function DoubleBanner({ data }: DoubleBannerProps) {
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');

  const banners = [
    {
      key: 'first',
      image: (isEn && data.first_banner_image_en) || data.first_banner_image || '',
      url: asUrl(data.first_banner_url),
      // Triple orders anime-item last on the first banner, first on the second.
      cls: 'banner banner--fixed overflow-hidden basis-3/6 anime-item h-full',
    },
    {
      key: 'second',
      image: (isEn && data.second_banner_image_en) || data.second_banner_image || '',
      url: asUrl(data.second_banner_url),
      cls: 'anime-item banner banner--fixed overflow-hidden basis-3/6 h-full',
    },
  ].filter((b) => b.image);

  if (!banners.length) return null;

  return (
    <div className="container">
      <div
        className={`double-banner__row flex ${data.col_in_mobile ? 'flex-col md:flex-row' : ''} gap-2 md:gap-4`}
      >
        {banners.map((banner) => (
          <a
            key={banner.key}
            href={banner.url || '#'}
            aria-label="Banner"
            className={banner.cls}
            {...(banner.url ? {} : { 'aria-disabled': 'true' })}
          >
            <img
              width="1200"
              height="300"
              style={{ height: 'auto', width: '100%' }}
              className={`double-banner__image object-cover${data.rounded ? '' : ' !rounded-none'}`}
              src={banner.image}
              alt="Banner"
              loading="lazy"
              decoding="async"
            />
          </a>
        ))}
      </div>
    </div>
  );
});
