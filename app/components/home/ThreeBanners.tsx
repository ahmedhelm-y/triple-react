import { memo } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { asUrl } from '../../lib/homeBlockData';

/**
 * Three Banners (Triple) — home block.
 * Port of triple_twig `views/components/home/three-banners.twig` (static, no JS) + three-banners.scss.
 * Three side-by-side image banners (optional per-language image + link).
 */

export interface ThreeBannersData {
  fit_height?: boolean;
  rounded?: boolean;
  col_in_mobile?: boolean;
  first_banner_image?: string;
  first_banner_image_en?: string;
  first_banner_url?: unknown;
  second_banner_image?: string;
  second_banner_image_en?: string;
  second_banner_url?: unknown;
  third_banner_image?: string;
  third_banner_image_en?: string;
  third_banner_url?: unknown;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface ThreeBannersProps {
  data: ThreeBannersData;
}

export const ThreeBanners = memo(function ThreeBanners({ data }: ThreeBannersProps) {
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');

  const banners = (['first', 'second', 'third'] as const)
    .map((n, i) => ({
      index: i + 1,
      image:
        (isEn && (data[`${n}_banner_image_en`] as string)) ||
        (data[`${n}_banner_image`] as string) ||
        '',
      url: asUrl(data[`${n}_banner_url`]),
    }))
    .filter((b) => b.image);

  if (!banners.length) return null;

  return (
    <div className="container">
      <div
        className={`three-banners__row flex ${data.col_in_mobile ? 'flex-col sm:flex-row' : ''} gap-2 md:gap-4 items-stretch`}
      >
        {banners.map((banner) => (
          <a
            key={banner.index}
            href={banner.url || '#'}
            aria-label="Banner"
            className="banner banner--fixed overflow-hidden basis-3/6 anime-item flex h-auto"
            {...(banner.url ? {} : { 'aria-disabled': 'true' })}
          >
            <img
              width="1200"
              height="300"
              style={{ height: 'auto', width: '100%' }}
              className={`three-banners__image object-cover${data.rounded ? '' : ' !rounded-none'}`}
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
