import { memo, type CSSProperties } from 'react';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * `bold-categories` home block (Triple's `.tr-bold`) — category names in big
 * type stacked under each other; hovering a name reveals its photo beside it
 * (always shown small on touch). Port of
 * `triple_twig/src/views/components/home/bold-categories.twig` — CSS-only
 * interaction, styles in `04-components/bold-categories.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type ItemRaw = Record<string, any>;

function field(item: ItemRaw, key: string): unknown {
  return item[key] ?? item[`items.${key}`];
}

function pickValue(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) return pickValue(raw[0]);
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    return o.value != null ? String(o.value) : undefined;
  }
  return String(raw);
}

export interface BoldCategoriesData {
  kicker?: MultiLang;
  items?: ItemRaw[];
  show_numbers?: boolean;
  align?: unknown;
  text_color?: string;
  bg_color?: string;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const boldCategoriesConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as BoldCategoriesData;
    const c = ['s-block', 's-block--animate', 'tr-bold-block', `bold-categories-${d.position ?? 0}`];
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

export const BoldCategories = memo(function BoldCategories({ data }: { data: BoldCategoriesData }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const kicker = pickLang(data.kicker as MultiLang, lang);
  const align = (pickValue(data.align) ?? 'center') === 'start' ? 'start' : 'center';
  const numbers = data.show_numbers ?? true;

  const items = (data.items ?? [])
    .map((item) => ({
      title: pickLang(field(item, 'title') as MultiLang, lang),
      link: field(item, 'link') as string | undefined,
      image: field(item, 'image') as string | undefined,
    }))
    .filter((it) => it.title);

  if (!items.length) return null;

  const style: Record<string, string> = {};
  if (data.text_color) style['--bold-text'] = data.text_color;
  if (data.bg_color) style['--bold-bg'] = data.bg_color;

  return (
    <div className="container">
      <div
        className={`tr-bold tr-bold--${align}${data.bg_color ? ' tr-bold--boxed' : ''}`}
        style={style as CSSProperties}
      >
        {kicker ? <p className="tr-bold__kicker anime-item">{kicker}</p> : null}
        <ul className="tr-bold__list">
          {items.map((item, i) => {
            const Tag = item.link ? 'a' : 'span';
            const num = i + 1 < 10 ? `0${i + 1}` : String(i + 1);
            return (
              <li className="tr-bold__item anime-item" key={i}>
                <Tag className="tr-bold__link" {...(item.link ? { href: item.link } : {})}>
                  {numbers ? <span className="tr-bold__num">{num}</span> : null}
                  <span className="tr-bold__name">{item.title}</span>
                  {item.image ? (
                    <span className="tr-bold__photo" aria-hidden="true">
                      <img className="tr-bold__img" src={item.image} alt="" loading="lazy" decoding="async" />
                    </span>
                  ) : null}
                </Tag>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
});
