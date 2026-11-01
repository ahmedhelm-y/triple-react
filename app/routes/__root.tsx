import { lazy, Suspense } from 'react';
import { Scripts, Outlet } from '@tanstack/react-router';
import { TwilightProvider } from '@salla.sa/twilight-theme-engine';
import {
  createTwilightRootRoute,
  getTwilightContext,
  ThemeHeadContent,
  ThemeStylesheet,
} from '@salla.sa/twilight-theme-engine/tanstack';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import themeTranslations from 'virtual:twilight/theme-translations';
import devSchema from 'virtual:twilight/schema';
import { ThemeLayout } from '../components/layout/ThemeLayout';
import { buildThemeVarsCss, buildColorModeScript, buildFontCss } from '../lib/themeVars';
import { HOME_ROUTE_ID, PRODUCT_ROUTE_ID } from '../lib/routeIds';
import appCssUrl from '../styles/app.css?url';
import homeCriticalCss from '../styles/critical.scss?inline';
import productCriticalCss from '../styles/critical-product.scss?inline';

// Dev-only: reads the theme's local twilight.json (settings + components),
// fills defaults, and lets you edit them live. Imported from the engine's `/dev`
// subpath under an import.meta.env.DEV gate so it is tree-shaken from prod builds.
const DevSettingsWidget = import.meta.env.DEV
  ? lazy(() =>
      import('@salla.sa/twilight-theme-engine/dev').then((m) => ({ default: m.DevSettingsWidget }))
    )
  : null;

export const Route = createTwilightRootRoute()({
  shellComponent: RootComponent,
});

// Server-only strings: the client bundle skips them; hydration adopts the inlined <style> by its href.
const CRITICAL_CSS = {
  [HOME_ROUTE_ID]: import.meta.env.SSR ? homeCriticalCss : '',
  [PRODUCT_ROUTE_ID]: import.meta.env.SSR ? productCriticalCss : '',
};

function RootComponent() {
  const ctx = getTwilightContext();

  // Triple colour variables (from the merchant settings) + the before-paint
  // dark-mode boot — the React port of master.twig's inline <style>/<script>.
  let themeVarsCss = '';
  let colorModeScript = '';
  try {
    const themeSettings = (ctx.settings?.theme?.settings ?? {}) as Record<string, unknown>;
    // Main colour: the `primary_color` design option wins, else the Triple brand default.
    const primary = (themeSettings.primary_color as string) || '#7a5a2e';
    // Merchant custom font (design option) overrides the bundled default font.
    themeVarsCss = buildThemeVarsCss(themeSettings, primary) + buildFontCss(themeSettings);
    colorModeScript = buildColorModeScript(themeSettings);
  } catch {
    /* settings unavailable (store not resolved) — the static defaults cover it */
  }

  return (
    <html lang={ctx.locale} dir={ctx.dir} suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Applies html.dark before first paint (no flash). */}
        {colorModeScript ? (
          <script data-cfasync="false" dangerouslySetInnerHTML={{ __html: colorModeScript }} />
        ) : null}
        {/* Home and product paint from inline critical CSS; `bootClient` adds the full sheet once
            their first screen has painted. Other routes: the full sheet blocks, as before. */}
        <ThemeStylesheet href={appCssUrl} critical={CRITICAL_CSS} />
        {/* After app.css so the merchant's real colours win over the static defaults. */}
        {themeVarsCss ? (
          <style data-triple="theme-vars" dangerouslySetInnerHTML={{ __html: themeVarsCss }} />
        ) : null}
        {/* Remix Icon (3000+ pro icons) alongside Salla's sallaicons, so an icon
            field set to a `ri-*` class renders on the storefront. Only the small
            CSS loads up front; the webfont downloads lazily when a `ri-*` icon is
            actually on the page. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.css"
        />
        <ThemeHeadContent />
      </head>
      <body suppressHydrationWarning>
        <noscript>
          To get full functionality of this site you need to enable JavaScript.
          <a href="https://www.enable-javascript.com/" rel="noreferrer" target="_blank">
            To enable JavaScript on webpage
          </a>
          .
        </noscript>
        <TwilightProvider
          translations={themeTranslations}
          layout={ThemeLayout}
          toastMobilePosition="top-center"
        >
          <Outlet />
        </TwilightProvider>
        <TanStackRouterDevtools position="bottom-right" />
        {DevSettingsWidget && (
          <Suspense fallback={null}>
            <DevSettingsWidget schema={devSchema} />
          </Suspense>
        )}
        <Scripts />
      </body>
    </html>
  );
}
