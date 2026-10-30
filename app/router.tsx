import { lazy } from 'react';
import { createRouter } from '@salla.sa/twilight-theme-engine/tanstack';
import { registry } from '@salla.sa/twilight-theme-engine';
import {
  registerHomeComponents,
  registerHomeComponentConfig,
  DefaultHomeComponents,
} from '@salla.sa/twilight-theme-engine/routes/home';
import { SliderSkeleton } from '@salla.sa/twilight-components-react';
import { routeTree } from './routeTree.gen';
import {
  Brands,
  CustomTestimonials,
  EnhancedSlider,
  FeaturedProducts,
  featuredProductsConfig,
  FixedProducts,
  MainLinks,
  PhotosSlider,
  ProductsSlider,
  SliderProductsWithHeader,
  EnhancedSquareBanners,
  Statistics,
  FAQ,
  Timeline,
  About,
  EnhancedFeatures,
  InlineImagesText,
  StackedCards,
  DoubleBanner,
  ThreeBanners,
  MapBlock,
  OfferCountdown,
  PromoWithCountdown,
  ContactForm,
  StoreBranches,
  SquareLinks,
  Reviews,
  BannersSlider,
  BeforeAfter,
  AdvancedSlider,
  AdvancedContent,
  ImagesGrid,
  SpecialProduct,
  specialProductConfig,
  CustomProducts,
  customProductsConfig,
  SpecialProductsSlider,
  specialProductsSliderConfig,
  ProductTabs,
  productTabsConfig,
  CategoryTabs,
  categoryTabsConfig,
  BoldCategories,
  boldCategoriesConfig,
  SpecialCategories,
  specialCategoriesConfig,
  SpecialCategoriesWithBg,
  specialCategoriesWithBgConfig,
  ProductsLookbook,
  productsLookbookConfig,
  ProductQuiz,
  productQuizConfig,
  ReviewProducts,
  reviewProductsConfig,
  CompleteSet,
  completeSetConfig,
  CompareProducts,
  compareProductsConfig,
  PackProduct,
  packProductConfig,
  ShopTheFeed,
  shopTheFeedConfig,
  MiniProductDetails,
  miniProductDetailsConfig,
  OutfitBuilder,
  outfitBuilderConfig,
  ShoppableVideo,
  shoppableVideoConfig,
  OffersDrawer,
  offersDrawerConfig,
  TireFilter,
  tireFilterConfig,
  VideoProducts,
  videoProductsConfig,
  Youtube,
  youtubeConfig,
  LatestProducts,
  latestProductsConfig,
  Testimonials,
  testimonialsConfig,
  // Triple redesign (2026-10) — new "tr-*" home sections.
  HeroStage,
  heroStageConfig,
  PerksTicker,
  perksTickerConfig,
  CategoryArches,
  categoryArchesConfig,
  ProductShelves,
  productShelvesConfig,
  BannerMosaic,
  bannerMosaicConfig,
  DealClock,
  dealClockConfig,
  ProductSpotlight,
  productSpotlightConfig,
  ProductStories,
  productStoriesConfig,
  CampaignProducts,
  campaignProductsConfig,
  BrandStory,
  brandStoryConfig,
  ReviewWall,
  reviewWallConfig,
  HelpDesk,
  helpDeskConfig,
  VisitUs,
  visitUsConfig,
  MessageUs,
  messageUsConfig,
} from './components/home';
import { Blog } from './components/home/Blog';
import {
  FeaturedProductsSpecialOffer,
  FeaturedProductsWithSpecialProduct,
} from './components/home/FeaturedProducts';
import { PhotosSliderWithText } from './components/home/PhotosSliderWithText';
import { registerThemeHooks } from './hooks';
import { ProductListSkeleton } from './components/product/ProductListSkeleton';
import { ProductCard } from './components/product/ProductCardSwitch';
import { resolveOption } from './lib/homeBlockData';

const ProductListPage = lazy(() =>
  import('./components/product/ProductListPage').then((m) => ({ default: m.ProductListPage }))
);

// Register theme-level hooks (AddProductToast, DigitalFilesSettings, etc.)
registerThemeHooks();

registry.register('product:list-page', ProductListPage);
registry.register('product:list-skeleton', ProductListSkeleton);

// Triple's product card: both register (first-time) and override (in case the
// engine already registered its default) so every card the engine resolves —
// listing pages, search, related products — is the theme's card (the switch
// picks Triple's card or the Khadamaty one per `use_khadamaty_product_card`).
registry.register('product:card', ProductCard);
registry.override('product:card', ProductCard);

