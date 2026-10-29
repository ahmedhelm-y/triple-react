import { memo } from 'react';
import { Money } from '../common/Money';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';
import { useLinkedProducts, productImage, productPrices } from '../../lib/tripleProducts';

/**
 * `compare-products` home block — a product comparison table. The rows come from
 * the settings; each product column's image/name/price/link are filled from one
 * fetch when the block nears the screen, with Salla's add-to-cart button. Port
 * of `triple_twig/src/views/components/home/compare-products.twig` +
 * `partials/compare-products.js`. Styling: `compare-products.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type ItemRaw = Record<string, any>;

const YES = ['✓', '✔', '+', 'yes', 'Yes', 'نعم'];
const NO = ['✗', '✘', 'x', 'X', '-', 'no', 'No', 'لا'];

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

interface Col {
  id: string;
  badge: string;
}
interface Row {
  label: string;
  values: { text: string; kind: 'yes' | 'no' | 'text' }[];
}

export interface CompareProductsData {
  kicker?: MultiLang;
  title?: MultiLang;
  subtitle?: MultiLang;
  products?: ItemRaw[];
  rows?: ItemRaw[];
  highlight?: number;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const compareProductsConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as CompareProductsData;
    const c = ['s-block', 'tr-cmp-block', `compare-products-${d.position ?? 0}`];
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

export const CompareProducts = memo(function CompareProducts({ data }: { data: CompareProductsData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const kicker = pickLang(data.kicker as MultiLang, lang);
  const title = pickLang(data.title as MultiLang, lang);
  const subtitle = pickLang(data.subtitle as MultiLang, lang);
  const highlight = Number(data.highlight ?? 0);

  const products: Col[] = (data.products ?? [])
    .map((item) => ({ id: productId(item.product), badge: pickLang(item.badge as MultiLang, lang) }))
    .filter((p) => p.id)
    .slice(0, 4);

  const rows: Row[] =
    products.length >= 2
      ? (data.rows ?? [])
          .map((row) => {
            const label = pickLang(row.label as MultiLang, lang);
            const values = products.map((_, i) => {
              const text = pickLang(row[`value_${i + 1}`] as MultiLang, lang).trim();
              const kind = YES.includes(text) ? 'yes' : NO.includes(text) ? 'no' : 'text';
              return { text, kind: kind as 'yes' | 'no' | 'text' };
            });
            return { label, values };
          })
          .filter((r) => r.label)
      : [];

  const ids = products.map((p) => p.id);
  const [scrollRef, byId, loaded] = useLinkedProducts<HTMLDivElement>(ids);

  if (products.length < 2) return null;

  const style = { '--cmp-cols': products.length } as React.CSSProperties;

  return (
    <div className="container">
      <div className="tr-cmp">
        {kicker || title || subtitle ? (
          <div className="tr-cmp__intro">
            {kicker ? <p className="tr-pill">{kicker}</p> : null}
            {title ? <h2 className="tr-cmp__title">{title}</h2> : null}
            {subtitle ? (
              <p className="tr-cmp__text" dangerouslySetInnerHTML={{ __html: subtitle.replace(/\n/g, '<br>') }} />
            ) : null}
          </div>
        ) : null}

        <div className="tr-cmp__scroll" ref={scrollRef} style={style}>
          <table className="tr-cmp__table">
            <thead>
              <tr>
                <th scope="col" className="tr-cmp__corner">
                  <span className="sr-only">{t('blocks.home.compare_feature', 'الميزة')}</span>
                </th>
                {products.map((col, i) => {
                  const product = byId.get(col.id);
                  const missing = loaded && !product;
                  const url = product?.url || '#';
                  const image = product ? productImage(product) : '';
                  const { price, compare } = product ? productPrices(product) : { price: 0, compare: null };
                  return (
                    <th
                      scope="col"
                      className={`tr-cmp__product${highlight === i + 1 ? ' is-highlight' : ''}${
                        !loaded ? ' is-loading' : ''
                      }${missing ? ' is-missing' : ''}`}
                      data-product-id={col.id}
                      key={i}
                    >
                      {col.badge ? <span className="tr-cmp__badge">{col.badge}</span> : null}
                      <a className="tr-cmp__media" href={url} tabIndex={-1} aria-hidden="true">
                        {image ? <img src={image} alt="" width={240} height={240} loading="lazy" decoding="async" /> : null}
                      </a>
                      <a className="tr-cmp__name" href={url}>
                        {product?.name || ''}
                      </a>
                      <span className="tr-cmp__price">
                        {product ? (
                          <>
                            <span className={`tr-price ${compare ? 'is-sale' : ''}`}><Money amount={price} /></span>
                            {compare ? <del className="tr-price-compare"> <Money amount={compare} /></del> : null}
                          </>
                        ) : null}
                      </span>
                      {missing ? null : (
                        <salla-add-product-button
                          class="tr-cmp__add"
                          product-id={col.id}
                          width="wide"
                          {...((product?.status ? { 'product-status': product.status } : {}) as any)}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            {rows.length ? (
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    <th scope="row" className="tr-cmp__label">
                      {row.label}
                    </th>
                    {row.values.map((value, vi) => (
                      <td className={`tr-cmp__cell${highlight === vi + 1 ? ' is-highlight' : ''}`} key={vi}>
                        {value.kind === 'yes' ? (
                          <>
                            <i className="sicon-check tr-cmp__yes" aria-hidden="true" />
                            <span className="sr-only">{t('blocks.home.compare_yes', 'نعم')}</span>
                          </>
                        ) : value.kind === 'no' ? (
                          <>
                            <i className="sicon-cancel tr-cmp__no" aria-hidden="true" />
                            <span className="sr-only">{t('blocks.home.compare_no', 'لا')}</span>
                          </>
                        ) : (
                          value.text
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ) : null}
          </table>
        </div>
      </div>
    </div>
  );
});
