/**
 * Triple theme CSS variables + colour-mode boot, the React port of the inline
 * `<style>` and `<script>` blocks in `triple_twig/src/views/layouts/master.twig`.
 *
 * The Twig theme wrote every surface/chrome colour from the merchant's settings
 * into `:root` (light) and `html.dark` (dark) custom properties, and set the
 * `html.dark` class before first paint from the visitor's saved choice. Here the
 * same strings are generated from the SSR theme settings and injected in
 * `app/routes/__root.tsx`, so colours and dark mode are correct in the first
 * HTML with no flash. The static fallbacks in `01-settings/triple-colors.scss`
 * stay as a safety net; this injection overrides them with the real values.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Settings = Record<string, any>;

const esc = (v: unknown): string =>
  String(v ?? '').replace(/[<>"'`;{}]/g, '');

/** `settings.get(key, fallback)` with the same defaults as the Twig blocks. */
function val(s: Settings, key: string, fallback: string): string {
  const v = s?.[key];
  return v === undefined || v === null || v === '' ? fallback : esc(v);
}

/**
 * The `:root` (light) + `html.dark` custom properties, mirroring master.twig.
 * `primary` is the raw store colour, needed for the dark `color-mix` primaries
 * (the engine already injects the light `--color-primary*`).
 */
export function buildThemeVarsCss(s: Settings, primary: string): string {
  const p = esc(primary) || '#000000';
  const pattern =
    s?.enable_pattern && s?.pattern_img ? `url(${esc(s.pattern_img)})` : 'none';

  const root = [
    `--s-radius:.75rem`,
    `--bg-primary:${val(s, 'store_bg', '#ffffff')}`,
    `--bg-secondary:${val(s, 'store_bg_secondary', '#ffffff')}`,
    `--store-text-primary:${val(s, 'store_text_color', '#111827')}`,
    `--store-text-secondary:${val(s, 'store_text_color_secondary', '#4b5563')}`,
    `--main-text-color:var(--store-text-primary)`,
    `--header-bg:${val(s, 'header_bg', '#ffffff')}`,
    `--header-text-color:${val(s, 'header_text_color', '#111827')}`,
    `--product-bg:${val(s, 'product_bg', '#ffffff')}`,
    `--product-border-color:${val(s, 'product_border_color', '#eeeeee')}`,
    `--product-image-height:${val(s, 'product_image_height', '17')}rem`,
    `--products-per-row:${val(s, 'products_per_row', '4')}`,
    `--countdown-border-color:${val(s, 'countdown_border_color', '#f3f4f6')}`,
    `--countdown-bg:${val(s, 'countdown_bg', '#f3f4f6')}`,
    `--countdown-color:${val(s, 'countdown_color', '#111827')}`,
    `--product-enhanced-btn-bg:${val(s, 'enhanced_add_btn_bg', '#ffffff')}`,
    `--product-enhanced-btn-color:${val(s, 'enhanced_add_btn_color', '#ffffff')}`,
    `--bottom-nav-bg:${val(s, 'bottom_nav_bg', '#ffffff')}`,
    `--bottom-nav-text-color:${val(s, 'bottom_nav_text_color', '#111827')}`,
    `--wa-btn-bg:${val(s, 'wa_btn_bg', '#22c55e')}`,
    `--wa-btn-text-color:${val(s, 'wa_btn_text_color', '#ffffff')}`,
    `--pattern-bg:${pattern}`,
    `--pattern-opacity:${val(s, 'patterm_opacity', '0.5')}`,
    `--faq-bg:${pattern}`,
    `--footer-bg:${val(s, 'footer_bg', '#f3f4f6')}`,
    `--footer-text-color:${val(s, 'footer_text_color', '#374151')}`,
    `--bottom-footer-bg:${val(s, 'bottom_footer_bg', '#F9FAFB')}`,
  ].join(';');

  const dark = [
    `--bg-primary:${val(s, 'store_bg_dark', '#1d1f1f')}`,
    `--bg-secondary:${val(s, 'store_bg_secondary_dark', '#0e0f0f')}`,
    `--store-text-primary:${val(s, 'store_text_color_dark', '#ffffff')}`,
    `--store-text-secondary:${val(s, 'store_text_color_secondary_dark', '#cccccc')}`,
    `--main-text-color:var(--store-text-primary)`,
    `--color-primary:color-mix(in srgb, ${p} 58%, #fff)`,
    `--color-primary-dark:color-mix(in srgb, ${p} 72%, #fff)`,
    `--color-primary-light:color-mix(in srgb, ${p} 45%, #fff)`,
    `--color-primary-reverse:#141414`,
    `--header-bg:${val(s, 'header_bg_dark', '#0e0f0f')}`,
    `--header-text-color:${val(s, 'header_text_color_dark', '#ffffff')}`,
    `--product-bg:${val(s, 'product_bg_dark', '#1d1f1f')}`,
    `--footer-bg:${val(s, 'footer_bg_dark', '#0e0f0f')}`,
    `--footer-text-color:${val(s, 'footer_text_color_dark', '#ffffff')}`,
    `--bottom-footer-bg:${val(s, 'bottom_footer_bg_dark', '#0e0f0f')}`,
    `--bottom-nav-bg:${val(s, 'bottom_nav_bg_dark', '#1d1f1f')}`,
    `--bottom-nav-text-color:${val(s, 'bottom_nav_text_color_dark', '#ffffff')}`,
    `--product-border-color:color-mix(in srgb, var(--store-text-primary) 12%, transparent)`,
    `--countdown-border-color:color-mix(in srgb, var(--store-text-primary) 14%, transparent)`,
    `--countdown-bg:color-mix(in srgb, var(--store-text-primary) 8%, transparent)`,
    `--countdown-color:var(--store-text-primary)`,
  ].join(';');

  return `:root{${root}}html.dark{${dark}}`;
}

