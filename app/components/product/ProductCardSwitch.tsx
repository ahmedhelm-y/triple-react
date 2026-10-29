import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { TripleProductCard, type TripleProductCardProps } from './TripleProductCard';
import { KhadamatyProductCard } from './KhadamatyProductCard';

/**
 * Picks the card the merchant chose: Triple's own card by default, or the
 * classic {@link KhadamatyProductCard} when `use_khadamaty_product_card` is on.
 * This is the Twig theme's two-card split (`master.twig` loads one of the two
 * `custom-salla-product-card` scripts by that setting) — here one component
 * reads the setting and renders the matching card.
 *
 * Registered as the engine `product:card` and re-exported as `ProductCard`, so
 * every block and every engine card resolution goes through it. The setting is
 * read from the SSR-safe twilight context, so the choice is stable across
 * hydration.
 */
export function ProductCard(props: TripleProductCardProps) {
  const { theme } = useTwilight();
  const khadamaty = !!(theme?.settings as Record<string, unknown> | undefined)
    ?.use_khadamaty_product_card;
  return khadamaty ? <KhadamatyProductCard {...props} /> : <TripleProductCard {...props} />;
}
