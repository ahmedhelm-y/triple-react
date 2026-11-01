import { useState } from 'react';
import { SallaSocial } from '@salla.sa/twilight-components-react/social';
import { SallaMenu } from '@salla.sa/twilight-components-react/menu';
import { SallaPayments } from '@salla.sa/twilight-components-react/payments';
import { SallaTrustBadges } from '@salla.sa/twilight-components-react/trust-badges';
import { SallaAppsIcons } from '@salla.sa/twilight-components-react/apps-icons';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { HookSlot, useIsClient } from '@salla.sa/twilight-theme-engine/hooks';
import { Link, Image } from '@salla.sa/twilight-theme-engine/common';
import { ImageModal } from '@salla.sa/twilight-theme-engine/modal';
import { MadeWithSalla } from '@salla.sa/twilight-theme-engine/layout';

/**
 * Triple's storefront footer — the React port of
 * `triple_twig/src/views/components/footer/footer.twig`.
 *
 * The engine's shared `Footer` (`@salla.sa/twilight-theme-engine/layout`) renders a
 * generic footer that is missing three Triple-specific pieces: the Mailchimp
 * newsletter bar, the dedicated contacts row (contact buttons + a *centered* social
 * row), and Twig's three-column grid with the brand centered. This component
 * reproduces the Twig structure exactly, reusing the same Salla web-component
 * wrappers the engine footer uses (social, menu, payments, trust-badges, apps).
 *
 * Colours come from the `--footer-bg` / `--footer-text-color` / `--bottom-footer-bg`
 * CSS variables (set per light/dark in `lib/themeVars.ts`), so the footer follows the
 * same palette as the Twig demo in both modes. Settings mirror footer.twig's.
 *
 * The engine `Footer` is still used for the mobile account sheet (`inSheet`), where
 * its flat widget list is the right fit; this component is the desktop page footer.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const TAX_ICON_URL =
  'https://cdn.salla.network/cdn-cgi/image/fit=scale-down,width=70,height=70,onerror=redirect,format=auto/images/tax.png?v=2.0.5';
const SBC_ICON_URL = 'https://cdn.salla.network/images/sbc.png?v=2.0.5';

/** `StoreContacts.telegram` / `.whatsapp` may already be a full link. */
const isUrl = (value: string) => /^https?:\/\//i.test(value);
const telegramHref = (v: string) => (isUrl(v) ? v : `https://t.me/${v.replace(/^@/, '')}`);
const whatsappHref = (v: string) => (isUrl(v) ? v : `https://wa.me/${v.replace(/[\s+-]/g, '')}`);

/** Store value-added-tax badge: number + certificate thumbnail that opens full size. */
function FooterTax() {
  const { store } = useTwilight();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const number = (store as any)?.settings?.tax?.number;
  const certificate = (store as any)?.settings?.tax?.certificate;
  if (!number) return null;

  return (
    <div className="footer-tax flex items-end gap-2 rtl:space-x-reverse">
      {certificate && (
        <>
          <button
            type="button"
            className="footer-tax__certificate shrink-0"
            aria-label={t('common.elements.tax_certificate', 'Tax Certificate')}
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            <img
              src={TAX_ICON_URL}
              alt={t('common.elements.tax_certificate', 'Tax Certificate')}
              width={40}
              height={50}
              loading="lazy"
              decoding="async"
              className="w-10 rounded-sm transition-opacity hover:opacity-80"
            />
          </button>
          <ImageModal
            isOpen={open}
            onClose={() => setOpen(false)}
            src={certificate}
            alt={t('common.elements.tax_certificate', 'Tax Certificate')}
            title={t('common.elements.tax_certificate', 'Tax Certificate')}
          />
        </>
      )}
      <div className="footer-tax__number">
        <p className="mb-1 text-sm opacity-70">{t('common.elements.tax_number', 'Tax Number')}</p>
        <b className="text-sm">{number}</b>
      </div>
    </div>
  );
}

