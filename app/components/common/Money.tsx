import { useMoney } from '@salla.sa/twilight-theme-engine/hooks/useMoney';

/**
 * Renders a monetary amount the way Twilight does — through the engine's
 * `useMoney().format()`, which returns a React node (with the SAR riyal icon
 * `<i className="sicon-sar" />` as a real element when the store uses it).
 *
 * The Twig theme printed `salla.money(...)` with `|raw`; the global
 * `salla.money()` returns an HTML *string* (`"100 <i class=sicon-sar></i>"`), so
 * rendering it as a React text child escapes the tag and shows it literally.
 * This component is the fix: every visible price uses it, matching the engine's
 * own product card / cart components, which render prices via `useMoney`.
 *
 * `dash` mirrors the theme's `show_price_as_dash` behaviour: an empty/zero
 * amount shows "-" instead of a zero price.
 */
export function Money({
  amount,
  dash = false,
}: {
  amount: number | string | null | undefined;
  dash?: boolean;
}) {
  const { format } = useMoney();
  if (amount == null || amount === '' || Number(amount) === 0) {
    return dash ? <>-</> : <>{format(0)}</>;
  }
  return <>{format(amount)}</>;
}
