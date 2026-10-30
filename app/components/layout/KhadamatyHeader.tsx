import { Fragment, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import type { CSSProperties } from 'react';
import { SallaSearch } from '@salla.sa/twilight-components-react/search';
import { SallaUserMenu } from '@salla.sa/twilight-components-react/user-menu';
import { SallaCartSummary } from '@salla.sa/twilight-components-react/cart-summary';
import { SallaMenu } from '@salla.sa/twilight-components-react/menu';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { HookSlot } from '@salla.sa/twilight-theme-engine/hooks';
import { PageAdvertisements } from '@salla.sa/twilight-theme-engine/layout';
import { HOME_ROUTE_ID } from '../../lib/routeIds';
import { openStoreSwitcher, type StoreSwitcher } from '../../lib/storeSwitchers';
import { HeaderMainMenu } from './HeaderMainMenu';
import { HeaderNav } from './HeaderNav';
import { ThemeToggle } from './ThemeToggle';

const openSearch = () => window.salla?.event?.dispatch('search::open');

/** Language / currency buttons in the khadamaty markup (`.header-localization`). */
function KhLocalization({ position }: { position: string }) {
  const { store, currency, theme } = useTwilight();
  const { t, languageName } = useTranslation();
  const hs = theme?.settings as Record<string, unknown> | undefined;
  const content = (hs?.header_localization_content as string) || 'both';
  const display = (hs?.header_localization_display as string) || 'icon_text';
  const style = (hs?.header_localization_style as string) || 'plain';
  const langIcon = (hs?.header_localization_icon as string) || 'sicon-earth';
  const curIcon = (hs?.header_currency_icon as string) || 'sicon-dollar-coin-stack';
  const mobile = hs?.header_localization_mobile !== false;

  const buttons: { type: StoreSwitcher; icon: string; label: string }[] = [];
  if (content !== 'currency' && store?.settings?.is_multilingual)
    buttons.push({ type: 'language', icon: langIcon, label: languageName });
  if (content !== 'language' && store?.settings?.currencies_enabled)
    buttons.push({
      type: 'currency',
      icon: curIcon,
      label: currency?.name || currency?.symbol || currency?.code || 'SAR',
    });
  if (!buttons.length) return null;

  return (
    <div
      className={`header-localization-group header-localization--${position}${
        mobile ? '' : ' header-localization--desktop-only'
      }`}
    >
      {buttons.map((b, i) => (
        <Fragment key={b.type}>
          {i > 0 && (
            <span className="header-localization__separator" aria-hidden="true">
              |
            </span>
          )}
          <button
            type="button"
            className={`header-localization header-localization--${style}`}
            aria-label={t('blocks.header.change_language', 'Language & currency')}
            aria-haspopup="dialog"
            onClick={() => openStoreSwitcher(b.type)}
          >
            {display !== 'text' && (
              <i className={`header-action__icon ${b.icon}`} aria-hidden="true" />
            )}
            {display !== 'icon' && (
              <>
                <span className="header-localization__label">{b.label}</span>
                <i className="sicon-keyboard_arrow_down header-localization__caret" aria-hidden="true" />
              </>
            )}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

interface KhadamatyHeaderProps {
  navOpen?: boolean;
  onNavOpenChange?: (open: boolean) => void;
}

/**
 * The classic "khadamaty" header — the React port of
 * `triple_twig/.../pages/partials/khadamaty/header.twig`, shown when the
 * `use_khadamaty_header` setting is on (chosen in {@link HeaderSwitch}). Its
 * colours come from `header_bg_color` / `header_icons_color` / `header_menu_color`
 * / `header_transparent_fg` as CSS variables on `.store-header`; `header_layout`
 * picks the classic vs centered placement. Styling: `04-components/khadamaty-header.scss`.
 *
 * Reuses the shared pieces (`HeaderMainMenu`, the `HeaderNav` drawer, `ThemeToggle`,
 * and the Salla search / user-menu / cart web components); only the chrome markup
 * and classes differ from the default Triple {@link Header}.
 */
export function KhadamatyHeader({ navOpen: navOpenProp, onNavOpenChange }: KhadamatyHeaderProps = {}) {
  const { store, theme } = useTwilight();
  const { t } = useTranslation();
  const hs = theme?.settings as Record<string, unknown> | undefined;

  // header_layout is lite/default for the Triple header; map it onto the
  // khadamaty classic/centered placement (lite ≈ centered logo).
  const layout = hs?.header_layout === 'lite' ? 'centered' : 'classic';
  const iconsSize = ((hs?.header_icons_size as string) || 'md').toLowerCase();
  const logoAlt = (hs?.header_logo_alt as string) || '';

  const showSearch = hs?.header_search_enabled !== false;
  const showAccount = hs?.header_account_enabled !== false;
  const showCart = hs?.header_cart_enabled !== false;
  const searchIcon = (hs?.header_search_icon as string) || 'sicon-search';
  const accountIcon = (hs?.header_account_icon as string) || 'sicon-user';
  const cartIcon = (hs?.header_cart_icon as string) || 'sicon-shopping-bag';
  const themeMode = !!hs?.dark_mode_switcher && hs?.header_theme_mode_enabled !== false;

  const topbarEnabled = !!hs?.header_topbar_enabled;
  const topbarLinks = hs?.header_topbar_links !== false;
  const topbarContacts = hs?.header_topbar_contacts !== false;

  const localizationEnabled = hs?.header_localization_enabled !== false;
  const localizationPosition = (hs?.header_localization_position as string) || 'start';

  const isHomePage = useRouterState({
    select: (state) => state.matches.some((match) => match.routeId === HOME_ROUTE_ID),
  });
  const transparent = !!hs?.header_transparent && isHomePage;

  const [navOpenState, setNavOpenState] = useState(false);
  const navOpen = navOpenProp ?? navOpenState;
  const setNavOpen = (open: boolean) => {
    if (navOpenProp === undefined) setNavOpenState(open);
    onNavOpenChange?.(open);
  };

  const cssVars = {
    '--header-bg': (hs?.header_bg_color as string) || '#16122b',
    '--header-fg': (hs?.header_icons_color as string) || '#ffffff',
    '--header-menu-fg': (hs?.header_menu_color as string) || '#ffffff',
    '--header-transparent-fg': (hs?.header_transparent_fg as string) || '#ffffff',
    '--topbar-bg': (hs?.header_topbar_bg as string) || '#0e0b1d',
    '--topbar-fg': (hs?.header_topbar_fg as string) || '#d9d5e6',
  } as CSSProperties;

  const phone = store?.contacts?.phone;
  const email = store?.contacts?.email;

  return (
    <header
      data-testid="store-header"
      className={`store-header store-header--${layout}${transparent ? ' store-header--transparent' : ''}`}
      data-icons-size={iconsSize}
      style={cssVars}
      suppressHydrationWarning
    >
      <HookSlot name="header:start" />

      <div className="site-header__ad">
        <PageAdvertisements />
      </div>

      {topbarEnabled && (
        <div className="header-topbar">
          <div className="container flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {topbarLinks && <SallaMenu source="footer" topnav suppressHydrationWarning />}
              {localizationEnabled && localizationPosition === 'topbar' && (
                <KhLocalization position="topbar" />
              )}
            </div>
            {topbarContacts && (phone || email) && (
              <div className="flex items-center gap-4 shrink-0">
                {phone && (
                  <a href={`tel:${phone}`} className="unicode" dir="ltr">
                    {phone}
                  </a>
                )}
                {email && <a href={`mailto:${email}`}>{email}</a>}
              </div>
            )}
          </div>
        </div>
      )}

      <div id="mainnav" className="main-nav-container">
        <div className="inner w-full">
          <div className="container">
            <div className="header-row">
              <div className="header-start">
                <button
                  type="button"
                  className="header-burger lg:hidden"
                  aria-label={t('blocks.header.main_menu', 'Menu')}
                  aria-expanded={navOpen}
                  onClick={() => setNavOpen(true)}
                >
                  <i className="sicon-menu text-2xl" aria-hidden="true" />
                </button>

                <div className="header-actions header-actions--start">
                  {showSearch && (
                    <button
                      type="button"
                      className="header-action"
                      aria-label={t('blocks.header.search', 'Search')}
                      onClick={openSearch}
                    >
                      <i className={`header-action__icon ${searchIcon}`} aria-hidden="true" />
                    </button>
                  )}
                  {themeMode && (
                    <ThemeToggle toggleClass="header-action header-action--theme-mode" maskId="kh-moon-mask" />
                  )}
                </div>
              </div>

              <a
                data-testid="store-header-logo"
                className={`navbar-brand${logoAlt ? ' has-alt-logo' : ''}`}
                href={store?.url || '/'}
              >
                <img
                  className="logo-main"
                  src={store?.logo}
                  alt={`${store?.name || 'Store'} logo`}
                  loading="eager"
                  fetchPriority="high"
                />
                {logoAlt && <img className="logo-alt" src={logoAlt} alt={`${store?.name || 'Store'} logo`} />}
                <span className="sr-only">{store?.name || 'Store'}</span>
              </a>

              <div className="header-menu">
                <HeaderMainMenu />
              </div>

              <div className="header-actions header-actions--end">
                {localizationEnabled && localizationPosition !== 'topbar' && (
                  <KhLocalization position={localizationPosition} />
                )}
                {showAccount && (
                  <SallaUserMenu className="header-action" showHeader showTrigger>
                    <span slot="trigger" className="flex">
                      <i className={`header-action__icon ${accountIcon}`} aria-hidden="true" />
                      <span className="sr-only">{t('blocks.header.account', 'Account')}</span>
                    </span>
                  </SallaUserMenu>
                )}
                {showCart && (
                  <SallaCartSummary
                    className="header-action header-action--cart"
                    {...(hs?.enable_cart_drawer ? { 'data-drawer-id': 'cart-drawer' } : {})}
                  >
                    <i slot="icon" className={`header-action__icon ${cartIcon}`} aria-hidden="true" />
                  </SallaCartSummary>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <HeaderNav open={navOpen} onClose={() => setNavOpen(false)} />
      <SallaSearch suppressHydrationWarning />
      <HookSlot name="header:end" />
    </header>
  );
}
