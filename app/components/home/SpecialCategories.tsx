import { memo } from 'react';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * `special-categories` home block — a large main category banner (image +
 * title/subtitle/link) beside three small category banners. Port of
 * `triple_twig/src/views/components/home/special-categories.twig`.
 * Styling: `04-components/special-categories.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function unwrapCat(cat: any): Record<string, any> | undefined {
  if (cat == null) return undefined;
  if (Array.isArray(cat)) return unwrapCat(cat[0]);
  if (typeof cat === 'object') {
    const o = cat as Record<string, any>;
    if (o.name == null && o.url == null && o.value == null && Array.isArray(o.source_value)) {
      return unwrapCat(o.source_value[0]);
    }
    return o;
  }
  return { value: cat };
}

function catUrl(cat: Record<string, any> | undefined): string {
  if (!cat) return '#';
  if (cat.url) return String(cat.url);
  const id = cat.id ?? cat.value;
  return id ? `/-/c${id}` : '#';
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

export interface SpecialCategoriesData {
  add_top_space?: boolean;
  hide_btns?: boolean;
  enhanced_btns?: boolean;
  mini_images?: boolean;
  object_contain?: boolean;
  cat_one?: unknown;
  cat_one_title?: MultiLang;
  cat_one_subtitle?: MultiLang;
  cat_one_color?: string;
  cat_one_link_text?: MultiLang;
  cat_one_text_align?: unknown;
  cat_one_image?: string;
  cat_two?: unknown;
  cat_two_image?: string;
  cat_three?: unknown;
  cat_three_image?: string;
  cat_four?: unknown;
  cat_four_image?: string;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const specialCategoriesConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as SpecialCategoriesData;
    const c = ['special-categories'];
    if (d.add_top_space) c.push('s-block');
    if (d.hide_btns) c.push('hide-btns');
    if (d.enhanced_btns) c.push('enhanced_btns');
    if (d.mini_images) c.push('mini_images');
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

export const SpecialCategories = memo(function SpecialCategories({ data }: { data: SpecialCategoriesData }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const fit = data.object_contain ? 'object-contain' : 'object-cover';

  const cats = (['one', 'two', 'three', 'four'] as const).map((n) => {
    const cat = unwrapCat(data[`cat_${n}`]);
    return {
      name: (cat?.name ?? cat?.label ?? null) as string | null,
      url: catUrl(cat),
      image: data[`cat_${n}_image`] as string | undefined,
    };
  });

  const main = cats[0];
  if (!main?.image) return null;

  const title = pickLang(data.cat_one_title as MultiLang, lang);
  const subtitle = pickLang(data.cat_one_subtitle as MultiLang, lang);
  const linkTxt = pickLang(data.cat_one_link_text as MultiLang, lang);
  const align = (pickValue(data.cat_one_text_align) ?? 'right') === 'left' ? 'left' : 'right';
  const color = data.cat_one_color || '#111111';
  const smalls = cats.slice(1);

  return (
    <div className="special-categories__inner">
      <div className="special-categories__content">
        <div className="single-banner animated">
          <a href={main.url} aria-label={main.name || 'Category'}>
            <img
              data-triple="home-special-categories-main-image"
              className={`special-categories__main-image w-full ${fit} h-full`}
              src={main.image}
              width={1187}
              height={720}
              alt={main.name || 'Category'}
              loading="lazy"
            />
          </a>
          {title || subtitle || linkTxt ? (
            <div className={`banner-wrapper-infor ${align} main`}>
              <div className="info">
                <div className="content">
                  {subtitle ? (
                    <div className="single-banner-subtitle" style={{ color }}>
                      {subtitle}
                    </div>
                  ) : null}
                  {title ? (
                    <h3 className="title-banner" style={{ color }}>
                      {title}
                    </h3>
                  ) : null}
                  {linkTxt ? (
                    <a className="banner-button" href={main.url} style={{ color }} aria-label={linkTxt}>
                      {linkTxt}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="group-banner">
          {smalls.map((cat, i) =>
            cat.image ? (
              <div className={`banner-${i + 1} animated`} key={i}>
                <div className="banner-image">
                  <a href={cat.url} aria-label={cat.name || 'Category'}>
                    <img
                      data-triple={`home-special-categories-banner-${i + 1}-image`}
                      className={`special-categories__banner-image w-full ${fit} h-full`}
                      src={cat.image}
                      width={i === 0 ? 735 : 368}
                      height={360}
                      alt={cat.name || 'Category'}
                      loading="lazy"
                    />
                  </a>
                </div>
                {cat.name ? (
                  <div className="banner-wrapper-infor">
                    <div className="info">
                      <div className="content">
                        <a className="banner-button" href={cat.url} aria-label={cat.name}>
                          {cat.name}
                        </a>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
});
