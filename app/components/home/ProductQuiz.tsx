import { Suspense, memo, useCallback, useMemo, useRef, useState } from 'react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { product as productApi, type ProductsListSource } from '@salla.sa/twilight-theme-engine/api/product';
import { SallaProductsList, ProductsListSkeleton } from '@salla.sa/twilight-components-react';
import { ProductCard } from '../product';
import { pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * `product-quiz` home block — a product finder. The merchant writes a start
 * screen and a set of questions (up to 4 answers each, every answer linked to a
 * category). Nothing loads while the shopper answers; after the last answer the
 * results show one products list built from the categories of the picked
 * answers (or the latest products when none were linked). Port of
 * `triple_twig/src/views/components/home/product-quiz.twig` +
 * `partials/product-quiz.js`. Styling: `product-quiz.scss`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type ItemRaw = Record<string, any>;

/** A category dropdown value → its id string (or '' when none). */
function catId(raw: unknown): string {
  if (raw == null) return '';
  if (Array.isArray(raw)) return raw.length ? catId(raw[0]) : '';
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (o.id != null) return String(o.id);
    if (o.value != null) return String(o.value);
    return '';
  }
  return String(raw);
}

interface Answer {
  text: string;
  cat: string;
}
interface Question {
  text: string;
  answers: Answer[];
}

