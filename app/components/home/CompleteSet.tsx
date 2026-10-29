import { memo, useEffect, useMemo, useState } from 'react';
import { Money } from '../common/Money';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';
import { useLinkedProducts, productImage, productPrices, quickAdd } from '../../lib/tripleProducts';

/**
 * `complete-set` home block — "shop the set": a photo with a numbered marker per
 * product and a list of the products, each with a tick box; "add all" adds the
 * ticked, available products and the total follows the ticks. Port of
 * `triple_twig/src/views/components/home/complete-set.twig` +
 * `partials/complete-set.js`. Styling: `complete-set.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type ItemRaw = Record<string, any>;
type AnyProduct = Record<string, any>;

function productId(raw: unknown): string {
  if (raw == null) return '';
  if (Array.isArray(raw)) return raw.length ? productId(raw[0]) : '';
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (o.id != null && o.id !== '') return String(o.id);
    if (o.value != null && o.value !== '') return String(o.value);
    return '';
  }
  return String(raw);
}

interface SetItem {
  id: string;
  x: number;
  y: number;
}

export interface CompleteSetData {
  kicker?: MultiLang;
  title?: MultiLang;
  image?: string;
  items?: ItemRaw[];
  reverse?: boolean;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const completeSetConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as CompleteSetData;
    const c = ['s-block', 'tr-set-block', `complete-set-${d.position ?? 0}`];
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

function buildItems(raw: ItemRaw[] | undefined): SetItem[] {
  return (raw ?? [])
    .map((item) => ({
      id: productId(item.product),
      x: Math.min(100, Math.max(0, Number(item.x ?? 50))),
      y: Math.min(100, Math.max(0, Number(item.y ?? 50))),
    }))
    .filter((i) => i.id);
}

export const CompleteSet = memo(function CompleteSet({ data }: { data: CompleteSetData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const kicker = pickLang(data.kicker as MultiLang, lang);
  const title = pickLang(data.title as MultiLang, lang);
  const items = useMemo(() => buildItems(data.items), [data.items]);

  const ids = items.map((i) => i.id);
  const [rootRef, byId, loaded] = useLinkedProducts<HTMLDivElement>(ids);

  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [active, setActive] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const products = useMemo(() => items.map((i) => byId.get(i.id) || null), [items, byId]);

  // default: tick every available product once loaded
  useEffect(() => {
    if (!loaded) return;
    const next: Record<number, boolean> = {};
    products.forEach((p, i) => {
      if (p && p.is_available !== false) next[i] = true;
    });
    setChecked(next);
  }, [loaded, products]);

  const pickedIdx = products
    .map((p, i) => ({ p, i }))
    .filter(({ p, i }) => p && checked[i]);
  const total = pickedIdx.reduce((sum, { p }) => sum + productPrices(p as AnyProduct).price, 0);

  const addAll = async () => {
    if (adding || !pickedIdx.length) return;
    setAdding(true);
    try {
      for (const { p } of pickedIdx) {
        // one by one: the cart is updated by each call
        // eslint-disable-next-line no-await-in-loop
        await quickAdd((p as AnyProduct).id).catch(() => {});
      }
    } finally {
      setAdding(false);
    }
  };

  if (!items.length || !data.image) return null;

  return (
    <div className="container">
      <div
        className={`tr-set${data.reverse ? ' tr-set--reverse' : ''}${loaded ? ' is-loaded' : ''}`}
        ref={rootRef}
      >
        <div className="tr-set__media">
          <img className="tr-set__img" src={data.image} alt={title} loading="lazy" decoding="async" />
          {items.map((item, i) =>
            loaded && !products[i] ? null : (
              <button
                type="button"
                className={`tr-set__marker${active === i ? ' is-active' : ''}`}
                data-index={i}
                key={i}
                style={{ left: `${item.x}%`, top: `${item.y}%` }}
                aria-label={String(i + 1)}
                onMouseOver={() => setActive(i)}
                onMouseOut={() => setActive((cur) => (cur === i ? null : cur))}
                onClick={() => setActive(i)}
              >
                {i + 1}
              </button>
            )
          )}
        </div>

        <div className="tr-set__body">
          {kicker ? <p className="tr-pill">{kicker}</p> : null}
          {title ? <h2 className="tr-set__title">{title}</h2> : null}

          <ol className="tr-set__list">
            {items.map((item, i) => {
              const product = products[i];
              if (loaded && !product) return null;
              const loading = !loaded || !product;
              if (loading) {
                return (
                  <li className="tr-set__row is-loading" data-index={i} key={i}>
                    <span className="tr-set__num">{i + 1}</span>
                    <span className="tr-set__thumb" />
                    <span className="tr-set__info">
                      <span className="tr-set__line" />
                      <span className="tr-set__line tr-set__line--short" />
                    </span>
                  </li>
                );
              }
              const p = product as AnyProduct;
              const available = p.is_available !== false;
              const { price, compare } = productPrices(p);
              const image = productImage(p);
              const url = p.url || '#';
              return (
                <li
                  className={`tr-set__row${!checked[i] ? ' is-off' : ''}${active === i ? ' is-active' : ''}`}
                  data-index={i}
                  key={i}
                  onMouseOver={() => setActive(i)}
                  onMouseOut={() => setActive((cur) => (cur === i ? null : cur))}
                >
                  <label className="tr-set__check">
                    <input
                      type="checkbox"
                      className="tr-set__input"
                      data-index={i}
                      checked={!!checked[i]}
                      disabled={!available}
                      aria-label={p.name}
                      onChange={(e) => setChecked((prev) => ({ ...prev, [i]: e.target.checked }))}
                    />
                    <span className="tr-set__box" aria-hidden="true">
                      <i className="sicon-check" />
                    </span>
                  </label>
                  <span className="tr-set__num">{i + 1}</span>
                  <a className="tr-set__thumb" href={url} tabIndex={-1} aria-hidden="true">
                    {image ? <img src={image} alt="" width={80} height={80} loading="lazy" decoding="async" /> : null}
                  </a>
                  <span className="tr-set__info">
                    <a className="tr-set__name" href={url}>
                      {p.name}
                    </a>
                    {available ? null : (
                      <span className="tr-set__badge">{t('blocks.home.set_unavailable', 'غير متوفر')}</span>
                    )}
                  </span>
                  <span className="tr-set__prices">
                    <span className={`tr-set__price${compare ? ' is-sale' : ''}`}><Money amount={price} /></span>
                    {compare ? <span className="tr-set__compare"><Money amount={compare} /></span> : null}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="tr-set__footer">
            <div className="tr-set__total">
              <span className="tr-set__total-label">{t('blocks.triple.total', 'الإجمالي')}</span>
              <strong className="tr-set__total-value"><Money amount={total} /></strong>
            </div>
            <button
              type="button"
              className={`tr-btn tr-set__add${adding ? ' is-atc-loading' : ''}`}
              disabled={!pickedIdx.length}
              onClick={addAll}
            >
              <span className="tr-set__spinner" aria-hidden="true" />
              <i className="sicon-shopping-bag" aria-hidden="true" />
              <span>{t('blocks.home.set_add_all', 'أضف الكل للسلة')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
