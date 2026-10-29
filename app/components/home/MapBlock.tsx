import { memo } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * Google Maps Location (Triple) — home block.
 * Port of triple_twig `views/components/home/map.twig` + map.scss.
 * Only the `src` of a Google Maps embed is used (the merchant's raw HTML is never rendered —
 * Salla review rule); the iframe is built here. `map_dark_mode` inverts the map in dark mode.
 */

export interface MapData {
  title?: MultiLang;
  subtitle?: MultiLang;
  map_code?: string;
  map_dark_mode?: boolean;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface MapProps {
  data: MapData;
}

// Accept either a full `<iframe src="…">` or a bare link; keep only a Google Maps embed src.
function extractMapSrc(raw?: string): string {
  const code = (raw || '').trim();
  let src = code.startsWith('<') ? code.split('src="')[1]?.split('"')[0] ?? '' : code;
  src = src.replace(/&amp;/g, '&');
  return src.startsWith('https://www.google.com/maps/embed') ? src : '';
}

export const MapBlock = memo(function MapBlock({ data }: MapProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const title = pickLang(data.title, lang);
  const subtitle = pickLang(data.subtitle, lang);
  const mapSrc = extractMapSrc(data.map_code);

  if (!mapSrc) return null;

  return (
    <>
      {(title || subtitle) && (
        <div className="container home-block-title">
          <div className="map__title-wrap mx-auto max-w-2xl text-center">
            {title && (
              <p className="map__title mt-2 text-3xl font-bold tracking-tight text-store-text-primary sm:text-4xl">
                {title}
              </p>
            )}
            {subtitle && (
              <p className="map__subtitle mt-2 text-lg leading-8 text-store-text-secondary">
                {subtitle}
              </p>
            )}
            <div className="my-2 mx-auto w-28 h-0 border-2 border-primary home-block-line"></div>
          </div>
        </div>
      )}
      <div className="map__media relative overflow-hidden">
        <div className="container">
          <iframe
            className="s-block--map__element mb-[-12%] rounded-xl shadow-2xl ring-1 ring-gray-900/10 h-[350px] md:h-[700px]"
            width="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={title || 'map'}
            src={mapSrc}
          ></iframe>
          <div className="relative" aria-hidden="true">
            <div className="map__fade absolute -inset-x-20 bottom-0 bg-gradient-to-t from-storeBG pt-[7%] mx-auto max-w-full"></div>
          </div>
        </div>
      </div>
    </>
  );
});