export interface ProductQuizData {
  kicker?: MultiLang;
  title?: MultiLang;
  subtitle?: MultiLang;
  image?: string;
  start_text?: MultiLang;
  questions?: ItemRaw[];
  result_title?: MultiLang;
  products_limit?: unknown;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export const productQuizConfig: HomeComponentConfig = {
  className: (data) => {
    const d = data as ProductQuizData;
    const c = ['s-block', 'tr-quiz-block', `product-quiz-${d.position ?? 0}`];
    if (d.custom_classes) c.push(String(d.custom_classes));
    return c.join(' ');
  },
};

function buildQuestions(raw: ItemRaw[] | undefined, lang: string): Question[] {
  return (raw ?? [])
    .map((item) => {
      const text = pickLang(item.question as MultiLang, lang);
      const answers: Answer[] = [];
      for (let n = 1; n <= 4; n++) {
        const answer = pickLang(item[`answer_${n}`] as MultiLang, lang);
        if (answer) answers.push({ text: answer, cat: catId(item[`category_${n}`]) });
      }
      return { text, answers };
    })
    .filter((q) => q.text && q.answers.length);
}

export const ProductQuiz = memo(function ProductQuiz({ data }: { data: ProductQuizData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const kicker = pickLang(data.kicker as MultiLang, lang);
  const title = pickLang(data.title as MultiLang, lang);
  const subtitle = pickLang(data.subtitle as MultiLang, lang);
  const startText = pickLang(data.start_text as MultiLang, lang);
  const resultTitle = pickLang(data.result_title as MultiLang, lang);
  const image = data.image;
  const limit = Number(data.products_limit ?? 8) || 8;

  const questions = useMemo(() => buildQuestions(data.questions, lang), [data.questions, lang]);
  const total = questions.length;

  const rootRef = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<'intro' | 'steps' | 'result'>('intro');
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const [categories, setCategories] = useState<number[] | null>(null);
  const busyRef = useRef(false);

  // the screens have different heights: bring the block's top back into view
  const keepInView = useCallback(() => {
    const top = rootRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) window.scrollBy({ top: top - 120, behavior: 'smooth' });
  }, []);

  const start = useCallback(() => {
    setPicks([]);
    setCategories(null);
    setStep(0);
    setScreen('steps');
    requestAnimationFrame(keepInView);
  }, [keepInView]);

  const finish = useCallback(
    (allPicks: string[]) => {
      const ids = [...new Set(allPicks.filter(Boolean))].map((id) => (/^\d+$/.test(id) ? Number(id) : id));
      setCategories(ids.filter((id): id is number => typeof id === 'number'));
      setScreen('result');
      requestAnimationFrame(keepInView);
    },
    [keepInView]
  );

  const pick = useCallback(
    (index: number, answer: Answer) => {
      if (busyRef.current) return;
      const next = picks.slice(0, index);
      next[index] = answer.cat || '';
      setPicks(next);
      busyRef.current = true;
      // a short pause so the check mark is seen before the next question
      setTimeout(() => {
        busyRef.current = false;
        if (index + 1 < total) setStep(index + 1);
        else finish(next);
      }, 280);
    },
    [picks, total, finish]
  );

  const back = useCallback(() => {
    if (step > 0) setStep(step - 1);
    else setScreen('intro');
  }, [step]);

  const loader = useCallback(() => {
    if (categories && categories.length) {
      return productApi.list({ source: 'categories' as ProductsListSource, sourceValue: categories, perPage: limit });
    }
    return productApi.list({ source: 'latest' as ProductsListSource, perPage: limit });
  }, [categories, limit]);

  if (!total) return null;

  const pct = total ? ((step + 1) / total) * 100 : 0;

  return (
    <div className="container" ref={rootRef}>
      <div className={`tr-quiz${image ? ' tr-quiz--with-image' : ''}`} data-screen={screen}>
        {/* intro */}
        <div className="tr-quiz__intro" hidden={screen !== 'intro'}>
          {image ? (
            <div className="tr-quiz__media">
              <img className="tr-quiz__img" src={image} alt={title} loading="lazy" decoding="async" />
            </div>
          ) : null}
          <div className="tr-quiz__intro-body">
            {kicker ? <p className="tr-pill">{kicker}</p> : null}
            {title ? <h2 className="tr-quiz__title">{title}</h2> : null}
            {subtitle ? (
              <p className="tr-quiz__text" dangerouslySetInnerHTML={{ __html: subtitle.replace(/\n/g, '<br>') }} />
            ) : null}
            <div className="tr-quiz__meta">
              <span className="tr-quiz__meta-item">
                <i className="sicon-list" aria-hidden="true" />
                {total} {t('blocks.home.quiz_questions', 'سؤال')}
              </span>
            </div>
            <button type="button" className="tr-btn tr-quiz__start" onClick={start}>
              <span>{startText || t('blocks.home.quiz_start', 'ابدأ')}</span>
              <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* steps */}
        <div className="tr-quiz__steps" hidden={screen !== 'steps'}>
          <div className="tr-quiz__top">
            <button type="button" className="tr-quiz__back" onClick={back}>
              <i className="sicon-arrow-right ltr:rotate-180" aria-hidden="true" />
              <span>{t('blocks.home.quiz_back', 'رجوع')}</span>
            </button>
            <span className="tr-quiz__count" aria-live="polite">
              {t('blocks.home.quiz_question', 'سؤال')}{' '}
              <bdi dir="ltr">
                <span>{step + 1}</span> / {total}
              </bdi>
            </span>
          </div>
          <div className="tr-quiz__bar" aria-hidden="true">
            <span className="tr-quiz__bar-fill" style={{ width: `${pct}%` }} />
          </div>

          {questions.map((question, qi) => (
            <fieldset className="tr-quiz__question" key={qi} hidden={qi !== step}>
              <legend className="tr-quiz__q">{question.text}</legend>
              <div className="tr-quiz__answers">
                {question.answers.map((answer, ai) => {
                  return (
                    <button
                      type="button"
                      className="tr-quiz__answer"
                      key={ai}
                      aria-pressed={picks[qi] != null && picks[qi] === answer.cat ? 'true' : 'false'}
                      data-cat={answer.cat}
                      onClick={() => pick(qi, answer)}
                    >
                      <span className="tr-quiz__answer-mark" aria-hidden="true">
                        <i className="sicon-check" />
                      </span>
                      <span className="tr-quiz__answer-text">{answer.text}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        {/* result */}
        <div className="tr-quiz__result" hidden={screen !== 'result'}>
          <div className="tr-head">
            <div className="tr-head__text">
              <h3 className="tr-head__title">{resultTitle || t('blocks.home.quiz_result', 'نتيجتك')}</h3>
            </div>
            <div className="tr-head__action">
              <button type="button" className="tr-link tr-quiz__restart" onClick={start}>
                <i className="sicon-rotate" aria-hidden="true" />
                <span>{t('blocks.home.quiz_restart', 'إعادة')}</span>
              </button>
            </div>
          </div>
          <div className="tr-quiz__products">
            {screen === 'result' ? (
              <Suspense fallback={<ProductsListSkeleton />}>
                <SallaProductsList loader={loader} itemsClassName="vertical-products">
                  {(items: Product[]) =>
                    items.slice(0, limit).map((item) => <ProductCard key={item.id} product={item} />)
                  }
                </SallaProductsList>
              </Suspense>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});
