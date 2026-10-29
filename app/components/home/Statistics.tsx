import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';

/**
 * Statistics (Triple) — home block.
 * Port of triple_twig `views/components/home/statistics.twig` + `js/partials/stats-counter.js`.
 * A row of stat items (icon in a colored circle, a number, a title, an optional description).
 * When `enable_count_animation` is on, each plain number ("1000" / "+1000") counts up from 0
 * once the block scrolls into view; non-numeric values ("24/7") are left as-is.
 *
 * NOTE: the merchant `stats` collection data shape (flat `icon` vs prefixed `stats.icon`, and
 * multilang title/description as string vs `{ar,en}`) is handled defensively here and still
 * needs a live-data check against the engine (see PROGRESS.md).
 */

type MultiLang = string | Record<string, string> | null | undefined;

interface StatItemRaw {
  icon?: string;
  bg_color?: string;
  number?: string;
  title?: MultiLang;
  description?: MultiLang;
  [key: string]: unknown;
}

export interface StatisticsData {
  enable_count_animation?: boolean;
  stats?: StatItemRaw[];
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface StatisticsProps {
  data: StatisticsData;
}

const DEFAULT_COLOR = '#004956';
const DEFAULT_ICON = 'sicon-store';

// A collection item's fields may arrive flat (`icon`) or prefixed (`stats.icon`).
function field(item: StatItemRaw, key: string): unknown {
  return item[key] ?? item[`stats.${key}`];
}

// A multilang value may arrive as a plain string or as a `{ ar, en }` object.
function pickLang(value: MultiLang, lang: string): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value[lang] ?? Object.values(value)[0] ?? '';
  }
  return String(value);
}

function StatNumber({ value, animate }: { value: string; animate: boolean }) {
  const raw = (value ?? '').toString().trim();
  const plus = raw.includes('+');
  const digits = raw.replace('+', '');
  const numeric = /^\d+$/.test(digits);
  const target = numeric ? parseInt(digits, 10) : 0;
  const [display, setDisplay] = useState(raw);

  useEffect(() => {
    if (!animate || !numeric) return;
    const step = target / 20;
    let current = 0;
    const fmt = (v: number) => (plus ? `+${v}` : `${v}`);
    setDisplay(fmt(0));
    const id = setInterval(() => {
      current += step;
      if (current >= target) {
        setDisplay(fmt(target));
        clearInterval(id);
      } else {
        setDisplay(fmt(Math.ceil(current)));
      }
    }, 100);
    return () => clearInterval(id);
  }, [animate, numeric, target, plus]);

  return <>{display}</>;
}

export const Statistics = memo(function Statistics({ data }: StatisticsProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const stats = Array.isArray(data.stats) ? data.stats : [];
  const enableCount = data.enable_count_animation !== false;

  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!enableCount) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setStarted(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setStarted(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enableCount]);

  if (!stats.length) return null;

  return (
    <div className="container" ref={ref}>
      <div className="statistics__list flex md:gap-15 items-start justify-center flex-wrap md:flex-nowrap">
        {stats.map((stat, index) => {
          const color = (field(stat, 'bg_color') as string) || DEFAULT_COLOR;
          const icon = (field(stat, 'icon') as string) || DEFAULT_ICON;
          const number = (field(stat, 'number') as string) ?? '';
          const title = pickLang(field(stat, 'title') as MultiLang, lang);
          const description = pickLang(field(stat, 'description') as MultiLang, lang);

          return (
            <div
              key={index}
              data-triple="home-statistics-item"
              className="statistics__item text-center w-1/2 md:w-1/4 mb-8 md:mb-0"
            >
              <div
                className="statistics__icon-wrap flex items-center justify-center w-10 h-10 mx-auto mb-3 rounded-full sm:w-12 sm:h-12"
                style={{ backgroundColor: color }}
              >
                <i className={`${icon} text-xl text-white`}></i>
              </div>
              <p className="stats-number text-4xl font-bold" style={{ color }}>
                <StatNumber value={number} animate={enableCount && started} />
              </p>
              <p className="statistics__title mb-2 text-2xl font-bold text-md text-store-text-primary">
                {title}
              </p>
              {description && (
                <p className="statistics__description text-store-text-secondary">{description}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
