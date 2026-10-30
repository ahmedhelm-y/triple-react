import { memo, useMemo, type CSSProperties } from 'react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { asUrl, collectionField, pickLang, resolveOption, type MultiLang } from '../../lib/homeBlockData';

/**
 * Category arches (home component: home.category-arches) — `.tr-arches`.
 * Port of triple_twig `views/components/home/category-arches.twig` + `04-components/category-arches.scss`.
 * Categories (or any links) as photos cut in a shaped frame on a tint, the name and a short hint
 * under them; hover lifts the photo out of the frame. CSS-only.
 * The section wrapper classes (`tr-arches-block category-arches-{position}`) are set in router.tsx.
 */

type Shape = 'arch' | 'circle' | 'leaf' | 'ticket';
type Flow = 'swipe' | 'grid';

interface ArchRaw {
  [key: string]: unknown;
}

export interface CategoryArchesProps {
  data: {
    heading?: MultiLang;
    arches?: ArchRaw[];
    frame_shape?: unknown;
    per_row?: unknown;
    frame_tint?: string;
    phone_flow?: unknown;
    position?: number;
    [key: string]: unknown;
  };
}

/** Wrapper `<section>` classes for `home.category-arches` (matches the Twig section). */
export const categoryArchesConfig = {
  className: (data: CategoryArchesProps['data']) =>
    ['s-block', 'tr-arches-block', `category-arches-${data.position ?? 0}`, data.custom_classes as string | undefined]
      .filter(Boolean)
      .join(' '),
};

export const CategoryArches = memo(function CategoryArches({ data }: CategoryArchesProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const heading = pickLang(data.heading, lang);

  const arches = useMemo(() => {
    const raw = (data.arches as ArchRaw[]) || [];
    const field = (item: ArchRaw, key: string) => collectionField(item, 'arches', key);
    const str = (item: ArchRaw, key: string) => {
      const v = field(item, key);
      return typeof v === 'string' ? v : '';
    };
    const out: { photo: string; label: string; hint: string; target: string }[] = [];
    for (const item of raw) {
      const label = pickLang(field(item, 'label') as MultiLang, lang);
      const photo = str(item, 'photo');
      if (!(photo && label)) continue;
      out.push({ photo, label, hint: pickLang(field(item, 'hint') as MultiLang, lang), target: asUrl(field(item, 'target')) });
    }
    return out;
  }, [data.arches, lang]);

  if (!arches.length) return null;

  const shape = resolveOption<Shape>(data.frame_shape, ['arch', 'circle', 'leaf', 'ticket'], 'arch');
  const flow = resolveOption<Flow>(data.phone_flow, ['swipe', 'grid'], 'swipe');
  const perRow = resolveOption(data.per_row, ['4', '5', '6'] as const, '5');
  const listStyle = { '--arch-cols': perRow, '--arch-tint': data.frame_tint || '#f3efe7' } as CSSProperties;

  return (
    <div className="container">
      {heading && <h2 className="tr-arches__heading">{heading}</h2>}
      <ul className={`tr-arches tr-arches--${shape} tr-arches--${flow}`} style={listStyle}>
        {arches.map((arch, i) => {
          const inner = (
            <>
              <span className="tr-arches__frame">
                <img src={arch.photo} alt="" loading="lazy" decoding="async" />
              </span>
              <span className="tr-arches__label">{arch.label}</span>
              {arch.hint && <span className="tr-arches__hint">{arch.hint}</span>}
            </>
          );
          return (
            <li key={i}>
              {arch.target ? (
                <Link className="tr-arches__item" to={arch.target}>
                  {inner}
                </Link>
              ) : (
                <div className="tr-arches__item">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
});
