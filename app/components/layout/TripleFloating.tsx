import { useEffect, useRef, useState } from 'react';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';

/**
 * Triple floating extras — scroll-to-top (with a scroll-progress ring), phone and
 * WhatsApp buttons, and the discount popup + side strip. Port of
 * `triple_twig/src/views/pages/partials/triple/floating.twig` + the
 * `scrollToTop` / `discountPopup` / `copyButtons` behaviour in
 * `js/partials/triple-extras.js`. Styling: `04-components/triple-extras.scss`.
 *
 * The bottom nav (`enable_bottom_nav`) is served by the theme's own
 * {@link MobileBottomBar}, so it is not duplicated here.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export function TripleFloating() {
  const { theme } = useTwilight();
  const s = (theme?.settings ?? {}) as Record<string, any>;

  return (
    <>
      {s.scroll_top_enabled ? <ScrollToTop position={s.scroll_top_position || 'left'} /> : null}

      {s.phone_btn_enabled && s.phone_number ? (
        <div
          id="phone-triple"
          className={`phone-triple ${s.wa_enabled && s.wa_number ? 'wa-enabled' : ''}`}
          style={{ ['--phone-color' as any]: s.phone_btn_bg || '#dd1d24' }}
        >
          <a className="flex-center" aria-label="Call us" href={`tel:${s.phone_number}`} rel="noopener" target="_blank">
            <i className="sicon-phone text-3xl" style={{ color: s.phone_btn_text_color || '#ffffff' }} />
          </a>
        </div>
      ) : null}

      {s.wa_enabled && s.wa_number ? <WhatsAppButton s={s} /> : null}

      {s.discount_popup_enabled ? <DiscountPopup s={s} /> : null}
    </>
  );
}

function ScrollToTop({ position }: { position: string }) {
  const btnRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const path = pathRef.current;
    const length = path ? path.getTotalLength() : 0;
    if (path) {
      path.style.transition = 'none';
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = String(length);
      path.getBoundingClientRect();
      path.style.transition = 'stroke-dashoffset 10ms linear';
    }

    let frame = 0;
    let isShown = false;
    const update = () => {
      frame = 0;
      const scroll = window.pageYOffset || document.documentElement.scrollTop;
      const show = scroll >= 200;
      if (show !== isShown) {
        isShown = show;
        setShown(show);
      }
      if (path) {
        const height = document.documentElement.scrollHeight - window.innerHeight;
        path.style.strokeDashoffset = String(length - (scroll * length) / (height || 1));
      }
    };
    update();
    const onScroll = () => {
      frame = frame || requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      ref={btnRef}
      className={`scroll-to-top animated ${position} ${shown ? 'fadeInUp' : ''}`}
      style={{ display: shown ? 'block' : 'none' }}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <svg className="progress-circle svg-content" width="100%" height="100%" viewBox="-1 -1 102 102">
        <path ref={pathRef} d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98" />
      </svg>
    </div>
  );
}

function WhatsAppButton({ s }: { s: Record<string, any> }) {
  const number = String(s.wa_number).replace(/[+\s-]/g, '');
  const text = s.wa_btn_text ? String(s.wa_btn_text) : '';
  const interactive = s.interactive_wa && text;
  const href = `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
  const color = s.wa_btn_text_color || '#ffffff';
  return (
    <div
      id="wa-triple"
      className={`wa-triple flex-center ${s.wa_position || 'right'} rounded-full ${interactive ? 'interactive' : ''}`}
      style={{ backgroundColor: s.wa_btn_bg || '#22c55e' }}
    >
      <a className="flex-center" aria-label="Whatsapp" rel="noopener" target="_blank" href={href}>
        <i className="sicon-whatsapp2 text-3xl text-white" style={{ color }} />
        {interactive ? (
          <span className="wa-triple__text" style={{ color }}>
            {text}
          </span>
        ) : null}
      </a>
    </div>
  );
}

const STORE_KEY = 'triple-discount-popup-shown';

function DiscountPopup({ s }: { s: Record<string, any> }) {
  const { t } = useTranslation();
  const image = s.discount_popup_image as string | undefined;
  const title = s.discount_popup_title as string | undefined;
  const desc = s.discount_popup_description as string | undefined;
  const code = s.discount_popup_code as string | undefined;
  const link = s.discount_popup_add_link ? (s.discount_popup_btn_link as string) : null;
  const imageOnly = s.discount_popup_image_only && image;
  const imageClick = (s.discount_popup_image_click as string) || 'none';
  const delay = (Number(s.discount_popup_delay) || 3) * 1000;
  const showOnce = !!s.show_popup_once;

  const [open, setOpen] = useState(false);
  const [scaled, setScaled] = useState(false);
  const [stripVisible, setStripVisible] = useState(false);
  const [toast, setToast] = useState(false);
  const [copied, setCopied] = useState(false);

  const get = () => {
    try {
      return localStorage.getItem(STORE_KEY);
    } catch {
      return null;
    }
  };
  const set = () => {
    try {
      localStorage.setItem(STORE_KEY, 'true');
    } catch {
      /* ignore */
    }
  };
  const clear = () => {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* ignore */
    }
  };

  const show = () => {
    setOpen(true);
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => setScaled(true), 10);
    if (showOnce) set();
  };
  const hide = () => {
    setScaled(false);
    window.setTimeout(() => {
      setOpen(false);
      document.body.style.overflow = '';
    }, 300);
    setStripVisible(true);
  };

  // Auto-show after the delay (unless shown once already).
  useEffect(() => {
    let skip = false;
    if (showOnce) {
      if (get()) {
        setStripVisible(true);
        skip = true;
      }
    } else {
      clear();
    }
    if (skip) return;
    const timer = window.setTimeout(show, delay);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) hide();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const copyImageCode = () => {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => {
      setToast(true);
      window.setTimeout(() => setToast(false), 2000);
    });
  };
  const copyCode = () => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1000);
  };

  const contentClass = `triple-discount-popup-content ${imageOnly ? 'image-only' : image ? 'with-image' : ''} ${
    scaled ? 'scale-100' : 'scale-95'
  }`.trim();

  return (
    <>
      <div
        id="triple-discount-popup"
        className={`triple-discount-popup-overlay fixed inset-0 z-[9999] ${open ? '' : 'hidden'} bg-black/50 backdrop-blur-sm`}
        onClick={(e) => e.target === e.currentTarget && hide()}
      >
        <div className="triple-discount-popup-container flex items-center justify-center min-h-screen p-4">
          {imageOnly ? (
            <div
              className={`${contentClass} relative rounded-2xl shadow-2xl w-full overflow-hidden transform transition-transform duration-300 ease-out`}
              style={{ maxWidth: '32rem' }}
            >
              <button
                id="triple-close-discount-popup"
                className="absolute top-2 left-2 z-10 w-8 h-8 bg-gray-100/10 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                aria-label="Close Popup"
                onClick={hide}
              >
                <i className="sicon-cancel text-danger" />
              </button>
              {imageClick === 'redirect' && link ? (
                <a href={link}>
                  <img src={image} alt={title || ''} className="w-full h-auto" />
                </a>
              ) : imageClick === 'copy_code' && code ? (
                <>
                  <img
                    id="triple-discount-popup-image"
                    src={image}
                    alt={title || ''}
                    className="w-full h-auto cursor-pointer"
                    onClick={copyImageCode}
                  />
                  <div
                    id="triple-popup-toast"
                    className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/80 text-white text-sm transition-opacity ${
                      toast ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    {t('blocks.triple.code_copied', 'تم نسخ الكود')}
                  </div>
                </>
              ) : (
                <img src={image} alt={title || ''} className="w-full h-auto" />
              )}
            </div>
          ) : (
            <div
              className={`${contentClass} bg-storeBG rounded-2xl shadow-2xl w-full overflow-hidden transform transition-transform duration-300 ease-out`}
              style={{ maxWidth: image ? '42rem' : '28rem' }}
            >
              <div className="flex flex-col md:flex-row">
                {image ? (
                  <div className="md:w-1/2">
                    <img src={image} alt={title || ''} className="w-full h-48 md:h-full object-cover" />
                  </div>
                ) : null}

                <div className={`${image ? 'md:w-1/2' : 'w-full'} p-6 relative`}>
                  <button
                    id="triple-close-discount-popup"
                    className="absolute top-2 left-2 w-8 h-8 bg-gray-100/10 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                    aria-label="Close Popup"
                    onClick={hide}
                  >
                    <i className="sicon-cancel text-danger" />
                  </button>

                  <div className="flex flex-col justify-between h-full gap-3">
                    <div className="flex flex-col gap-3">
                      {title ? (
                        <h2 className="text-xl md:text-2xl font-bold text-store-text-primary">{title}</h2>
                      ) : null}
                      {desc ? (
                        <p
                          className="text-base opacity-80 text-store-text-primary"
                          style={{ whiteSpace: 'pre-line' }}
                        >
                          {desc}
                        </p>
                      ) : null}
                    </div>

                    {code ? (
                      <div className="triple-discount-code-section bg-store-bg-secondary rounded-lg p-4 border-2 border-dashed border-gray-300">
                        <div className="flex items-center flex-col gap-5">
                          <div className="flex-1">
                            <p className="text-sm text-store-text-primary mb-1">
                              {t('blocks.triple.discount_code', 'كود الخصم')}
                            </p>
                            <div className="flex items-center justify-center">
                              <span id="triple-discount-code-text" className="text-xl font-bold text-primary">
                                {code}
                              </span>
                            </div>
                          </div>
                          <salla-button
                            {...({ size: 'small' } as any)}
                            data-content={code}
                            className="triple-copy-code"
                            onClick={copyCode}
                          >
                            <i
                              className={`copy-icon text-primary-reverse ${copied ? 'sicon-check' : 'sicon-swap-stroke'} pointer-events-none`}
                            />
                            <span>{t('blocks.triple.copy', 'نسخ')}</span>
                          </salla-button>
                        </div>
                      </div>
                    ) : null}

                    {link ? (
                      <a
                        id="triple-start-shopping-btn"
                        href={link}
                        className="block text-center w-full bg-primary hover:bg-primary/90 text-primary-reverse font-semibold p-1 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
                      >
                        {t('blocks.triple.start_shopping', 'ابدأ التسوّق')}
                      </a>
                    ) : (
                      <button
                        id="triple-start-shopping-btn"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-reverse font-semibold p-1 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
                        onClick={hide}
                      >
                        {t('blocks.triple.start_shopping', 'ابدأ التسوّق')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {s.discount_popup_floating_strip ? (
        <button
          id="triple-discount-strip"
          className={`triple-discount-strip triple-discount-strip--${s.discount_popup_strip_position || 'right'} ${
            stripVisible ? 'is-visible' : ''
          }`}
          style={{
            backgroundColor: s.discount_popup_strip_bg || '#e02d2d',
            color: s.discount_popup_strip_color || '#ffffff',
          }}
          aria-label={s.discount_popup_strip_label || t('blocks.triple.offers', 'العروض')}
          onClick={show}
        >
          <span>{s.discount_popup_strip_label || t('blocks.triple.offers', 'العروض')}</span>
        </button>
      ) : null}
    </>
  );
}
