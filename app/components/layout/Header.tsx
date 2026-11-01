import { useEffect, useRef, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { SallaSearch } from '@salla.sa/twilight-components-react/search';
import { SallaUserMenu } from '@salla.sa/twilight-components-react/user-menu';
import { SallaCartSummary } from '@salla.sa/twilight-components-react/cart-summary';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { HookSlot } from '@salla.sa/twilight-theme-engine/hooks';
import { Image } from '@salla.sa/twilight-theme-engine/common';
import { PageAdvertisements } from '@salla.sa/twilight-theme-engine/layout';
import { MapPinIcon, SearchIcon, ShoppingBagIcon } from '../icons';
import { useAppSafeAreaTop } from '../../hooks/useAppSafeAreaTop';
import { HOME_ROUTE_ID, PRODUCT_ROUTE_ID } from '../../lib/routeIds';
import { HeaderMainMenu } from './HeaderMainMenu';
import { HeaderNav } from './HeaderNav';
import { HeaderTopnav } from './HeaderTopnav';
import { HeaderLocalization } from './HeaderLocalization';
import { ThemeToggle } from './ThemeToggle';

/** Opens the Salla search modal (the `<SallaSearch />` at the end of the header). */
const openSearch = () => window.salla?.event?.dispatch('search::open');

const openScopes = () => window.salla?.event?.dispatch('scopes::open');

/** Search trigger — opens the Salla search modal via the `search::open` event.
 *  `icon` (header_search_icon) swaps the default glyph for a Salla sicon. */
function SearchButton({ label, icon }: { label: string; icon?: string }) {
  return (
    <button
      type="button"
      className="header-action site-header__search"
      aria-label={label}
      onClick={openSearch}
    >
      {icon ? <i className={icon} aria-hidden="true" /> : <SearchIcon aria-hidden="true" />}
    </button>
  );
}

/** Branch / scope trigger — opens `<SallaScopes>` (mounted in `ThemeLayout`) via the
 * `scopes::open` event. Icon-only; the current scope name is the accessible label. */
function ScopeButton({ label, icon }: { label: string; icon?: string }) {
  return (
    <button
      type="button"
      data-testid="store-header-scope-btn"
      className="header-action site-header__scope"
      aria-label={label}
      aria-haspopup="dialog"
      title={label}
      onClick={openScopes}
    >
      {icon ? <i className={icon} aria-hidden="true" /> : <MapPinIcon aria-hidden="true" />}
    </button>
  );
}

/**
 * Rebuilt storefront header — swapped in via `<TwilightProvider layout={ThemeLayout}>`.
 *
 * Two layouts, chosen by the `header_layout` theme setting:
 *  - **lite** (default): centered logo, a menu button that opens the slide-in
 *    drawer, action icons, then a store-name / description / social row.
 *  - **default**: a `lg+` top bar ({@link HeaderTopnav}) with the footer menu +
 *    language / branch / currency switchers, then a row of logo · horizontal
 *    mega-menu (`HeaderMainMenu`) · action icons. Below `lg` it collapses to the
 *    same mobile bar as lite (burger + drawer + icons).
 *
 * The menu opens a slide-in drawer at every breakpoint ({@link HeaderNav}); the
 * search icon opens the Salla search modal through the `search::open` event
 * (the `<SallaSearch />` instance mounted at the end of this header). Styling
 * lives in `styles/04-components/header.scss`. The `header:start` / `header:end`
 * hook slots are kept for installed apps.
 *
 * The drawer's open state can be lifted: pass `navOpen` + `onNavOpenChange` and
 * the header renders controlled (ThemeLayout does this so the mobile bottom bar
 * shares the same drawer). Left unset, the header owns the state itself.
 */
interface HeaderProps {
  navOpen?: boolean;
  onNavOpenChange?: (open: boolean) => void;
}

export function Header({ navOpen: navOpenProp, onNavOpenChange }: HeaderProps = {}) {
  const { store, theme } = useTwilight();
  const { t } = useTranslation();
  const isDefaultLayout = theme?.settings?.header_layout === 'default';
  const stickyEnabled = theme?.settings?.header_is_sticky !== false;
  // Header icon/logo options (panel_header). Each icon shows unless explicitly
  // turned off; icon size and logo centering/size are settings-driven too.
  const hs = theme?.settings as Record<string, unknown> | undefined;
  const showAccount = hs?.header_account_enabled !== false;
  const showSearch = hs?.header_search_enabled !== false;
  const showCart = hs?.header_cart_enabled !== false;
  const iconsSize = ((hs?.header_icons_size as string) || 'md').toLowerCase();
  const topbarEnabled = hs?.header_topbar_enabled !== false;
  // Logo alignment: centred (the default grid) unless centered_logo is off, which
  // pulls it to the inline-start — kept centred on mobile when mobile_only is on.
  const centeredLogo = hs?.centered_logo !== false;
  const mobileCenteredLogo = hs?.mobile_only_centered_logo !== false;
  // Twig's `enable_cats_row`: in the default (desktop) layout with a centered
  // logo, the main menu sits in its OWN row BELOW the logo row (instead of
  // inline beside the logo). Mirrors triple_twig's centered-logo header.
  const catsRowLayout =
    isDefaultLayout && centeredLogo && hs?.enable_cats_row !== false;
  const localizationEnabled = hs?.header_localization_enabled !== false;
  const localizationPosition = (hs?.header_localization_position as string) || 'end';
  const localizationInBar = localizationEnabled && localizationPosition !== 'topbar';
  const localizationMobile = hs?.header_localization_mobile !== false;
  // Custom header icons: only override the theme's own glyph when the merchant
  // actually changed it away from the Twig default (keep the nicer SVG otherwise).
  const searchIconSetting = (hs?.header_search_icon as string) || '';
  const customSearchIcon =
    searchIconSetting && searchIconSetting !== 'sicon-search' ? searchIconSetting : '';
  const cartIconSetting = (hs?.header_cart_icon as string) || '';
  const customCartIcon =
    cartIconSetting && cartIconSetting !== 'sicon-shopping-bag' ? cartIconSetting : '';
  // Branch, menu-button and account icons (all merchant-controllable). Each keeps
  // its built-in default (the SVG / animated burger) unless the merchant picks a
  // different icon — same pattern as the search / cart icons above.
  const scopeIconSetting = (hs?.header_scope_icon as string) || '';
  const customScopeIcon =
    scopeIconSetting && scopeIconSetting !== 'sicon-location' ? scopeIconSetting : '';
  const menuIcon = (hs?.header_menu_icon as string) || '';
  // The guest login-button icon (the `login-btn` slot of <salla-user-menu>, same
  // as the Twig header); defaults to sicon-user, overridable per the setting.
  const accountIcon = (hs?.header_account_icon as string) || 'sicon-user';
  const logoWidth = Number(hs?.header_logo_width) || 140;
  const logoHeight = Number(hs?.header_logo_height) || 48;
  const [navOpenState, setNavOpenState] = useState(false);
  const navOpen = navOpenProp ?? navOpenState;
  const setNavOpen = (open: boolean) => {
    if (navOpenProp === undefined) setNavOpenState(open);
    onNavOpenChange?.(open);
  };
  const [scrolled, setScrolled] = useState(false);
  // Route match, not the `body` route class (`ROUTE_CLASS_MAP`, set from a
  // client effect) — during a pending client-side navigation *into* the
  // product page the body class can still read the *previous* route for a
  // moment (e.g. `.index`), leaving the mobile header visible until the
  // navigation settles. This is correct from the first tick of the
  // transition, matching `MobilePageTitleBar`'s product-page check.
  const isProductPage = useRouterState({
    select: (state) => state.matches.some((match) => match.routeId === PRODUCT_ROUTE_ID),
  });
  // Same for home: `body.index` only exists after hydration, so the SSR home
  // page painted with the mobile header collapsed and then grew (CLS 0.38).
  const isHomePage = useRouterState({
    select: (state) => state.matches.some((match) => match.routeId === HOME_ROUTE_ID),
  });
  // Marker in the flow, right where the main bar sits. The bar pins once this
  // scrolls out the top of the viewport (see below).
  const stickySentinelRef = useRef<HTMLDivElement>(null);
  // Inside the Salla app the pinned bar sits below the status bar, so it must
  // pin when the sentinel reaches that line, not the screen's top edge.
  const safeTop = useAppSafeAreaTop();

  // Pin the main bar on scroll.
  //  - lite: near-immediately, once the page moves off the top;
  //  - default: only once the whole stack above the bar (ad + top bar) has
  //    scrolled away and the bar itself reaches the viewport edge. An
  //    IntersectionObserver on a zero-height sentinel does this without the
  //    boundary flicker a scrollY threshold would have (the sentinel keeps its
  //    place when the bar goes `position: fixed`, since `__bar-outer` reserves
  //    the height).
  useEffect(() => {
    if (!stickyEnabled) {
      setScrolled(false);
      return;
    }

    if (!isDefaultLayout) {
      const onScroll = () => setScrolled(window.scrollY > 4);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }

    const sentinel = stickySentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), {
      threshold: 0,
      rootMargin: `-${safeTop}px 0px 0px 0px`,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isDefaultLayout, stickyEnabled, safeTop]);

  const searchLabel = t('blocks.header.search', 'Search');

  // Header action elements, extracted so the centered (cats-row) layout can
  // split them into two groups — cart + account on the start side, the rest on
  // the end side — like triple_twig, while every other layout keeps them in one
  // group (end side).
  const ts = theme?.settings as Record<string, unknown> | undefined;
  const localizationEl = localizationInBar ? (
    <div
      key="loc"
      className={`site-header__loc-wrap site-header__loc-wrap--${localizationPosition}${
        localizationMobile ? '' : ' site-header__loc-wrap--desktop'
      }`}
    >
      <HeaderLocalization />
    </div>
  ) : null;
  const toggleEl =
    ts?.dark_mode_switcher && ts?.header_theme_mode_enabled !== false ? (
      <ThemeToggle key="toggle" toggleClass="header-action" />
    ) : null;
  const accountEl = showAccount ? (
    <SallaUserMenu
      key="account"
      avatarOnly
      showHeader
      showTrigger
      relativeDropdown
      className="header-action"
    >
      {/* Guest state: the login-button trigger, with the merchant's icon — the
          React port of the Twig header's `slot="login-btn"`. Signed-in state
          keeps the component's avatar. */}
      <button
        slot="login-btn"
        type="button"
        className="header-action"
        aria-label={t('blocks.header.account', 'Account')}
        onClick={() => window.salla?.event?.dispatch('login::open')}
      >
        <i className={accountIcon} aria-hidden="true" />
      </button>
    </SallaUserMenu>
  ) : null;
  const scopeEl = store?.scope ? (
    <ScopeButton
      key="scope"
      label={store.scope.name || t('blocks.header.branches', 'Branches')}
      icon={customScopeIcon}
    />
  ) : null;
  const cartEl = showCart ? (
    <SallaCartSummary
      key="cart"
      className="header-action"
      {...(ts?.enable_cart_drawer ? { 'data-drawer-id': 'cart-drawer' } : {})}
    >
      {customCartIcon ? (
        <i className={customCartIcon} slot="icon" aria-hidden="true" />
      ) : (
        <ShoppingBagIcon slot="icon" aria-hidden="true" />
      )}
    </SallaCartSummary>
  ) : null;
  const searchEl = showSearch ? (
    <SearchButton key="search" label={searchLabel} icon={customSearchIcon} />
  ) : null;

  return (
    <header
      className={`site-header site-header--${isDefaultLayout ? 'default' : 'lite'} site-header--icons-${iconsSize}${
        centeredLogo
          ? ''
          : ` site-header--logo-start${mobileCenteredLogo ? ' site-header--logo-centered-mobile' : ''}`
      }${isProductPage ? ' site-header--product' : ''}${isHomePage ? ' site-header--home' : ''}${
        catsRowLayout ? ' site-header--cats' : ''
      }`}
      suppressHydrationWarning
    >
      <HookSlot name="header:start" />

      <div className="site-header__ad">
        <PageAdvertisements />
      </div>

      {/* "Delivering to …" tag (bullet delivery). Phones get it above the bars; on
          desktop it sits in the top nav (default layout) or its own slim row (lite).
          The element renders nothing when the store / market has no bullet delivery. */}
      <div className="site-header__bullet lg:hidden">
        <salla-bullet-delivery-tag data-testid="store-header-bullet-delivery-mobile" />
      </div>
      {isDefaultLayout && topbarEnabled ? (
        <HeaderTopnav />
      ) : (
        <div className="site-header__bullet site-header__bullet--desktop hidden lg:block">
          <div className="container">
            <salla-bullet-delivery-tag data-testid="store-header-bullet-delivery-desktop" />
          </div>
        </div>
      )}

      {isDefaultLayout && (
        <div ref={stickySentinelRef} className="site-header__sticky-sentinel" aria-hidden="true" />
      )}

      <div className="site-header__bar-outer">
        <div className={`site-header__bar${scrolled ? ' is-scrolled' : ''}`}>
          <div className="container site-header__bar-inner">
            <div className="site-header__nav-toggle">
              <button
                type="button"
                className="header-action"
                aria-label={t('blocks.header.main_menu', 'Menu')}
                aria-expanded={navOpen}
                onClick={() => setNavOpen(true)}
              >
                {/* A merchant-set icon replaces the CSS burger; empty keeps the
                    staggered-bar burger (styles: header.scss `.site-header__burger`). */}
                {menuIcon ? (
                  <i className={menuIcon} aria-hidden="true" />
                ) : (
                  <span className="site-header__burger" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                )}
              </button>
            </div>

            <a className="site-header__brand" href={store?.url || '/'}>
              <Image
                src={store?.logo}
                className="logo-normal"
                noWrapper
                alt={`${store?.name || 'Store'} logo`}
                priority
                width={logoWidth}
                height={logoHeight}
              />
              {/* Dark-mode logo (reversed_logo): CSS swaps it in under html.dark. */}
              <Image
                src={
                  ((theme?.settings as Record<string, unknown> | undefined)?.reversed_logo as
                    | string
                    | undefined) || store?.logo
                }
                className="logo-dark hidden"
                noWrapper
                alt={`${store?.name || 'Store'} logo`}
                width={logoWidth}
                height={logoHeight}
              />
              <span className="sr-only">{store?.name || 'Store'}</span>
            </a>

            {isDefaultLayout && !catsRowLayout && (
              <nav
                className="site-header__mainmenu"
                aria-label={t('blocks.header.main_menu', 'Menu')}
              >
                <HeaderMainMenu />
              </nav>
            )}

            {catsRowLayout ? (
              <>
                {/* Start side (inline-end in RTL = right): cart + account. */}
                <div className="site-header__actions site-header__actions--start">
                  {accountEl}
                  {scopeEl}
                  {cartEl}
                </div>
                {/* End side (left in RTL): localization, theme toggle, search. */}
                <div className="site-header__actions site-header__actions--end">
                  {localizationEl}
                  {toggleEl}
                  {searchEl}
                </div>
              </>
            ) : (
              <div className="site-header__actions">
                {localizationEl}
                {toggleEl}
                {accountEl}
                {scopeEl}
                {cartEl}
                {searchEl}
              </div>
            )}
          </div>

          {/* `enable_cats_row`: the main menu on its own centered row below the
              logo row (desktop default layout, centered logo). */}
          {catsRowLayout && (
            <div className="container site-header__cats">
              <nav
                className="site-header__mainmenu site-header__mainmenu--row"
                aria-label={t('blocks.header.main_menu', 'Menu')}
              >
                <HeaderMainMenu />
              </nav>
            </div>
          )}
        </div>
      </div>

      <HeaderNav open={navOpen} onClose={() => setNavOpen(false)} />

      <SallaSearch suppressHydrationWarning />

      <HookSlot name="header:end" />
    </header>
  );
}
