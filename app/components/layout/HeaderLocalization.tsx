import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { openStoreSwitcher, type StoreSwitcher } from '../../lib/storeSwitchers';

/**
 * The header language / currency button (`panel_header` → `header_localization_*`),
 * the React port of the Twig theme's in-header localization switcher. It opens the
 * same Salla switchers as the top bar (`openStoreSwitcher`), but can live in the
 * main bar with its own display mode, style and content, independent of the layout.
 *
 * Settings:
 *  - `header_localization_content`  — both | language | currency
 *  - `header_localization_display`  — icon_text | icon | text
 *  - `header_localization_style`    — plain | outline | filled
 *  - `header_localization_icon` / `header_currency_icon` — the two glyphs
 *
 * Each button only shows when the store actually offers it (multilingual /
 * multiple currencies), mirroring {@link HeaderTopnav}. Placement (`start` / `end`)
 * and the `header_localization_mobile` gate are handled by the `Header`.
 */
export function HeaderLocalization() {
  const { store, currency, theme } = useTwilight();
  const { languageName } = useTranslation();
  const ts = theme?.settings as Record<string, unknown> | undefined;

  const content = (ts?.header_localization_content as string) || 'both';
  const display = (ts?.header_localization_display as string) || 'icon_text';
  const style = (ts?.header_localization_style as string) || 'plain';
  const langIcon = (ts?.header_localization_icon as string) || 'sicon-earth';
  const curIcon = (ts?.header_currency_icon as string) || 'sicon-dollar-coin-stack';

  const showLang = content !== 'currency' && !!store?.settings?.is_multilingual;
  const showCurrency = content !== 'language' && !!store?.settings?.currencies_enabled;
  if (!showLang && !showCurrency) return null;

  const currencyLabel = currency?.name || currency?.symbol || currency?.code || 'SAR';

  const Button = ({
    which,
    icon,
    label,
  }: {
    which: StoreSwitcher;
    icon: string;
    label: string;
  }) => (
    <button
      type="button"
      className={`site-header__loc-btn site-header__loc-btn--${style}`}
      aria-label={label}
      aria-haspopup="dialog"
      onClick={() => openStoreSwitcher(which)}
    >
      {display !== 'text' && <i className={icon} aria-hidden="true" />}
      {display !== 'icon' && <span className="site-header__loc-label">{label}</span>}
    </button>
  );

  return (
    <div className="site-header__loc">
      {showLang && <Button which="language" icon={langIcon} label={languageName} />}
      {showCurrency && <Button which="currency" icon={curIcon} label={currencyLabel} />}
    </div>
  );
}
