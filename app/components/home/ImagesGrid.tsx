import { memo } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * Images Grid (Triple) — home block.
 * Port of triple_twig `views/components/home/images-grid.twig` + images-grid.scss.
 * A fixed 5-image mosaic (two tall columns + a right column, with a 2-up subgrid). Titles sit on
 * the images (gradient overlay) or under them (bottom_titles). All layout is Tailwind classes.
 */

export interface ImagesGridData {
  add_top_space?: boolean;
  rounded_images?: boolean;
  full_width?: boolean;
  bottom_titles?: boolean;
  titles_color?: string;
  remove_overlay?: boolean;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface ImagesGridProps {
  data: ImagesGridData;
}

interface Cell {
  index: number;
  image: string;
  title: string;
  url: string;
}

const HEIGHTS = [
  'h-[300px] md:h-[250px]',
  'h-[300px] md:h-[250px]',
  'h-[250px]',
  'h-[250px]',
  'h-[300px] md:h-[250px]',
];
const LAYOUTS = ['flex-grow', 'mb-4', '', '', 'flex-grow'];
const NAMES = ['one', 'two', 'three', 'four', 'five'] as const;

export const ImagesGrid = memo(function ImagesGrid({ data }: ImagesGridProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const rounded = data.rounded_images ? ' rounded-md' : '';

  const cells: Cell[] = NAMES.map((n, index) => ({
    index,
    image: (data[`image_${n}`] as string) || '',
    title: pickLang(data[`image_${n}_title`] as MultiLang, lang),
    url: (data[`image_${n}_link`] as string) || '',
  }));

  if (!cells.some((c) => c.image || c.title)) return null;

  const renderCell = (cell: Cell) => {
    const media = (
      <>
        {cell.image && (
          <img
            className="images-grid__image object-cover absolute inset-0 h-full w-full group-hover:scale-105 transition-transform duration-500 ease-in-out"
            src={cell.image}
            alt={cell.title}
            loading="lazy"
            decoding="async"
          />
        )}
        {!data.remove_overlay && (
          <div className="images-grid__overlay absolute inset-0 bg-gradient-to-b from-gray-900/25 to-gray-900/5"></div>
        )}
      </>
    );
    const disabled = cell.url ? {} : { 'aria-disabled': 'true' as const };
    const label = cell.title || `images-grid-${cell.index + 1}`;

    if (data.bottom_titles) {
      return (
        <a
          href={cell.url || '#'}
          className={`images-grid__item group relative flex flex-col ${LAYOUTS[cell.index]} anime-item`}
          aria-label={label}
          {...disabled}
        >
          <span
            className={`images-grid__media relative block overflow-hidden flex-grow ${HEIGHTS[cell.index]}${rounded}`}
          >
            {media}
          </span>
          {cell.title && (
            <h3 className="images-grid__title text-lg font-medium text-center pt-3 md:text-xl">
              {cell.title}
            </h3>
          )}
        </a>
      );
    }

    return (
      <a
        href={cell.url || '#'}
        className={`images-grid__item group relative flex flex-col overflow-hidden px-4 ${HEIGHTS[cell.index]} ${LAYOUTS[cell.index]}${rounded} anime-item`}
        aria-label={label}
        {...disabled}
      >
        {media}
        {cell.title && (
          <h3
            className="images-grid__title text-2xl font-medium absolute top-0 ltr:left-0 rtl:right-0 p-4 xs:text-xl md:text-3xl"
            style={data.titles_color ? ({ color: data.titles_color } as CSSProperties) : undefined}
          >
            {cell.title}
          </h3>
        )}
      </a>
    );
  };

  return (
    <div className={`container${data.full_width ? ' !max-w-full' : ''}`}>
      <div className="images-grid__grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 h-full">
        <div className="images-grid__col col-span-2 sm:col-span-1 md:col-span-2 h-auto md:h-full flex flex-col">
          {renderCell(cells[0])}
        </div>

        <div className="images-grid__col col-span-2 sm:col-span-1 md:col-span-2">
          {renderCell(cells[1])}
          <div className="images-grid__subgrid grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-2">
            {renderCell(cells[2])}
            {renderCell(cells[3])}
          </div>
        </div>

        <div className="images-grid__col col-span-2 sm:col-span-1 md:col-span-1 h-auto md:h-full flex flex-col">
          {renderCell(cells[4])}
        </div>
      </div>
    </div>
  );
});
