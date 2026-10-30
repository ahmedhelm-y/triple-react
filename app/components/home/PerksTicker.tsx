import { memo, useMemo, type CSSProperties } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { collectionField, pickLang, resolveOption, type MultiLang } from '../../lib/homeBlockData';

/**
 * Perks ticker (home component: home.perks-ticker) — `.tr-perks`.
 * Port of triple_twig `views/components/home/perks-ticker.twig` + `04-components/perks-ticker.scss`.
 * The store's perks run along a band without end: the list is printed twice (the copy hidden from
 * screen readers) and slides by half its width — CSS-only, stops on hover and with reduced motion.
 * The section wrapper classes (`tr-perks tr-perks--{pace} …`) are set in router.tsx.
 */

interface PerkRaw {
  'perks.glyph'?: unknown;
  glyph?: unknown;
  'perks.words'?: unknown;
  words?: unknown;
  [key: string]: unknown;
}

export interface PerksTickerProps {
  data: {
    perks?: PerkRaw[];
    pace?: unknown;
    band_color?: string;
    band_ink?: string;
    tilted?: boolean;
    position?: number;
    [key: string]: unknown;
  };
}

/** Wrapper `<section>` classes for `home.perks-ticker` (matches the Twig section). */
export const perksTickerConfig = {
  renderOnMount: true,
  className: (data: PerksTickerProps['data']) => {
    const pace = resolveOption(data.pace, ['slow', 'normal', 'fast'] as const, 'normal');
    return [
      's-block',
      'tr-perks',
      data.tilted ? 'tr-perks--tilted' : '',
      `tr-perks--${pace}`,
      `perks-ticker-${data.position ?? 0}`,
      data.custom_classes as string | undefined,
    ]
      .filter(Boolean)
      .join(' ');
  },
};

export const PerksTicker = memo(function PerksTicker({ data }: PerksTickerProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const perks = useMemo(() => {
    const raw = (data.perks as PerkRaw[]) || [];
    return raw
      .map((perk) => ({
        glyph: (collectionField(perk, 'perks', 'glyph') as string) || '',
        words: pickLang(collectionField(perk, 'perks', 'words') as MultiLang, lang),
      }))
      .filter((perk) => perk.words);
  }, [data.perks, lang]);

  if (!perks.length) return null;

  const bandStyle = {
    '--perks-bg': data.band_color || '#111111',
    '--perks-ink': data.band_ink || '#ffffff',
  } as CSSProperties;
  // Enough repeats to overflow the band so the marquee has no gap.
  const repeat = perks.length < 4 ? 3 : 2;

  return (
    <div className="tr-perks__band" style={bandStyle}>
      <div className="tr-perks__run">
        {[1, 2].map((copy) => (
          <ul key={copy} className="tr-perks__list" aria-hidden={copy === 2 ? true : undefined}>
            {Array.from({ length: repeat }).map((_, i) =>
              perks.map((perk, j) => (
                <li key={`${i}-${j}`} aria-hidden={i > 0 ? true : undefined}>
                  {perk.glyph && <i className={perk.glyph} aria-hidden="true" />}
                  <span>{perk.words}</span>
                </li>
              ))
            )}
          </ul>
        ))}
      </div>
    </div>
  );
});
