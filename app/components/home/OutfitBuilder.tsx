import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Money } from '../common/Money';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';
import {
  useNearViewport,
  fetchProductsQuery,
  productImage,
  productPrices,
  quickAdd,
} from '../../lib/tripleProducts';

/**
 * `outfit-builder` home block — one piece per step (each step = a category), a
 * summary with the picks and the total, then "add the look" adds the picks. The
 * first step's products load when the block nears the screen, the others only
 * when opened (kept for later). Port of
 * `triple_twig/src/views/components/home/outfit-builder.twig` +
 * `partials/outfit-builder.js`. Styling: `outfit-builder.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type ItemRaw = Record<string, any>;
type AnyProduct = Record<string, any>;

function catId(raw: unknown): string {
  if (raw == null) return '';
  if (Array.isArray(raw)) return raw.length ? catId(raw[0]) : '';
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (o.id != null && o.id !== '') return String(o.id);
    if (o.value != null && o.value !== '') return String(o.value);
    return '';
  }
  return String(raw);
}

interface Step {
  title: string;
  cat: string;
}

export interface OutfitBuilderData {
  kicker?: MultiLang;
  title?: MultiLang;
  steps?: ItemRaw[];
  note?: MultiLang;
  products_limit?: unknown;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const outfitBuilderConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as OutfitBuilderData;
    const c = ['s-block', 'tr-outfit-block', `outfit-builder-${d.position ?? 0}`];
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

function buildSteps(raw: ItemRaw[] | undefined, lang: string): Step[] {
  return (raw ?? [])
    .map((item) => ({ title: pickLang(item.title as MultiLang, lang), cat: catId(item.category) }))
    .filter((s) => s.cat && s.title);
}

export const OutfitBuilder = memo(function OutfitBuilder({ data }: { data: OutfitBuilderData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const kicker = pickLang(data.kicker as MultiLang, lang);
  const title = pickLang(data.title as MultiLang, lang);
  const note = pickLang(data.note as MultiLang, lang);
  const limit = Number(data.products_limit ?? 8) || 8;
  const steps = useMemo(() => buildSteps(data.steps, lang), [data.steps, lang]);

  const [rootRef, near] = useNearViewport<HTMLDivElement>();
  const [step, setStep] = useState(0);
  const [cache, setCache] = useState<Record<number, AnyProduct[]>>({});
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [picks, setPicks] = useState<(AnyProduct | null)[]>([]);
  const [adding, setAdding] = useState(false);
  const reqRef = useRef(0);

  const load = useCallback(
    (index: number) => {
      if (cache[index]) return;
      const token = ++reqRef.current;
      setLoadingStep(index);
      fetchProductsQuery({ source: 'categories', source_value: [steps[index].cat], limit }).then((byId) => {
        if (token !== reqRef.current) return; // another step opened meanwhile
        setCache((prev) => ({ ...prev, [index]: [...byId.values()] }));
        setLoadingStep(null);
      });
    },
    [cache, steps, limit]
  );

  // open the first step when near
  useEffect(() => {
    if (near && steps.length) load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near]);

  const open = useCallback(
    (index: number) => {
      if (index < 0 || index >= steps.length) return;
      setStep(index);
      load(index);
    },
    [steps.length, load]
  );

  const pick = useCallback(
    (product: AnyProduct) => {
      setPicks((prev) => {
        const next = prev.slice();
        const same = String(next[step]?.id) === String(product.id);
        next[step] = same ? null : product;
        if (!same && step + 1 < steps.length) setTimeout(() => open(step + 1), 450);
        return next;
      });
    },
    [step, steps.length, open]
  );

  const total = picks.reduce((sum, p) => sum + (p ? productPrices(p).price : 0), 0);
  const hasPicks = picks.some(Boolean);

  const addLook = async () => {
    const chosen = picks.filter(Boolean) as AnyProduct[];
    if (!chosen.length || adding) return;
    setAdding(true);
    try {
      for (const product of chosen) {
        // eslint-disable-next-line no-await-in-loop
        await quickAdd(product.id).catch(() => {});
      }
    } finally {
      setAdding(false);
    }
  };

  if (!steps.length) return null;

  const products = cache[step];
  const isLoading = loadingStep === step || products === undefined;

  return (
    <div className="container">
      <div className="tr-outfit" ref={rootRef}>
        {kicker || title ? (
          <div className="tr-outfit__head">
            {kicker ? <p className="tr-pill">{kicker}</p> : null}
            {title ? <h2 className="tr-outfit__title">{title}</h2> : null}
          </div>
        ) : null}

        <div className="tr-outfit__steps" role="tablist">
          {steps.map((s, i) => (
            <button
              type="button"
              className={`tr-outfit__step${step === i ? ' is-active' : ''}`}
              role="tab"
              aria-selected={step === i ? 'true' : 'false'}
              data-step={i}
              key={i}
              onClick={() => open(i)}
            >
              <span className="tr-outfit__step-num">{i + 1}</span>
              <span className="tr-outfit__step-title">{s.title}</span>
            </button>
          ))}
        </div>

        <div className="tr-outfit__body">
          <div className={`tr-outfit__grid${isLoading ? ' is-loading' : ''}`} aria-live="polite">
            {isLoading ? (
              Array.from({ length: 4 }, (_, i) => <span className="tr-outfit__ghost" key={i} />)
            ) : !products?.length ? (
              <p className="tr-outfit__empty">{t('blocks.home.outfit_no_products', 'لا توجد منتجات')}</p>
            ) : (
              products.map((product) => {
                const available = product.is_available !== false;
                const isPicked = String(product.id) === String(picks[step]?.id);
                const image = productImage(product);
                const { price, compare } = productPrices(product);
                return (
                  <button
                    type="button"
                    className={`tr-outfit__item${isPicked ? ' is-picked' : ''}`}
                    data-id={product.id}
                    aria-pressed={isPicked}
                    disabled={!available}
                    key={product.id}
                    onClick={() => available && pick(product)}
                  >
                    <span className="tr-outfit__item-media">
                      {image ? <img src={image} alt="" width={300} height={300} loading="lazy" decoding="async" /> : null}
                      {available ? null : (
                        <span className="tr-outfit__item-badge">{t('blocks.home.set_unavailable', 'غير متوفر')}</span>
                      )}
                    </span>
                    <span className="tr-outfit__item-name">{product.name}</span>
                    <span className="tr-outfit__item-price">
                      <span className={`tr-price ${compare ? 'is-sale' : ''}`}><Money amount={price} /></span>
                      {compare ? <del className="tr-price-compare"> <Money amount={compare} /></del> : null}
                    </span>
                    <span className="tr-outfit__item-cta">
                      <i className="sicon-check" aria-hidden="true" />
                      {isPicked ? t('blocks.home.outfit_picked', 'تم الاختيار') : t('blocks.home.outfit_pick', 'اختر')}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <aside className="tr-outfit__summary">
            <h3 className="tr-outfit__summary-title">{t('blocks.home.outfit_your_look', 'إطلالتك')}</h3>
            <ul className="tr-outfit__picks">
              {steps.map((s, i) => {
                const product = picks[i];
                const image = product ? productImage(product) : '';
                const { price, compare } = product ? productPrices(product) : { price: 0, compare: null };
                return (
                  <li className={`tr-outfit__pick${product ? ' is-done' : ''}`} data-pick={i} key={i}>
                    <span className="tr-outfit__pick-thumb">
                      <span className="tr-outfit__pick-num">{i + 1}</span>
                      {image ? <img src={image} alt="" width={80} height={80} loading="lazy" decoding="async" /> : null}
                    </span>
                    <span className="tr-outfit__pick-text">
                      <span className="tr-outfit__pick-step">{s.title}</span>
                      <span className="tr-outfit__pick-name">
                        {product ? product.name : t('blocks.home.outfit_not_picked', 'لم يُختر بعد')}
                      </span>
                    </span>
                    <span className="tr-outfit__pick-price">
                      {product ? (
                        <>
                          <span className={`tr-price ${compare ? 'is-sale' : ''}`}><Money amount={price} /></span>
                          {compare ? <del className="tr-price-compare"> <Money amount={compare} /></del> : null}
                        </>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
            {note ? (
              <p className="tr-outfit__note">
                <i className="sicon-tag" aria-hidden="true" />
                {note}
              </p>
            ) : null}
            <div className="tr-outfit__total">
              <span>{t('blocks.triple.total', 'الإجمالي')}</span>
              <strong><Money amount={total} /></strong>
            </div>
            <button
              type="button"
              className={`tr-btn tr-outfit__add${adding ? ' is-atc-loading' : ''}`}
              disabled={!hasPicks}
              onClick={addLook}
            >
              <span className="tr-outfit__spinner" aria-hidden="true" />
              <i className="sicon-shopping-bag" aria-hidden="true" />
              <span>{t('blocks.home.outfit_add', 'أضف الإطلالة')}</span>
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
});
