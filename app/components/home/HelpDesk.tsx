import { Fragment, memo, useMemo, useState } from 'react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { asUrl, collectionField, pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * Help desk (home component: home.help-desk) — `.tr-help`.
 * Port of triple_twig `views/components/home/help-desk.twig` + `js/partials/help-desk.js`
 * (the `<triple-help>` custom element) + `04-components/help-desk.scss`.
 * A head + "still asking?" card on the start side; a search box, topic chips and the questions as
 * native <details> on the end side. Search + topic filtering done in React. Section classes in router.tsx.
 */

interface QuestionRaw {
  [key: string]: unknown;
}
interface Question {
  ask: string;
  reply: string;
  topic: string;
}

export interface HelpDeskProps {
  data: {
    heading?: MultiLang;
    intro?: MultiLang;
    questions?: QuestionRaw[];
    search_box?: boolean;
    contact_label?: MultiLang;
    contact_target?: unknown;
    position?: number;
    [key: string]: unknown;
  };
}

/** Wrapper `<section>` classes for `home.help-desk`. */
export const helpDeskConfig = {
  className: (data: HelpDeskProps['data']) =>
    ['s-block', 'tr-help-block', `help-desk-${data.position ?? 0}`, data.custom_classes as string | undefined]
      .filter(Boolean)
      .join(' '),
};

export const HelpDesk = memo(function HelpDesk({ data }: HelpDeskProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const heading = pickLang(data.heading, lang);
  const intro = pickLang(data.intro, lang);
  const contact = pickLang(data.contact_label, lang);
  const contactTarget = asUrl(data.contact_target);

  const { questions, topics } = useMemo(() => {
    const raw = (data.questions as QuestionRaw[]) || [];
    const list: Question[] = [];
    const topicSet: string[] = [];
    for (const item of raw) {
      const ask = pickLang(collectionField(item, 'questions', 'ask') as MultiLang, lang);
      const reply = pickLang(collectionField(item, 'questions', 'reply') as MultiLang, lang);
      const topic = (pickLang(collectionField(item, 'questions', 'topic') as MultiLang, lang) || '').trim();
      if (!(ask && reply)) continue;
      list.push({ ask, reply, topic });
      if (topic && !topicSet.includes(topic)) topicSet.push(topic);
    }
    return { questions: list, topics: topicSet };
  }, [data.questions, lang]);

  const [term, setTerm] = useState('');
  const [topic, setTopic] = useState('');
  const showSearch = data.search_box !== false;

  const visible = questions.filter((q) => {
    if (topic && q.topic !== topic) return false;
    if (term) {
      const needle = term.toLowerCase();
      if (!q.ask.toLowerCase().includes(needle) && !q.reply.toLowerCase().includes(needle)) return false;
    }
    return true;
  });

  if (!questions.length) return null;

  return (
    <div className="container block">
      <div className="tr-help">
        <div className="tr-help__side">
          <h2 className="tr-help__heading">{heading || t('blocks.home.help_heading')}</h2>
          {intro && <p className="tr-help__intro">{intro}</p>}
          {contactTarget && (
            <div className="tr-help__card">
              <i className="sicon-chat-bubbles" aria-hidden="true" />
              <p>{t('blocks.home.help_still')}</p>
              <Link to={contactTarget}>{contact || t('blocks.home.help_contact')}</Link>
            </div>
          )}
        </div>

        <div className="tr-help__main">
          {showSearch && (
            <label className="tr-help__search">
              <i className="sicon-search" aria-hidden="true" />
              <span className="sr-only">{t('blocks.home.help_search')}</span>
              <input
                type="search"
                placeholder={t('blocks.home.help_search')}
                autoComplete="off"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </label>
          )}

          {topics.length > 1 && (
            <div className="tr-help__topics" role="group" aria-label={t('blocks.home.help_topics')}>
              <button
                type="button"
                className="tr-help__topic"
                aria-pressed={topic === '' ? 'true' : 'false'}
                onClick={() => setTopic('')}
              >
                {t('blocks.home.help_all')}
              </button>
              {topics.map((tp) => (
                <button
                  key={tp}
                  type="button"
                  className="tr-help__topic"
                  aria-pressed={topic === tp ? 'true' : 'false'}
                  onClick={() => setTopic(tp)}
                >
                  {tp}
                </button>
              ))}
            </div>
          )}

          <div className="tr-help__list">
            {visible.map((question, i) => (
              <details className="tr-help__item" key={i} data-topic={question.topic} open={i === 0}>
                <summary>
                  <span>{question.ask}</span>
                  <i className="sicon-add" aria-hidden="true" />
                </summary>
                <div className="tr-help__reply">
                  {question.reply.split('\n').map((line, j, all) => (
                    <Fragment key={j}>
                      {line}
                      {j < all.length - 1 && <br />}
                    </Fragment>
                  ))}
                </div>
              </details>
            ))}
          </div>
          {visible.length === 0 && <p className="tr-help__empty">{t('blocks.home.help_none')}</p>}
        </div>
      </div>
    </div>
  );
});
