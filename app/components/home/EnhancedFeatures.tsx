import { memo } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, collectionField, type MultiLang } from '../../lib/homeBlockData';

/**
 * Enhanced store features (Triple) — home block.
 * Port of triple_twig `views/components/home/enhanced-features.twig` (static, no JS) +
 * enhanced-features.scss. A 2-up (mobile) / 3-4-up (desktop) grid of feature cards, each an
 * icon (or image) + title + optional subtitle, with an animated hover border + lift.
 */

interface FeatureRaw {
  [key: string]: unknown;
}

export interface EnhancedFeaturesData {
  mini_features?: boolean;
  features?: FeatureRaw[];
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface EnhancedFeaturesProps {
  data: EnhancedFeaturesData;
}

export const EnhancedFeatures = memo(function EnhancedFeatures({ data }: EnhancedFeaturesProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const features = Array.isArray(data.features) ? data.features : [];
  const count = features.length;

  if (!count) return null;

  // Full class names so Tailwind generates both the 3- and 4-column layouts.
  const mdCols =
    count === 3
      ? 'md:grid-cols-[repeat(3,minmax(0,1fr))]'
      : 'md:grid-cols-[repeat(4,minmax(0,1fr))]';

  return (
    <div
      className={`enhanced-features__grid grid grid-cols-[repeat(2,minmax(0,1fr))] ${mdCols} gap-4 sm:gap-6 xl:gap-8`}
      data-length={count}
    >
      {features.map((feature, index) => {
        const title = pickLang(collectionField(feature, 'features', 'title') as MultiLang, lang);
        const subTitle = pickLang(
          collectionField(feature, 'features', 'sub_title') as MultiLang,
          lang
        );
        const image = (collectionField(feature, 'features', 'image') as string) || '';
        const icon = (collectionField(feature, 'features', 'icon') as string) || 'sicon-store2';

        return (
          <div
            key={index}
            className="s-block--enhanced-features__item group overflow-hidden anime-item"
          >
            <div className="absolute bottom-0 left-0 w-full h-px duration-300 origin-left transform scale-x-0 bg-primary group-hover:scale-x-100"></div>
            <div className="absolute bottom-0 left-0 w-px h-full duration-300 origin-bottom transform scale-y-0 bg-primary group-hover:scale-y-100"></div>
            <div className="absolute top-0 left-0 w-full h-px duration-300 origin-right transform scale-x-0 bg-primary group-hover:scale-x-100"></div>
            <div className="absolute bottom-0 right-0 w-px h-full duration-300 origin-top transform scale-y-0 bg-primary group-hover:scale-y-100"></div>
            <div className={`feature-icon${image ? ' has-image' : ''}`}>
              {image ? (
                <img className="max-h-24" src={image} alt={title} loading="lazy" decoding="async" />
              ) : (
                <i className={icon}></i>
              )}
            </div>
            <h2>{title}</h2>
            {subTitle && <p>{subTitle}</p>}
          </div>
        );
      })}
    </div>
  );
});