registerHomeComponents({
  ...DefaultHomeComponents,
  brands: Brands,
  'enhanced-slider': EnhancedSlider,
  'custom-testimonials': CustomTestimonials,
  'main-links': MainLinks,
  // Triple's square-links is its own block (grid/slider of image links), not main-links.
  'square-links': SquareLinks,
  // Replaces the engine Swiper with the theme's scroll carousel (home block +
  // the product page's "similar products" `best-offers-<n>-slider`).
  'products-slider': ProductsSlider,
  // Replaces the engine Swiper with the theme's scroll carousel — same
  // progress bar + arrows as testimonials/products, cards instead of a thin
  // full-width banner strip.
  'photos-slider': PhotosSlider,
  'photos-slider-with-text': PhotosSliderWithText,
  // The renderer checks `home:featured-products:<view_style>` before the bare
  // key (theme-engine `HomePageRenderer.getComponentByPath`), and
  // `...DefaultHomeComponents` above still has the engine's own component
  // registered under the three literal `styleN` variants — leaving those out
  // here would mean only view_style-less / unrecognised blocks ever reach
  // this component, and every `style1`/`style2`/`style3` block keeps
  // rendering the broken engine variants this fork exists to replace.
  'featured-products': FeaturedProducts,
  'featured-products:style1': FeaturedProducts,
  'featured-products:style2': FeaturedProducts,
  'featured-products:style3': FeaturedProducts,
  // The block's other two layouts, each its own block.
  'featured-products-special-offer': FeaturedProductsSpecialOffer,
  'featured-products-special-product': FeaturedProductsWithSpecialProduct,
  // Fork of the engine block so its grid renders the theme's ProductCard wrapper.
  'fixed-products': FixedProducts,
  'slider-products-with-header': SliderProductsWithHeader,
  'enhanced-square-banners': EnhancedSquareBanners,
  blog: Blog,
  // Triple block: a row of animated stat counters.
  statistics: Statistics,
  // Triple block: two-column FAQ accordion.
  faq: FAQ,
  // Triple block: tabbed brand timeline.
  timeline: Timeline,
  // Triple block: about-the-store (media frame + overlapping text card).
  about: About,
  // Triple block: enhanced store features grid.
  'enhanced-features': EnhancedFeatures,
  // Triple block: big sentence with small photos inline between the words.
  'inline-images-text': InlineImagesText,
  // Triple block: sticky stacked photo cards.
  'stacked-cards': StackedCards,
  // Triple block: two side-by-side image banners.
  'double-banner': DoubleBanner,
  // Triple block: three side-by-side image banners.
  'three-banners': ThreeBanners,
  // Triple block: Google Maps embed.
  map: MapBlock,
  // Triple block: offer countdown (salla-count-down) over an optional media background.
  'offer-countdown': OfferCountdown,
  // Triple block: promo with countdown (two layouts).
  promo_with_countdown: PromoWithCountdown,
  // Triple block: contact form (Web3Forms).
  'contact-form': ContactForm,
  // Triple block: store branches (country/city tabs → map).
  store_branches: StoreBranches,
  // Triple block: custom reviews slider.
  reviews: Reviews,
  // Triple block: banners slider (Swiper effects).
  'banners-slider': BannersSlider,
  // Triple block: before/after image comparison (native drag slider).
  'before-after': BeforeAfter,
  // Triple block: hero slider (full-bleed media + frosted captions).
  'advanced-slider': AdvancedSlider,
  // Triple block: advanced content (normal / banner layouts + side drawer).
  'advanced-content': AdvancedContent,
  // Triple block: 5-image mosaic grid.
  'images-grid': ImagesGrid,
  // Triple block: one highlighted product shown with the special card (pie + countdown).
  special_product: SpecialProduct,
  // Triple block: configurable products section (source + list/slider + view-all).
  'custom-products': CustomProducts,
  // Triple block: showcase poster (media + button) beside a products slider.
  'special-products-slider': SpecialProductsSlider,
  // Triple block: tabbed products section (per-tab source + list/slider).
  'product-tabs': ProductTabs,
  // Triple block: banner with category tabs (banner swaps per tab).
  'category-tabs': CategoryTabs,
  // Triple category blocks.
  'bold-categories': BoldCategories,
  'special-categories': SpecialCategories,
  'special-categories-with-bg': SpecialCategoriesWithBg,
  // Triple product blocks: shoppable lookbook + product finder quiz.
  'products-lookbook': ProductsLookbook,
  'product-quiz': ProductQuiz,
  // Triple product blocks: reviews beside the bought product + shop-the-set.
  'review-products': ReviewProducts,
  'complete-set': CompleteSet,
  'compare-products': CompareProducts,
  'pack-product': PackProduct,
  'shop-the-feed': ShopTheFeed,
  'mini-product-details': MiniProductDetails,
  'outfit-builder': OutfitBuilder,
  'shoppable-video': ShoppableVideo,
  'offers-drawer': OffersDrawer,
  'tire-filter': TireFilter,
  'video-products': VideoProducts,
  // Triple redesign (2026-10) — new "tr-*" home sections (latest Twig).
  'hero-stage': HeroStage,
  'perks-ticker': PerksTicker,
  'category-arches': CategoryArches,
  'product-shelves': ProductShelves,
  'banner-mosaic': BannerMosaic,
  'deal-clock': DealClock,
  'product-spotlight': ProductSpotlight,
  'product-stories': ProductStories,
  'campaign-products': CampaignProducts,
  'brand-story': BrandStory,
  'review-wall': ReviewWall,
  'help-desk': HelpDesk,
  'visit-us': VisitUs,
  'message-us': MessageUs,
  // `journal` replaces the old `blog` block in the redesign; reuse the Blog view until ported.
  journal: Blog,
  // Engine-default blocks whose view Triple replaces 1:1.
  youtube: Youtube,
  'latest-products': LatestProducts,
  testimonials: Testimonials,
});

