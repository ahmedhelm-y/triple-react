import { memo, useState } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, collectionField, type MultiLang } from '../../lib/homeBlockData';

/**
 * Store Branches (Triple) — home block.
 * Port of triple_twig `views/components/home/store_branches.twig` + `js/partials/store-branches.js`.
 * Country tabs (optional) → city tabs → a Google Maps iframe. The JS active/hidden class dance
 * becomes React state. The tab shape (buttons/toggle/underline) is a class on the section.
 */

interface Raw {
  [key: string]: unknown;
}

export interface StoreBranchesData {
  title?: MultiLang;
  subtitle?: MultiLang;
  tab_shape?: unknown;
  multiple_countries?: boolean;
  countries?: Raw[];
  cities_multiple?: Raw[];
  cities_single?: Raw[];
  add_top_space?: boolean;
  full_width?: boolean;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface StoreBranchesProps {
  data: StoreBranchesData;
}

interface City {
  name: string;
  country: string;
  src: string;
}

// Keep only the src of a Google Maps iframe (double or single quoted), else use the raw link.
function extractSrc(code?: string): string {
  const c = (code || '').trim();
  let src = c;
  if (c.includes('src="')) src = c.split('src="')[1]?.split('"')[0] ?? '';
  else if (c.includes("src='")) src = c.split("src='")[1]?.split("'")[0] ?? '';
  return src.replace(/&amp;/g, '&');
}

function MapWrap({ src }: { src: string }) {
  return (
    <div className="store-branches__map-wrap mb-6">
      <div className="map-container w-full h-80 rounded-lg overflow-hidden border border-gray-200 shadow-md">
        <iframe
          className="s-block--store-branches__map-element w-full h-full"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="store map"
          src={src}
        ></iframe>
      </div>
    </div>
  );
}

export const StoreBranches = memo(function StoreBranches({ data }: StoreBranchesProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const multiple = Boolean(data.multiple_countries);

  const title = pickLang(data.title, lang);
  const subtitle = pickLang(data.subtitle, lang);

  const group = multiple ? 'cities_multiple' : 'cities_single';
  const cities: City[] = (Array.isArray(data[group]) ? (data[group] as Raw[]) : [])
    .map((city) => ({
      name: pickLang(collectionField(city, group, 'city_name') as MultiLang, lang),
      country: multiple
        ? pickLang(collectionField(city, group, 'country_name') as MultiLang, lang).trim()
        : '',
      src: extractSrc(collectionField(city, group, 'map_code') as string),
    }))
    .filter((c) => c.name);

  const countries: string[] = multiple
    ? (Array.isArray(data.countries) ? data.countries : [])
        .map((c) => pickLang(collectionField(c, 'countries', 'name') as MultiLang, lang).trim())
        .filter(Boolean)
    : [];

  const [activeCountry, setActiveCountry] = useState(() => countries[0] ?? '');
  const [activeCity, setActiveCity] = useState(() => {
    const list = multiple ? cities.filter((c) => c.country === (countries[0] ?? '')) : cities;
    return list[0]?.name ?? '';
  });

  const selectCountry = (country: string) => {
    setActiveCountry(country);
    setActiveCity(cities.find((c) => c.country === country)?.name ?? '');
  };

  if (!cities.length) return null;

  return (
    <>
      {(title || subtitle) && (
        <div className="container home-block-title">
          <div className="store-branches__title-wrap mx-auto max-w-2xl text-center">
            {title && (
              <p className="store-branches__title mt-2 text-3xl font-bold tracking-tight text-store-text-primary sm:text-4xl">
                {title}
              </p>
            )}
            {subtitle && (
              <p className="store-branches__subtitle mt-2 text-lg leading-8 text-store-text-secondary">
                {subtitle}
              </p>
            )}
            <span className="enhanced-title-border home-block-line"></span>
          </div>
        </div>
      )}

      <div className="store-branches__body relative overflow-hidden">
        <div className={data.full_width ? 'px-4 md:px-8' : 'container'}>
          {multiple && countries.length > 0 ? (
            <div className="store-branches-multiple-countries">
              <div className="country-tabs-container mb-8">
                <div className="btn-tabs-container">
                  {countries.map((country) => (
                    <button
                      key={country}
                      className={`btn-tab-primary country-tab${country === activeCountry ? ' active' : ''}`}
                      onClick={() => selectCountry(country)}
                    >
                      <i className="sicon-flag"></i>
                      <span>{country}</span>
                    </button>
                  ))}
                </div>
              </div>

              {countries.map((country) => {
                const countryCities = cities.filter((c) => c.country === country);
                return (
                  <div
                    key={country}
                    className={`country-content${country === activeCountry ? ' active' : ' hidden'}`}
                  >
                    {countryCities.length > 0 && (
                      <div className="store-branches__layout flex flex-col lg:flex-row gap-6">
                        <div className="store-branches__sidebar lg:w-64 flex-shrink-0">
                          <div className="btn-tabs-vertical">
                            {countryCities.map((city) => (
                              <button
                                key={city.name}
                                className={`btn-tab-secondary city-tab-vertical${city.name === activeCity && country === activeCountry ? ' active' : ''}`}
                                onClick={() => setActiveCity(city.name)}
                              >
                                <i className="sicon-location"></i>
                                <span>{city.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="store-branches__panel flex-1">
                          {countryCities.map((city) => (
                            <div
                              key={city.name}
                              className={`city-content${city.name === activeCity && country === activeCountry ? ' active' : ' hidden'}`}
                            >
                              {city.src && <MapWrap src={city.src} />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="store-branches-single-country">
              <div className="city-tabs-container mb-8">
                <div className="btn-tabs-container">
                  {cities.map((city) => (
                    <button
                      key={city.name}
                      className={`btn-tab-primary city-tab${city.name === activeCity ? ' active' : ''}`}
                      onClick={() => setActiveCity(city.name)}
                    >
                      <i className="sicon-location"></i>
                      <span>{city.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {cities.map((city) => (
                <div
                  key={city.name}
                  className={`city-content${city.name === activeCity ? ' active' : ' hidden'}`}
                >
                  {city.src && <MapWrap src={city.src} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
});
