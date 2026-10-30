import { memo, useMemo, type CSSProperties } from 'react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { asUrl, collectionField, pickLang, resolveOption, type MultiLang } from '../../lib/homeBlockData';

/**
 * Banner mosaic (home component: home.banner-mosaic) — `.tr-mosaic`.
 * Port of triple_twig `views/components/home/banner-mosaic.twig` + `04-components/banner-mosaic.scss`.
 * 1–6 banners in one block arranged by a CSS grid preset (row / lead / bento). CSS-only.
 * The section wrapper classes (`tr-mosaic-block banner-mosaic-{position}`) are set in router.tsx.
 */

type Arrangement = 'row' | 'lead' | 'bento';
type Corner = 'sharp' | 'soft' | 'round';
type Gutter = 'none' | 'narrow' | 'wide';
type Flow = 'stack' | 'swipe';

interface TileRaw {
  [key: string]: unknown;
}

export interface BannerMosaicProps {
  data: {
    tiles?: TileRaw[];
    arrangement?: unknown;
    corner?: unknown;
    gutter?: unknown;
    phone_flow?: unknown;
    position?: number;
    [key: string]: unknown;
  };
}

/** Wrapper `<section>` classes for `home.banner-mosaic` (matches the Twig section). */
export const bannerMosaicConfig = {
  className: (data: BannerMosaicProps['data']) =>
    ['s-block', 'tr-mosaic-block', `banner-mosaic-${data.position ?? 0}`, data.custom_classes as string | undefined]
      .filter(Boolean)
      .join(' '),
};

export const BannerMosaic = memo(function BannerMosaic({ data }: BannerMosaicProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const tiles = useMemo(() => {
    const raw = (data.tiles as TileRaw[]) || [];
    const field = (item: TileRaw, key: string) => collectionField(item, 'tiles', key);
    const str = (item: TileRaw, key: string) => {
      const v = field(item, key);
      return typeof v === 'string' ? v : '';
    };
    const out: { picture: string; caption: string; target: string }[] = [];
    for (const item of raw) {
      const english = str(item, 'picture_english');
      const picture = lang === 'en' && english ? english : str(item, 'picture');
      if (!picture) continue;
      out.push({
        picture,
        caption: pickLang(field(item, 'caption') as MultiLang, lang),
        target: asUrl(field(item, 'target')),
      });
    }
    return out;
  }, [data.tiles, lang]);

  if (!tiles.length) return null;

  const n = tiles.length;
  const corner = resolveOption(data.corner, ['sharp', 'soft', 'round'] as const, 'soft');
  const gutter = resolveOption(data.gutter, ['none', 'narrow', 'wide'] as const, 'narrow');
  const flow = resolveOption(data.phone_flow, ['stack', 'swipe'] as const, 'stack');
  const picked = resolveOption<Arrangement>(data.arrangement, ['row', 'lead', 'bento'], 'row');
  // A lead needs 2 tiles and a bento 4 — fewer fall back to the simpler arrangement.
  const arrangement: Arrangement = n === 1 ? 'row' : picked === 'bento' && n < 4 ? 'lead' : picked;

  return (
    <div className="container">
      <div
        className={`tr-mosaic tr-mosaic--${arrangement} tr-mosaic--n${n} tr-mosaic--${corner} tr-mosaic--gap-${gutter} tr-mosaic--${flow}`}
        style={{ '--tiles': n } as CSSProperties}
      >
        {tiles.map((tile, i) => {
          const inner = (
            <>
              <img className="tr-mosaic__img" src={tile.picture} alt={tile.caption} loading="lazy" decoding="async" />
              {tile.caption && (
                <span className="tr-mosaic__caption">
                  <span>{tile.caption}</span>
                  {tile.target && <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true" />}
                </span>
              )}
            </>
          );
          return tile.target ? (
            <Link key={i} className="tr-mosaic__tile" to={tile.target}>
              {inner}
            </Link>
          ) : (
            <div key={i} className="tr-mosaic__tile">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
});
