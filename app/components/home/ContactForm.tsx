import { memo, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { pickLang, collectionField, resolveOption, type MultiLang } from '../../lib/homeBlockData';

/**
 * Contact Form (Triple) — home block.
 * Port of triple_twig `views/components/home/contact-form.twig` + `js/partials/contact-form.js`.
 * Sends the fields to Web3Forms (key + receiving email from the block settings), then shows a
 * success/error toast and clears the form. Two layouts: form only / form with side content.
 * The DOM `.classList.toggle` loading dance becomes React state.
 */

const INPUT_CLASSES =
  'w-full px-4 py-2.5 bg-storeBG border border-gray-200 rounded-lg text-store-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm';

interface FeatureRaw {
  [key: string]: unknown;
}

export interface ContactFormData {
  title?: MultiLang;
  subtitle?: MultiLang;
  layout_type?: unknown;
  content?: MultiLang;
  image?: string;
  features_list?: FeatureRaw[];
  success_message?: MultiLang;
  email?: string;
  web3forms_key?: string;
  add_top_space?: boolean;
  full_width?: boolean;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface ContactFormProps {
  data: ContactFormData;
}

export const ContactForm = memo(function ContactForm({ data }: ContactFormProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const title = pickLang(data.title, lang);
  const subtitle = pickLang(data.subtitle, lang);
  const content = pickLang(data.content, lang);
  const successMessage = pickLang(data.success_message, lang) || t('blocks.contact_form.success', '');
  const errorMessage = t('blocks.contact_form.error', '');
  const layout = resolveOption(data.layout_type, ['form_only', 'form_with_content'] as const, 'form_only');
  const features = Array.isArray(data.features_list) ? data.features_list : [];
  const pos = data.position ?? 0;

  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const form = event.currentTarget;
    setLoading(true);
    try {
      const fd = new FormData(form);
      const key = (data.web3forms_key || '').trim();
      if (!key) throw new Error('Form configuration error. Please contact the site administrator.');
      const body: Record<string, string> = {
        access_key: key,
        name: String(fd.get('name') || ''),
        email: String(fd.get('email') || ''),
        mobile: String(fd.get('mobile') || ''),
        subject: String(fd.get('subject') || ''),
        message: String(fd.get('message') || ''),
      };
      if ((data.email || '').trim()) body.to = (data.email as string).trim();

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!(response.ok && json.success)) throw new Error(json.message || 'Failed to send email');

      window.salla?.notify?.success?.(successMessage);
      form.reset();
    } catch (error) {
      const message = errorMessage || (error instanceof Error ? error.message : 'Failed to send email');
      window.salla?.notify?.error?.(message);
    } finally {
      setLoading(false);
    }
  }

  const field = (
    name: string,
    type: string,
    icon: string,
    labelKey: string,
    placeholderKey: string,
    required: boolean,
    textarea = false
  ) => (
    <div className="contact-form__field group">
      <label
        htmlFor={`field_${name}_${pos}`}
        className="contact-form__label block text-sm font-medium text-store-text-primary mb-1.5"
      >
        <span className="flex items-center gap-2">
          <i className={`${icon} text-sm`}></i>
          {t(`blocks.contact_form.${labelKey}`, '')}
          {required && <span className="text-red-500">*</span>}
        </span>
      </label>
      {textarea ? (
        <textarea
          id={`field_${name}_${pos}`}
          name={name}
          className={`contact-form__textarea ${INPUT_CLASSES} resize-none`}
          placeholder={t(`blocks.contact_form.${placeholderKey}`, '')}
          rows={4}
          required={required}
        ></textarea>
      ) : (
        <input
          type={type}
          id={`field_${name}_${pos}`}
          name={name}
          className={`contact-form__input ${INPUT_CLASSES}`}
          placeholder={t(`blocks.contact_form.${placeholderKey}`, '')}
          required={required}
        />
      )}
      <div className="error-message text-red-500 text-sm mt-1 hidden"></div>
    </div>
  );

  const formEl = (
    <div className="contact-form-wrapper">
      <div className="contact-form__card bg-store-bg-secondary rounded-lg border border-gray-200 p-8">
        <form className="contact-form space-y-6" onSubmit={handleSubmit}>
          <div className="contact-form__fields space-y-5">
            {field('name', 'text', 'sicon-user', 'name', 'name_placeholder', true)}
            <div className="contact-form__field-row grid grid-cols-1 md:grid-cols-2 gap-5">
              {field('email', 'email', 'sicon-mail', 'email', 'email_placeholder', true)}
              {field('mobile', 'tel', 'sicon-phone', 'mobile', 'mobile_placeholder', false)}
            </div>
          </div>
          {field('subject', 'text', 'sicon-chat', 'subject', 'subject_placeholder', true)}
          {field('message', 'text', 'sicon-message', 'message', 'message_placeholder', true, true)}

          <button
            type="submit"
            disabled={loading}
            className={`btn btn--primary w-full font-semibold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm !mt-2${loading ? ' loading' : ''}`}
          >
            <span className={`submit-text flex items-center justify-center gap-2${loading ? ' hidden' : ''}`}>
              <i className="sicon-paper-plane text-lg"></i>
              {t('blocks.contact_form.send', '')}
            </span>
            <span className={`loading-spinner${loading ? '' : ' hidden'}`}>
              <svg
                className="animate-spin h-5 w-5 text-white mx-auto"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {(title || subtitle) && (
        <div className="container home-block-title">
          <div className="mx-auto max-w-2xl text-center">
            {title && (
              <p className="mt-2 text-3xl font-bold tracking-tight text-store-text-primary sm:text-4xl">
                {title}
              </p>
            )}
            {subtitle && (
              <p className="mt-2 text-lg leading-8 text-store-text-secondary">{subtitle}</p>
            )}
            <span className="enhanced-title-border home-block-line"></span>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden">
        <div className={`mx-auto ${data.full_width ? 'px-4 md:px-8' : 'container'}`}>
          {layout === 'form_with_content' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div className="contact-form__side space-y-6">
                {data.image && (
                  <div className="contact-image overflow-hidden rounded-lg">
                    <img className="w-full h-auto object-cover" src={data.image} alt={title} loading="lazy" />
                  </div>
                )}
                {content && (
                  <div
                    className="contact-form__content prose max-w-none text-store-text-secondary"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                )}
                {features.length > 0 && (
                  <ul className="features-list space-y-4">
                    {features.map((feature, i) => {
                      const fTitle = pickLang(collectionField(feature, 'features_list', 'title') as MultiLang, lang);
                      const fDesc = pickLang(collectionField(feature, 'features_list', 'description') as MultiLang, lang);
                      const icon = (collectionField(feature, 'features_list', 'icon') as string) || 'sicon-envelope';
                      return (
                        <li key={i} className="feature-item flex items-start gap-3">
                          <span className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-primary text-primary-reverse">
                            <i className={icon}></i>
                          </span>
                          <div>
                            {fTitle && <p className="font-bold text-store-text-primary">{fTitle}</p>}
                            {fDesc && <p className="text-sm text-store-text-secondary">{fDesc}</p>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div>{formEl}</div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">{formEl}</div>
          )}
        </div>
      </div>
    </>
  );
});
