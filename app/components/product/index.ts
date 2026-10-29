export { DigitalFilesSettings } from './DigitalFilesSettings';
export { ProductGallery } from './ProductGallery';
export type { DigitalFilesSettingsProps } from './DigitalFilesSettings';
export { ProductPage } from './ProductPage';
export { ProductDetails } from './ProductDetails';
export { AddToCartForm } from './AddToCartForm';
// Product card: a switch over `use_khadamaty_product_card` that renders either
// Triple's own card (default, 1:1 port of the default custom-salla-product-card)
// or the classic Khadamaty card. Every block that imports `{ ProductCard }` and
// the engine's internal `product:card` resolve to this switch.
export { ProductCard } from './ProductCardSwitch';
export { TripleProductCard } from './TripleProductCard';
export { KhadamatyProductCard } from './KhadamatyProductCard';
export type { TripleProductCardProps } from './TripleProductCard';
