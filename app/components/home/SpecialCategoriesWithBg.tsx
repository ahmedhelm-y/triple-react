import { memo } from 'react';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * `special-categories-with-bg` home block — a full-width background image with a
 * title and button, over which three category cards overlap. Port of
 * `triple_twig/src/views/components/home/special-categories-with-bg.twig`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type ItemRaw = Record<string, any>;

function field(item: ItemRaw, key: string): unknown {
  return item[key] ?? item[`categories.${key}`];
}

function unwrapCat(cat: any): Record<string, any> | undefined {
  if (cat == null) return undefined;
  if (Array.isArray(cat)) return unwrapCat(cat[0]);
  if (typeof cat === 'object') {
    const o = cat as Record<string, any>;
    if (o.name == null && o.url == null && Array.isArray(o.source_value)) return unwrapCat(o.source_value[0]);
    return o;
  }
  return { value: cat };
}

function catUrl(cat: Record<string, any> | undefined): string | null {
  if (!cat) return null;
  if (cat.url) return String(cat.url);
  const id = cat.id ?? cat.value;
  return id ? `/-/c${id}` : null;
}

export interface SpecialCategoriesWithBgData {
  title?: MultiLang;
  background?: string;
  btn_label?: MultiLang;
  rabt_alzr?: string;
  mini_images?: boolean;
  categories?: ItemRaw[];
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const specialCategoriesWithBgConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as SpecialCategoriesWithBgData;
    const c = ['s-block', 'relative', 'special-cats-with-bg', 's-block--animate', `special-cats-with-bg--${d.position ?? 0}`];
    if (d.mini_images) c.push('mini_images');
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

export const SpecialCategoriesWithBg = memo(function SpecialCategoriesWithBg({
  data,
}: {
  data: SpecialCategoriesWithBgData;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const title = pickLang(data.title as MultiLang, lang);
  const btnLabel = pickLang(data.btn_label as MultiLang, lang);
  const mini = !!data.mini_images;
  const background = data.background;

  const cards = (data.categories ?? [])
    .map((item) => {
      const cat = unwrapCat(field(item, 'cat'));
      const image = (field(item, 'image') as string) || (cat?.image as string) || null;
      const name = (cat?.name ?? cat?.label ?? null) as string | null;
      return { id: cat?.id ?? cat?.value ?? null, name, url: catUrl(cat), image };
    })
    .filter((c) => c.image || c.name);

  const bgImg = (extra = '') =>
    background ? (
      <img
        src={background}
        alt=""
        className={`special-cats-with-bg__bg-image h-full w-full object-cover object-center ${extra}`}
        loading="lazy"
      />
    ) : null;

  return (
    <>
      {/* desktop backdrop */}
      <div aria-hidden="true" className="special-cats-with-bg__backdrop absolute inset-0 hidden sm:flex sm:flex-col">
        <div className="relative w-full flex-1 bg-gray-800">
          <div className="absolute inset-0 overflow-hidden">{bgImg()}</div>
          <div className="special-cats-with-bg__overlay absolute inset-0 bg-gray-900 opacity-50" />
        </div>
        <div className="h-32 w-full bg-transoarent md:h-40 lg:h-48" />
      </div>

      <div className="special-cats-with-bg__header relative mx-auto max-w-3xl px-4 pb-36 text-center sm:px-6 sm:pb-0 lg:px-8">
        {/* mobile backdrop */}
        <div aria-hidden="true" className="special-cats-with-bg__backdrop--mobile absolute inset-0 flex flex-col sm:hidden">
          <div className="relative w-full flex-1 bg-gray-800">
            <div className="absolute inset-0 overflow-hidden">{bgImg()}</div>
            <div className="special-cats-with-bg__overlay absolute inset-0 bg-gray-900 opacity-50" />
          </div>
          <div className="h-48 w-full bg-storeBG -z-1" />
        </div>
        <div className="special-cats-with-bg__header-content relative py-32">
          {title ? (
            <h2
              data-triple="home-special-cats-bg-title"
              className="special-cats-with-bg__title text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl anime-item"
            >
              {title}
            </h2>
          ) : null}
          {btnLabel ? (
            <div className="special-cats-with-bg__cta mt-4 sm:mt-6 anime-item">
              <a
                data-triple="home-special-cats-bg-cta"
                href={data.rabt_alzr || '#'}
                className="special-cats-with-bg__button inline-block rounded-md border-b px-4 py-2 sm:px-8 sm:py-3 font-medium text-white"
              >
                {btnLabel}
              </a>
            </div>
          ) : null}
        </div>
      </div>

      {cards.length ? (
        <section aria-labelledby="collection-heading" className="special-cats-with-bg__cards relative -mt-56 sm:mt-0">
          <div
            className={`special-cats-with-bg__grid mx-auto grid max-w-md ${
              mini ? 'grid-cols-3 gap-x-4' : 'grid-cols-1 gap-y-6'
            } px-4 sm:max-w-7xl sm:grid-cols-3 sm:gap-x-6 sm:gap-y-0 sm:px-6 lg:gap-x-8 lg:px-8`}
          >
            {cards.map((card, i) => (
              <div
                key={i}
                data-triple="home-special-cats-bg-card"
                className={`special-cats-with-bg__card group anime-item relative ${
                  mini ? 'h-28' : 'h-80'
                } sm:h-96 rounded-lg bg-white shadow-xl`}
                {...(card.id ? { 'data-category': String(card.id) } : {})}
              >
                <div>
                  <div aria-hidden="true" className="special-cats-with-bg__card-media absolute inset-0 overflow-hidden rounded-lg">
                    <div className="absolute inset-0 overflow-hidden group-hover:opacity-75">
                      {card.image ? (
                        <img
                          src={card.image}
                          alt=""
                          className="special-cats-with-bg__card-image h-full w-full object-cover object-center"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="special-cats-with-bg__card-overlay absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-50" />
                  </div>
                  <div className="special-cats-with-bg__card-body absolute inset-0 flex items-end rounded-lg p-2 text-sm sm:p-6">
                    <div className="w-full">
                      <p className="special-cats-with-bg__card-title mt-1 text-white text-sm sm:text-xl">
                        <a aria-label="Catagory" href={card.url || '#'}>
                          <span className="absolute inset-0" />
                          <span className="category-name text-lg">{card.name}</span>
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
});
