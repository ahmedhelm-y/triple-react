import type { DetailedHTMLProps, HTMLAttributes } from 'react';

/**
 * Triple's product card host element. In the Twig theme the card IS a
 * `<custom-salla-product-card>` web component; a handful of card SCSS selectors
 * (`triple-card.scss`) target that tag by name — the auto-fit width, the
 * block-reveal stagger animation, the header-overlay exclusion. Rendering the
 * React card under the same tag keeps those rules matching 1:1. The tag carries
 * no behaviour here (the theme never registers it as a custom element); it is a
 * styling hook only.
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'custom-salla-product-card': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        lookbook?: string;
      };
      /** Salla's loading spinner web component (used inside the quick view). Not
       *  declared in the engine's ambient types, so it is added here. */
      'salla-loading': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
      /** Salla's donation/campaign progress bar (the Khadamaty card's donation
       *  products). Not in the engine's ambient types; `donation` is set as an
       *  attribute (a JSON string). */
      'salla-progress-bar': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        donation?: string;
      };
      /** `lite-youtube-embed` web component (the `youtube` home block). Registered
       *  by importing the `lite-youtube-embed` package on the client. */
      'lite-youtube': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        videoid?: string;
        params?: string;
        playlabel?: string;
      };
      /** Salla's cart coupons web component (the cart drawer footer). Not in the
       *  engine's ambient types. */
      'salla-cart-coupons': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
