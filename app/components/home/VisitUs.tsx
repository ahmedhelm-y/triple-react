import { memo, useMemo, useState } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { collectionField, pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * Visit us (home component: home.visit-us) — `.tr-visit`.
 * Port of triple_twig `views/components/home/visit-us.twig` + `js/partials/visit-us.js`
 * (the `<triple-visit>` custom element) + `04-components/visit-us.scss`.
 * Branch cards (with city chips when there are several cities) beside one Google Maps embed built from
 * `map_query`; picking a branch shows it on the map. Section classes are set in router.tsx.
 */

interface BranchRaw {
  [key: string]: unknown;
}
interface Branch {
  place: string;
  city: string;
  address: string;
  hours: string;
  phone: string;
  query: string;
}

export interface VisitUsProps {
  data: {
    heading?: MultiLang;
    intro?: MultiLang;
    branches?: BranchRaw[];
    muted_map?: boolean;
    position?: number;
    [key: string]: unknown;
  };
}

/** Wrapper `<section>` classes for `home.visit-us`. */
export const visitUsConfig = {
  className: (data: VisitUsProps['data']) =>
    ['s-block', 'tr-visit-block', `visit-us-${data.position ?? 0}`, data.custom_classes as string | undefined]
      .filter(Boolean)
      .join(' '),
};

const mapSrc = (query: string, lang: string) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed&hl=${lang}`;

export const VisitUs = memo(function VisitUs({ data }: VisitUsProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const heading = pickLang(data.heading, lang);
  const intro = pickLang(data.intro, lang);

  const { branches, cities } = useMemo(() => {
    const raw = (data.branches as BranchRaw[]) || [];
    const list: Branch[] = [];
    const citySet: string[] = [];
    for (const b of raw) {
      const place = pickLang(collectionField(b, 'branches', 'place') as MultiLang, lang);
      const city = (pickLang(collectionField(b, 'branches', 'city') as MultiLang, lang) || '').trim();
      const query = ((collectionField(b, 'branches', 'map_query') as string) || '').trim();
      if (!(place && query)) continue;
      list.push({
        place,
        city,
        address: pickLang(collectionField(b, 'branches', 'address') as MultiLang, lang),
        hours: pickLang(collectionField(b, 'branches', 'hours') as MultiLang, lang),
        phone: (collectionField(b, 'branches', 'phone') as string) || '',
        query,
      });
      if (city && !citySet.includes(city)) citySet.push(city);
    }
    return { branches: list, cities: citySet };
  }, [data.branches, lang]);

  const [city, setCity] = useState('');
  const [query, setQuery] = useState(() => branches[0]?.query || '');

  if (!branches.length) return null;

  return (
    <div className="container block">
      <div className="tr-visit__top">
        <h2 className="tr-visit__heading">{heading || t('blocks.home.visit_heading')}</h2>
        {intro && <p className="tr-visit__intro">{intro}</p>}
      </div>

      {cities.length > 1 && (
        <div className="tr-visit__cities" role="group" aria-label={t('blocks.home.visit_cities')}>
          <button type="button" aria-pressed={city === '' ? 'true' : 'false'} onClick={() => setCity('')}>
            {t('blocks.home.visit_all')}
          </button>
          {cities.map((c) => (
            <button key={c} type="button" aria-pressed={city === c ? 'true' : 'false'} onClick={() => setCity(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="tr-visit">
        <ul className="tr-visit__list">
          {branches.map((branch, i) => {
            const hidden = city !== '' && branch.city !== city;
            const on = branch.query === query;
            return (
              <li
                key={i}
                className={`tr-visit__branch${on ? ' is-on' : ''}`}
                data-city={branch.city}
                hidden={hidden || undefined}
              >
                <button
                  type="button"
                  className="tr-visit__pick"
                  aria-pressed={on ? 'true' : 'false'}
                  onClick={() => setQuery(branch.query)}
                >
                  <span className="tr-visit__place">{branch.place}</span>
                  {branch.address && (
                    <span className="tr-visit__line">
                      <i className="sicon-location" aria-hidden="true" />
                      {branch.address}
                    </span>
                  )}
                  {branch.hours && (
                    <span className="tr-visit__line">
                      <i className="sicon-time" aria-hidden="true" />
                      {branch.hours}
                    </span>
                  )}
                </button>
                <div className="tr-visit__links">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(branch.query)}`}
                    target="_blank"
                    rel="noopener"
                  >
                    {t('blocks.home.visit_route')}
                  </a>
                  {branch.phone && (
                    <a href={`tel:${branch.phone.replace(/\s/g, '')}`} dir="ltr">
                      {branch.phone}
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className={`tr-visit__map${data.muted_map ? ' is-muted' : ''}`}>
          <iframe
            src={mapSrc(query || branches[0].query, lang)}
            title={t('blocks.home.visit_map')}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
});