/** Saudi Business Center certificate badge. */
function FooterSbc({ mini, showNumber }: { mini: boolean; showNumber: boolean }) {
  const { store } = useTwilight();
  const { t } = useTranslation();
  const id = (store as any)?.settings?.certificate?.id;
  if (!id) return null;

  if (showNumber) {
    return (
      <span
        className={`store-footer__sbc-number sbc-number-pill flex items-center justify-center gap-2${
          mini ? ' mini-sbc' : ''
        }`}
      >
        <img
          src={SBC_ICON_URL}
          alt="Saudi Business Center"
          width={40}
          height={30}
          loading="lazy"
          className="w-10 object-contain"
        />
        <span>{id}</span>
      </span>
    );
  }

  return (
    <a
      href={`https://eauthenticate.saudibusiness.gov.sa/certificate-details/${encodeURIComponent(id)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`store-footer__sbc flex flex-col items-center justify-center transition-opacity hover:opacity-75${
        mini ? ' mini-sbc' : ''
      }`}
      aria-label="Saudi Business Center"
    >
      <img
        src={SBC_ICON_URL}
        alt="Saudi Business Center"
        width={56}
        height={40}
        loading="lazy"
        className="mb-1.5 w-18 object-contain"
      />
      {t('blocks.footer_extra.sbc_verified', 'Verified by the Saudi Business Center')}
    </a>
  );
}

/** Contact buttons (telegram / email / phone / mobile / whatsapp) — the React
 *  equivalent of Twig's `<triple-contacts>`. One pill per field the merchant set;
 *  the whole row renders nothing when none are set. */
function FooterContactButtons({ rounded }: { rounded: boolean }) {
  const { store } = useTwilight();
  const { t } = useTranslation();
  const c = (store as any)?.contacts ?? {};

  const rows = [
    c.telegram && {
      key: 'telegram',
      icon: 'sicon-paper-plane',
      label: t('blocks.footer.telegram', 'Telegram'),
      href: telegramHref(c.telegram),
      external: true,
    },
    c.email && {
      key: 'email',
      icon: 'sicon-mail-letter',
      label: t('blocks.footer.email', 'Email'),
      href: `mailto:${c.email}`,
      external: false,
    },
    c.phone && {
      key: 'phone',
      icon: 'sicon-phone',
      label: t('blocks.footer.phone', 'Phone'),
      href: `tel:${c.phone}`,
      external: false,
    },
    c.mobile &&
      c.mobile !== c.phone && {
        key: 'mobile',
        icon: 'sicon-phone',
        label: t('blocks.footer.mobile', 'Mobile'),
        href: `tel:${c.mobile}`,
        external: false,
      },
    c.whatsapp && {
      key: 'whatsapp',
      icon: 'sicon-whatsapp',
      label: t('blocks.footer.whatsapp', 'WhatsApp'),
      href: whatsappHref(c.whatsapp),
      external: true,
    },
  ].filter(Boolean) as {
    key: string;
    icon: string;
    label: string;
    href: string;
    external: boolean;
  }[];

  if (!rows.length) return null;

  return (
    <div className={`footer-contacts${rounded ? ' footer-contacts--rounded' : ''}`}>
      {rows.map((row) => (
        <a
          key={row.key}
          href={row.href}
          {...(row.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="footer-contact-btn"
        >
          <i className={row.icon} aria-hidden="true" />
          <span>{row.label}</span>
        </a>
      ))}
    </div>
  );
}

/** Store logo (reversed logo in the footer when the setting asks for it). */
function FooterLogo() {
  const { store, theme } = useTwilight();
  const s = theme.settings as Record<string, any> | undefined;
  const reversed = s?.show_reversed_logo_in_footer && s?.reversed_logo;
  const logo = reversed ? s.reversed_logo : (store as any)?.logo;
  const height = Number(s?.footer_logo_height) || 64;
  const width = s?.footer_logo_width ? Number(s.footer_logo_width) : undefined;

  return (
    <Link
      to="/"
      className="store-footer__logo-link m-0 flex items-center justify-center transition-opacity hover:opacity-75"
    >
      {logo ? (
        <Image
          src={logo}
          alt={(store as any)?.name || 'Store'}
          width={width || 180}
          height={height}
          objectFit="contain"
          className="img-fluid"
          style={{ height: `${height}px`, ...(width ? { width: `${width}px` } : {}) }}
        />
      ) : (
        <h3>{(store as any)?.name}</h3>
      )}
    </Link>
  );
}

export function TripleFooter() {
  const { store, theme } = useTwilight();
  const { t } = useTranslation();
  const isClient = useIsClient();
  const s = (theme.settings ?? {}) as Record<string, any>;

  const animate = s.animate_blocks !== false;
  const showNewsletter = !!s.footer_show_newsletter;
  const newsletterTitle = s.newsletter_title as string | undefined;
  const newsletterAction = s.footer_newsletter_form_action as string | undefined;
  const description = (store as any)?.description as string | undefined;
  const hasApps = !!((store as any)?.apps?.appstore || (store as any)?.apps?.googleplay);
  const footerLogos: any[] = s.show_footer_logos && Array.isArray(s.footer_logos) ? s.footer_logos : [];

  return (
    <footer
      data-testid="store-footer"
      className={`store-footer${animate ? ' s-block--animate' : ''}${
        s.show_basic_footer ? ' basic-footer' : ''
      }${s.hide_footer_dividers ? ' hide-dividers' : ''}${
        s.enhanced_social_icons ? ' has-enhanced-social' : ''
      }`}
      suppressHydrationWarning
    >
      <HookSlot name="footer:start" />

      {showNewsletter && (
        <div className="store-footer__newsletter">
          <div className="store-footer__newsletter-inner container items-center justify-between md:flex">
            <div className="store-footer__newsletter-text sm:text-center">
              <h2 className="store-footer__newsletter-title text-center text-lg font-bold tracking-tight sm:text-2xl">
                {newsletterTitle}
              </h2>
            </div>
            {newsletterAction && (
              <form
                action={newsletterAction}
                target="_blank"
                className="mt-3 flex items-center gap-2 sm:mt-0"
              >
                <div className="store-footer__newsletter-field min-w-0 flex-1">
                  <label htmlFor="cta-email" className="sr-only">
                    {t('blocks.contact_form.email', 'Email')}
                  </label>
                  <input
                    id="cta-email"
                    name="EMAIL"
                    type="email"
                    className="store-footer__newsletter-input block w-full rounded-md border border-transparent px-5 py-3 text-base text-gray-900 placeholder-gray-500 shadow-sm focus:outline-none focus:ring-0"
                    placeholder={t('blocks.contact_form.email', 'Email')}
                  />
                </div>
                <button
                  type="submit"
                  className="store-footer__newsletter-btn block rounded-md px-5 py-3 text-base font-medium shadow focus:outline-none focus:ring-2 focus:ring-primary sm:px-6"
                  aria-label={t('blocks.footer_extra.subscribe_now', 'Subscribe now')}
                >
                  {t('blocks.footer_extra.subscribe_now', 'Subscribe now')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <div>
        <div aria-label="footer" className="store-footer__inner">
          <div className="store-footer__grid container grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
            {/* Column 1 (right in RTL): important links. */}
            <div className="store-footer__links">
              <h3 className="store-footer__links-title mb-3 text-lg font-bold lg:mb-5">
                {t('blocks.footer.important_links', 'Important links')}
              </h3>
              <SallaMenu
                source="footer"
                className="store-footer__menu store-footer__menu--stacked"
                suppressHydrationWarning
              />
            </div>

            {/* Column 2 (center): brand — logo, description, trust badges + tax, extra logos. */}
            <div className="store-footer__brand relative z-[1] lg:col-[2] lg:-mt-[45px]">
              <FooterLogo />
              {description && (
                <div
                  className="footer-description mb-8 mt-3 text-center leading-6"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              )}
              <div className="footer-badges flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
                <SallaTrustBadges {...(s.footer_is_dark !== false ? { dark: true } : {})} />
                <FooterTax />
              </div>
              {footerLogos.length > 0 && (
                <div className="footer-logos mt-4 flex flex-wrap items-center justify-center gap-3">
                  {footerLogos.map((item, i) => {
                    const img = item?.image ?? item?.['footer_logos.image'];
                    return img ? (
                      <img
                        key={i}
                        src={img}
                        alt={(store as any)?.name || 'Store'}
                        className="h-10 w-auto object-contain"
                        loading="lazy"
                      />
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Column 3 (left in RTL): app buttons + SBC badge. */}
            <div className="store-footer__apps">
              {isClient && hasApps && (
                <SallaAppsIcons
                  apps={(store as any).apps}
                  appsTitle={t('blocks.footer.download_apps', 'Get our apps')}
                />
              )}
              <div className="store-footer__sbc-wrap mt-2 md:mt-5">
                <FooterSbc mini={!!s.mini_sbc} showNumber={!!s.show_sbc_number} />
              </div>
            </div>
          </div>
        </div>

        {/* Contacts + centered social row — Twig's `store-footer__contacts-row`. */}
        <div className="store-footer__contacts-row">
          {isClient && <FooterContactButtons rounded={!!s.rounded_contacts} />}
          <SallaSocial
            className={`store-footer__social mt-4 flex items-center justify-center${
              s.rounded_contacts ? ' rounded_contacts' : ''
            }`}
          />
        </div>

        <div className="footer-bottom">
          <div className="store-footer__bottom-inner container items-center justify-between py-4 text-center md:flex">
            <span className="footer-rights text-sm">
              <HookSlot
                name="copyright"
                context={{ storeName: (store as any)?.name }}
                fallback={
                  <>
                    {t('blocks.footer.copyright', 'All rights reserved')}{' '}
                    <Link to="/" className="transition-opacity hover:text-primary hover:opacity-75">
                      {(store as any)?.name}
                    </Link>{' '}
                    © {new Date().getFullYear()}
                    <MadeWithSalla className="ms-2" />
                  </>
                }
              />
            </span>
            <SallaPayments />
          </div>
        </div>
      </div>

      <HookSlot name="footer:end" />
    </footer>
  );
}