/**
 * Triple's settings-driven `<body>` classes, the React port of the long class
 * list in master.twig. The engine already adds `footer-is-dark`/`-light`,
 * `topnav-is-dark`, `is-sticky-product-bar`, `color-mode-*`, the font class and
 * `salla-<name>` (see the engine's `themeBodyClasses`), so those are left out
 * here to avoid fighting it; this adds only Triple's own flags.
 *
 * `isHome` / `isCart` gate the few page-specific ones; applied via
 * `useDocumentClass` in `ThemeLayout` (which union-merges + dedupes).
 */
export function buildBodyClasses(s: Settings, isHome: boolean, isCart: boolean): string[] {
  const c: string[] = [];
  const on = (k: string) => !!s?.[k];

  if (!on('footer_is_dark')) c.push('footer-is-custom');
  if (on('enhanced_blocks_titles')) {
    c.push('htv', `htv--${esc(s?.enhanced_blocks_title_style) || 'classic'}`);
  }
  if (on('mobile_small_blocks_titles')) c.push('mobile_small_blocks_titles');
  if (on('enable_slider_scrollbar')) c.push('slider-scrollbar');
  if (on('slider_has_overlay') && isHome) c.push('slider_has_overlay');
  if (on('trans_header') && isHome) c.push('trans_header');
  if (on('enable_fonts') && on('enable_harir')) c.push('font-harir');
  if (on('products_has_border')) c.push('products-has-border');
  if (on('disable_out_products')) c.push('disable-out-products');
  if (on('hide_quickview_on_mobile')) c.push('hide-quickview-on-mobile');
  if (on('hide_inventory_status')) c.push('hide-inventory-status');
  if (on('enhanced_add_btn_in_mobile')) c.push('enhanced_add_btn_in_mobile');
  if (on('mobile_mini_products') && on('free_images_height')) c.push('free-images-height');
  if (on('mobile_mini_products') && on('show_subtitle_on_mini')) c.push('show_subtitle_on_mini');
  if (on('mobile_mini_products') && on('mini_top_promotion')) c.push('mini_top_promotion');
  if (on('fit_slider_products')) c.push('fit-slider-products');
  if (on('force_text_color')) c.push('force_text_color');
  if (on('content_copyright')) c.push('content-copyright');
  // custom_colors (the usual case) vs color-mode-dark (store fixed in dark)
  if (on('dark_mode_switcher') || !on('dark_mode')) c.push('custom_colors');
  else c.push('color-mode-dark');
  if (on('enable_shine_animation')) c.push('with-shine-animation');
  if (on('enable_zoom_animation')) c.push('with-zoom-animation');
  if (on('show_original_logo_on_scroll')) c.push('show-original-logo-on-scroll');
  if (on('mobile_mini_products') && on('one_line_name')) c.push('one-line-products-names');
  if (on('promotion_text') && isHome) c.push('has_promotion');
  if (on('promotion_text') && on('fixed_promotion')) c.push('fixed_promotion');
  if (on('enable_bottom_nav')) c.push('has-bottom-nav');
  if (on('enable_desktop_sidemenu')) c.push('enable_desktop_sidemenu');
  if (on('use_khadamaty_product_card')) c.push('khadamaty-product-card');
  if (isCart && on('enhanced_cart_summary')) c.push('has-cart-summary-card');
  return c;
}

/**
 * The before-first-paint IIFE: applies `html.dark` from the visitor's saved
 * choice (switcher on) or the fixed/default mode, and flags a hidden promotion
 * bar. Same storage key (`triple-theme-mode`) as {@link ThemeToggle}.
 */
export function buildColorModeScript(s: Settings): string {
  const switcher = !!s?.dark_mode_switcher;
  const fixedDark = !!s?.dark_mode;
  const defaultMode = esc(s?.default_mode) || 'light';
  return `(function(){try{var sw=${switcher ? 'true' : 'false'},fx=${
    fixedDark ? 'true' : 'false'
  },dm='${defaultMode}',m=null;try{m=sw?localStorage.getItem('triple-theme-mode'):null;}catch(e){}if(!sw)m=fx?'dark':'light';if(m!=='dark'&&m!=='light'){m=dm==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):(dm||'light');}document.documentElement.classList.toggle('dark',m==='dark');}catch(e){}try{if(localStorage.getItem('promotionBanner')==='hidden')document.documentElement.classList.add('promotion-hidden');}catch(e){}})();`;
}
