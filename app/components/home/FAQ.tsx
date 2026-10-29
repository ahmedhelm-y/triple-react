import { memo, useState } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, collectionField, type MultiLang } from '../../lib/homeBlockData';

/**
 * FAQ (Triple) — home block.
 * Port of triple_twig `views/components/home/faq.twig` + `js/partials/faq.js`.
 * A two-column grid of question cards; clicking a question toggles `.open` on its card
 * (faq.scss animates the answer's max-height) and flips the chevron. Pure React state —
 * no DOM class toggling.
 */

interface FaqItemRaw {
  [key: string]: unknown;
}

export interface FaqData {
  title?: MultiLang;
  subtitle?: MultiLang;
  has_bg?: boolean;
  items?: FaqItemRaw[];
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface FaqProps {
  data: FaqData;
}

function FaqItem({
  question,
  answer,
  linkText,
  link,
}: {
  question: string;
  answer: string;
  linkText: string;
  link: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`single-faq w-full rounded-lg border border-store-text-secondary bg-store-bg-secondary py-3 px-5${open ? ' open' : ''}`}
      aria-expanded={open}
    >
      <button
        type="button"
        className="faq-btn flex justify-between items-center w-full gap-2"
        onClick={() => setOpen((o) => !o)}
      >
        <p className="faq__question text-base text-store-text-primary rtl:text-right ltr:text-left">
          {question}
        </p>
        <i
          className={`${open ? 'sicon-keyboard_arrow_up' : 'sicon-keyboard_arrow_down'} bg-primary text-primary-reverse rounded-full text-base p-[4px]`}
        ></i>
      </button>
      <div className="faq-content">
        {answer && (
          <p className="faq__answer py-3 text-sm text-store-text-secondary">{answer}</p>
        )}
        {linkText && link && (
          <a
            href={link}
            className="faq__link bg-primary py-1 px-2 rounded text-primary-reverse inline-block text-sm"
          >
            {linkText}
          </a>
        )}
      </div>
    </div>
  );
}

export const FAQ = memo(function FAQ({ data }: FaqProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const items = Array.isArray(data.items) ? data.items : [];
  const title = pickLang(data.title, lang);
  const subtitle = pickLang(data.subtitle, lang);

  if (!items.length) return null;

  return (
    <div className="container">
      {(title || subtitle) && (
        <div className="home-block-title">
          <div className="mx-auto max-w-2xl text-center">
            {title && (
              <h2 className="faq__title mt-2 text-3xl font-bold tracking-tight text-store-text-primary sm:text-4xl">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="faq__subtitle mt-2 text-lg leading-8 text-store-text-secondary">
                {subtitle}
              </p>
            )}
            {title && <span className="enhanced-title-border home-block-line"></span>}
          </div>
        </div>
      )}

      <div className="faq__grid grid items-start grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, index) => {
          const question = pickLang(collectionField(item, 'items', 'question') as MultiLang, lang);
          if (!question) return null;
          const answer = pickLang(collectionField(item, 'items', 'answer') as MultiLang, lang);
          const linkText = pickLang(collectionField(item, 'items', 'link_text') as MultiLang, lang);
          const link = (collectionField(item, 'items', 'link') as string) || '';
          return (
            <FaqItem
              key={index}
              question={question}
              answer={answer}
              linkText={linkText}
              link={link}
            />
          );
        })}
      </div>
    </div>
  );
});