// Wrapper `<section>` classes for `featured-products` — the engine only styles
// the literal `styleN` values; this covers the semantic `view_style`s too.
// `custom-testimonials` gets `s-block--full-bg` so the gray band runs edge-to-edge.
registerHomeComponentConfig({
  'featured-products': featuredProductsConfig,
  'featured-products-special-offer': featuredProductsConfig,
  'featured-products-special-product': featuredProductsConfig,
  // Gray band edge to edge; the height is a card plus the heading and controls.
  blog: {
    className: (data) =>
      `s-block s-block--blog s-block--full-bg${data.custom_classes ? ` ${data.custom_classes}` : ''}`,
    height: 'clamp(480px, 45vw, 660px)',
  },
  'custom-testimonials': {
    className: 's-block s-block--custom-testimonials s-block--full-bg',
  },
  // Lazy placements (blocks 4+): reserve the loaded blocks' height and show the
  // same SliderSkeleton the SSR path shows (sized in home-blocks.scss), not the
  // engine's 400px/200px defaults with mismatched skeletons (CLS on scroll-in).
  'enhanced-slider': {
    height: 'calc(100vw / 2.4)', // the 12:5 slide ratio
    placeholder: <SliderSkeleton />,
    // The boxed variant (`in_container`) is capped at the container width, so
    // its skeleton must be too (home-blocks.scss) or the reservation oversizes.
    className: (data) =>
      `s-block s-block--enhanced-slider${data.in_container ? ' s-block--enhanced-slider-boxed' : ''}${
        data.custom_classes ? ` ${data.custom_classes}` : ''
      }`,
  },
  'main-links': {
    height: '112px',
    placeholder: <SliderSkeleton />,
    // Keeps the engine entry's merge classes; theme config replaces, not merges.
    className: (data) => {
      const mergeWithTop = data.merge_links_with_top_component;
      return [
        's-block',
        's-block--main-links',
        mergeWithTop && data.position ? 'merge-with-top-component' : '',
        !data.title && mergeWithTop ? 'merged-has-no-title' : '',
      ]
        .filter(Boolean)
        .join(' ');
    },
  },
  'square-links': {
    className: (data) =>
      ['s-block', 's-block--square-links', data.is_slider && data.centered_force ? 'force-center' : '', data.merge_links_with_top_component && data.position ? 'merge-with-top-component' : '', data.custom_classes]
        .filter(Boolean)
        .join(' '),
  },
  // Taller cards than the engine's thin full-width banner strip — reserve
  // more skeleton height so the real content doesn't shift the page on load.
  'photos-slider': {
    height: 'clamp(210px, 32vw, 420px)',
    placeholder: <SliderSkeleton />,
    className: (data) =>
      `s-block s-block--photos-slider${data.is_repeated ? ' repeated-block' : ''}`,
  },
  'photos-slider-with-text': {
    height: 'clamp(300px, 36vw, 470px)', // a card plus the controls row
    placeholder: <SliderSkeleton />,
    className: (data) =>
      `s-block s-block--photos-slider-with-text${data.in_container ? ' s-block--photos-slider-with-text-boxed' : ''}`,
  },
  // Triple statistics block wrapper classes (the count-up runs inside the component).
  statistics: {
    className: (data) => ['s-block', 's-block--stats', data.custom_classes].filter(Boolean).join(' '),
  },
  // Triple FAQ block wrapper classes.
  faq: {
    className: (data) =>
      ['s-block', 'relative', 's-block--faq', 'overflow-hidden', 'bg-transparent', data.has_bg ? 'has-bg' : '', data.custom_classes]
        .filter(Boolean)
        .join(' '),
  },
  // Triple timeline block wrapper classes.
  timeline: {
    className: (data) => ['s-block', 'tr-tl-block', data.custom_classes].filter(Boolean).join(' '),
  },
  // Triple about block: full-width band; the colored .tr-about wrapper + --about-bg are inside the component.
  about: {
    className: (data) => ['s-block', 's-block--about', 's-block--full-bg', data.custom_classes].filter(Boolean).join(' '),
  },
  // Triple enhanced-features block (the section is itself the container, per the Twig).
  'enhanced-features': {
    className: (data) =>
      ['s-block', 's-block--enhanced-features', 'container', data.mini_features ? 'mini-features' : '', data.custom_classes]
        .filter(Boolean)
        .join(' '),
  },
  // Triple inline-images-text block.
  'inline-images-text': {
    className: (data) => ['s-block', 'tr-inline-block', data.custom_classes].filter(Boolean).join(' '),
  },
  // Triple stacked-cards block.
  'stacked-cards': {
    className: (data) => ['s-block', 'tr-stack-block', data.custom_classes].filter(Boolean).join(' '),
  },
  // Triple double-banner block.
  'double-banner': {
    className: (data) =>
      ['s-block', 's-block--fixed-banner', 's-block--double-banner', 'wide-placeholder', 'double-banner', data.fit_height ? 'is-fit-height' : '', data.custom_classes]
        .filter(Boolean)
        .join(' '),
  },
  // Triple three-banners block.
  'three-banners': {
    className: (data) =>
      ['s-block', 's-block--fixed-banner', 's-block--three-banners', 'wide-placeholder', 'three-banners', data.fit_height ? 'is-fit-height' : '', data.custom_classes]
        .filter(Boolean)
        .join(' '),
  },
  // Triple map block.
  map: {
    className: (data) =>
      ['s-block', 's-block--map', data.map_dark_mode ? 'map--dark' : '', data.custom_classes]
        .filter(Boolean)
        .join(' '),
  },
  // Triple offer-countdown: the .tr-offer element (bg + boxed/full-width + inline vars) is in the
  // component; the section only carries s-block spacing when add_top_space is on.
  'offer-countdown': {
    className: (data) => [data.add_top_space ? 's-block' : '', data.custom_classes].filter(Boolean).join(' '),
  },
  // Triple promo-with-countdown block (.as-img / .as-bg are inside the component).
  promo_with_countdown: {
    className: (data) => ['promo_with_countdown', 's-block', data.custom_classes].filter(Boolean).join(' '),
  },
  // Triple contact-form block.
  'contact-form': {
    className: (data) =>
      [data.add_top_space ? 'has-top-space' : '', 's-block--contact-form', 's-block', data.custom_classes]
        .filter(Boolean)
        .join(' '),
  },
  // Triple store-branches block (the tab shape is a section modifier class).
  store_branches: {
    className: (data) => {
      const shape = resolveOption(data.tab_shape, ['buttons', 'toggle', 'underline'] as const, 'buttons');
      return ['s-block', 's-block--store-branches', `s-block--store-branches--${shape}`, data.add_top_space ? 'mt-16' : '', data.custom_classes]
        .filter(Boolean)
        .join(' ');
    },
  },
  // Triple reviews block.
  reviews: {
    className: (data) =>
      ['s-block', 's-block--custom-reviews', 'overflow-hidden', 'relative', data.has_bg ? 'has-bg' : '', data.custom_classes]
        .filter(Boolean)
        .join(' '),
  },
  // Triple banners-slider block (the Swiper effect is also a section class).
  'banners-slider': {
    className: (data) => {
      const effect = resolveOption(data.effect, ['fade', 'slide', 'flip', 'cards', 'coverflow', 'cube'] as const, 'slide');
      return ['s-block', 'wide-placeholder', 'banners-slider', effect, data.add_top_space ? 'has-top-space' : '', data.fit_height ? 'is-fit-height' : '', data.fit_height && data.object_fit ? 'is-object-fit' : '', data.custom_classes]
        .filter(Boolean)
        .join(' ');
    },
  },
  // Triple before-after block (the .tr-compare modifier classes; --compare-divider is inside).
  'before-after': {
    className: (data) =>
      [
        'tr-compare',
        ((data.top_gap ?? data.add_top_space) ?? true) ? 's-block' : '',
        (data.heading ?? data.title) || (data.blurb ?? data.description) ? 'tr-compare--with-text' : '',
        (data.upright_split ?? data.vertical) ? 'tr-compare--vertical' : '',
        data.custom_classes,
      ]
        .filter(Boolean)
        .join(' '),
  },
  // Triple advanced-slider (hero): the .tr-hero classes on the section; inline vars on the slider.
  'advanced-slider': {
    className: (data) => {
      const count = Array.isArray(data.slides) ? data.slides.length : 0;
      return ['tr-hero', `tr-hero--${data.position ?? 0}`, 's-block--advanced-slider', data.auto_height ? 'tr-hero--auto' : '', data.show_controls && count > 1 ? 'tr-hero--controls' : '', data.add_top_space ? 's-block' : '', data.custom_classes]
        .filter(Boolean)
        .join(' ');
    },
  },
  // Triple advanced-content: normal vs banner section classes (banner inline vars are in the component).
  'advanced-content': {
    className: (data) => {
      const type = resolveOption(data.content_type, ['image', 'video'] as const, 'image');
      const mediaSrc = type === 'video' ? (data.video_url as string) : (data.image as string);
      const banner = Boolean(data.show_media && mediaSrc && data.use_background_layout);
      const direction = resolveOption(data.background_layout_direction, ['horizontal', 'vertical'] as const, 'horizontal');
      const classes = [data.add_top_space ? 's-block' : '', 's-block--advanced-content'];
      if (banner) {
        classes.push('s-block--background-layout', `s-block--bg-${direction}`);
        if (!data.full_width) classes.push('s-block--bg-contained');
      } else {
        classes.push('s-block--advanced-content-normal');
      }
      if (data.custom_classes) classes.push(data.custom_classes as string);
      return classes.filter(Boolean).join(' ');
    },
  },
  // Triple images-grid block.
  special_product: specialProductConfig,
  'custom-products': customProductsConfig,
  'special-products-slider': specialProductsSliderConfig,
  'product-tabs': productTabsConfig,
  'category-tabs': categoryTabsConfig,
  'bold-categories': boldCategoriesConfig,
  'special-categories': specialCategoriesConfig,
  'special-categories-with-bg': specialCategoriesWithBgConfig,
  'products-lookbook': productsLookbookConfig,
  'product-quiz': productQuizConfig,
  'review-products': reviewProductsConfig,
  'complete-set': completeSetConfig,
  'compare-products': compareProductsConfig,
  'pack-product': packProductConfig,
  'shop-the-feed': shopTheFeedConfig,
  'mini-product-details': miniProductDetailsConfig,
  'outfit-builder': outfitBuilderConfig,
  'shoppable-video': shoppableVideoConfig,
  'offers-drawer': offersDrawerConfig,
  'tire-filter': tireFilterConfig,
  'video-products': videoProductsConfig,
  youtube: youtubeConfig,
  'latest-products': latestProductsConfig,
  testimonials: testimonialsConfig,
  'images-grid': {
    className: (data) =>
      ['s-block', 's-block--images-grid', data.add_top_space ? 'has-top-space' : '', data.custom_classes]
        .filter(Boolean)
        .join(' '),
  },
  // Triple redesign (2026-10) — new "tr-*" home sections.
  'hero-stage': heroStageConfig,
  'perks-ticker': perksTickerConfig,
  'category-arches': categoryArchesConfig,
  'product-shelves': productShelvesConfig,
  'banner-mosaic': bannerMosaicConfig,
  'deal-clock': dealClockConfig,
  'product-spotlight': productSpotlightConfig,
  'product-stories': productStoriesConfig,
  'campaign-products': campaignProductsConfig,
  'brand-story': brandStoryConfig,
  'review-wall': reviewWallConfig,
  'help-desk': helpDeskConfig,
  'visit-us': visitUsConfig,
  'message-us': messageUsConfig,
});

// Singleton for client-side (preserves QueryClient cache across navigations)
// SSR creates fresh instances per request via getRouter()
let clientRouter: ReturnType<typeof createRouter> | null = null;

// TanStack Start expects getRouter() for SSR compatibility
export function getRouter() {
  // On client: reuse existing router to preserve QueryClient cache
  if (typeof window !== 'undefined' && clientRouter) {
    return clientRouter;
  }

  // On SSR or first client load: create new router
  const router = createRouter(routeTree);

  // Cache for client-side
  if (typeof window !== 'undefined') {
    clientRouter = router;
  }

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
