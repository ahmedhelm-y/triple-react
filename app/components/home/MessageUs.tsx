import { memo, useMemo, useState } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { collectionField, pickLang, type MultiLang } from '../../lib/homeBlockData';

/**
 * Message us (home component: home.message-us) — `.tr-message`.
 * Port of triple_twig `views/components/home/message-us.twig` + `js/partials/message-us.js`
 * (the `<triple-message>` custom element) + `04-components/message-us.scss`.
 * The visitor writes the message here and sends it from their own WhatsApp (`wa.me`) or email
 * (`mailto:`) app — nothing is sent to any server. Section classes are set in router.tsx.
 */

export interface MessageUsProps {
  data: {
    heading?: MultiLang;
    intro?: MultiLang;
    whatsapp_number?: string;
    email_address?: string;
    phone_number?: string;
    subjects?: { [key: string]: unknown }[];
    position?: number;
    [key: string]: unknown;
  };
}

/** Wrapper `<section>` classes for `home.message-us`. */
export const messageUsConfig = {
  className: (data: MessageUsProps['data']) =>
    ['s-block', 'tr-message-block', `message-us-${data.position ?? 0}`, data.custom_classes as string | undefined]
      .filter(Boolean)
      .join(' '),
};

export const MessageUs = memo(function MessageUs({ data }: MessageUsProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const heading = pickLang(data.heading, lang);
  const intro = pickLang(data.intro, lang);
  const wa = (data.whatsapp_number || '').replace(/[+\s-]/g, '');
  const mail = (data.email_address || '').trim();
  const position = data.position ?? 0;

  const subjects = useMemo(() => {
    const raw = (data.subjects as { [key: string]: unknown }[]) || [];
    return raw
      .map((item) => pickLang(collectionField(item, 'subjects', 'subject') as MultiLang, lang))
      .filter(Boolean);
  }, [data.subjects, lang]);

  const [subject, setSubject] = useState(subjects[0] || '');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  if (!(wa || mail)) return null;

  const send = (channel: 'wa' | 'mail') => {
    if (!message.trim()) {
      setError(true);
      return;
    }
    setError(false);
    const from = t('blocks.home.msg_from');
    const lines = [subject, name ? `${from} ${name}` : '', message].filter(Boolean);
    const text = lines.join('\n\n');
    const url =
      channel === 'wa'
        ? `https://wa.me/${wa}?text=${encodeURIComponent(text)}`
        : `mailto:${mail}?subject=${encodeURIComponent(subject || heading)}&body=${encodeURIComponent(text)}`;
    window.open(url, channel === 'wa' ? '_blank' : '_self');
  };

  return (
    <div className="container block">
      <div className="tr-message">
        <div className="tr-message__side">
          <h2 className="tr-message__heading">{heading || t('blocks.home.msg_heading')}</h2>
          {intro && <p className="tr-message__intro">{intro}</p>}
          <ul className="tr-message__ways">
            {wa && (
              <li>
                <i className="sicon-whatsapp" aria-hidden="true" />
                <span dir="ltr">+{wa}</span>
              </li>
            )}
            {mail && (
              <li>
                <i className="sicon-envelope" aria-hidden="true" />
                <a href={`mailto:${mail}`}>{mail}</a>
              </li>
            )}
            {data.phone_number && (
              <li>
                <i className="sicon-phone" aria-hidden="true" />
                <a href={`tel:${data.phone_number.replace(/\s/g, '')}`} dir="ltr">
                  {data.phone_number}
                </a>
              </li>
            )}
          </ul>
        </div>

        <form className="tr-message__form" noValidate onSubmit={(e) => e.preventDefault()}>
          {subjects.length > 0 && (
            <fieldset className="tr-message__subjects">
              <legend>{t('blocks.home.msg_subject')}</legend>
              {subjects.map((s, i) => (
                <label key={i}>
                  <input
                    type="radio"
                    name={`subject-${position}`}
                    value={s}
                    checked={subject === s}
                    onChange={() => setSubject(s)}
                  />
                  <span>{s}</span>
                </label>
              ))}
            </fieldset>
          )}
          <label className="tr-message__field">
            <span>{t('blocks.home.msg_name')}</span>
            <input type="text" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="tr-message__field">
            <span>{t('blocks.home.msg_text')}</span>
            <textarea
              name="message"
              rows={4}
              required
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (error) setError(false);
              }}
            />
          </label>
          {error && <p className="tr-message__error">{t('blocks.home.msg_required')}</p>}
          <div className="tr-message__send">
            {wa && (
              <button type="submit" className="tr-message__btn" onClick={() => send('wa')}>
                <i className="sicon-whatsapp" aria-hidden="true" />
                {t('blocks.home.msg_whatsapp')}
              </button>
            )}
            {mail && (
              <button type="submit" className={`tr-message__btn${wa ? ' is-quiet' : ''}`} onClick={() => send('mail')}>
                <i className="sicon-envelope" aria-hidden="true" />
                {t('blocks.home.msg_email')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
});
