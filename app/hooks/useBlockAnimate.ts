import { useEffect } from 'react';

/**
 * Reveal-on-scroll for `.s-block--animate` home blocks, the React port of
 * `triple_twig/src/assets/js/partials/block-animate.js`.
 *
 * A revealed block gets `data-animated="true"`; `.anime-item` children fade up
 * in a stagger (via the Web Animations API — no animejs dependency). This is
 * not just polish: `triple-card.scss` keeps product cards in an animate block
 * at `opacity:0` until `[data-animated]` is set, so without this the home
 * page's cards would never appear. With animations off (`animate_blocks`),
 * reduced motion, or no IntersectionObserver, every block is revealed at once
 * as `data-animated="static"` (no stagger).
 */
export function useBlockAnimate(enabled: boolean) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const noMotion =
      !enabled ||
      typeof IntersectionObserver === 'undefined' ||
      (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

    const reveal = (block: HTMLElement, value = 'true') => {
      block.dataset.animated = value;
    };

    let observer: IntersectionObserver | null = null;
    if (!noMotion) {
      observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            observer!.unobserve(entry.target);
            const block = entry.target as HTMLElement;
            reveal(block);
            block.querySelectorAll<HTMLElement>('.anime-item').forEach((item, i) => {
              item.animate(
                [
                  { opacity: 0, transform: 'translateY(20px)' },
                  { opacity: 1, transform: 'translateY(0)' },
                ],
                { duration: 800, delay: i * 100, easing: 'cubic-bezier(0.25,0.46,0.45,0.94)', fill: 'backwards' }
              );
            });
          }),
        { threshold: 0.15 }
      );
    }

    const setup = () => {
      const blocks = document.querySelectorAll<HTMLElement>('.s-block--animate:not([data-animate-ready])');
      blocks.forEach((block) => {
        block.dataset.animateReady = '';
        if (noMotion || !observer) {
          reveal(block, 'static');
          return;
        }
        block.querySelectorAll<HTMLElement>('.anime-item').forEach((item) => {
          item.style.opacity = '0';
        });
        observer.observe(block);
      });
    };

    setup();

    // Blocks can mount after hydration (lazy sections); re-scan when the DOM changes.
    let raf = 0;
    const mo = new MutationObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setup();
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      observer?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled]);
}
