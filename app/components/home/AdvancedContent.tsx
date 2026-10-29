import { memo, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import {
  pickLang,
  collectionField,
  resolveOption,
  normalizeEndDate,
  type MultiLang,
} from '../../lib/homeBlockData';

/**
 * Advanced Content (Triple) — home block.
 * Port of triple_twig `views/components/home/advanced-content.twig` + advanced-content.scss
 * (+ the drawer styles from triple-extras.scss, now in advanced-content-drawer.scss).
 * Two layouts: a normal stack (title/desc/countdown/media/button) and a banner (media as a
 * background with content over it). The button either links out or opens a side drawer whose
 * open/close (cart-drawer.js) becomes React state (no DOM class toggling, no move-to-body).
 * Banner inline vars (--overlay-opacity, --text-color) sit on a wrapper inside the section.
 */

interface DrawerItemRaw {
  [key: string]: unknown;
}

export interface AdvancedContentData {
  title?: MultiLang;
  subtitle?: MultiLang;
  description?: MultiLang;
  content_type?: unknown;
  image?: string;
  video_url?: string;
  show_media?: boolean;
  use_background_layout?: boolean;
  full_width?: boolean;
  background_overlay_opacity?: number;
  background_text_color?: string;
  background_layout_direction?: unknown;
  video_autoplay?: boolean;
  button_text?: MultiLang;
  button_as_link?: boolean;
  button_link?: string;
  drawer_title?: MultiLang;
  drawer_items?: DrawerItemRaw[];
  show_countdown?: boolean;
  countdown_date?: string;
  add_top_space?: boolean;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface AdvancedContentProps {
  data: AdvancedContentData;
}

export const AdvancedContent = memo(function AdvancedContent({ data }: AdvancedContentProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const title = pickLang(data.title, lang);
  const subtitle = pickLang(data.subtitle, lang);
  const description = pickLang(data.description, lang);
  const btnText = pickLang(data.button_text, lang);
  const drawerTitle = pickLang(data.drawer_title, lang);

  const type = resolveOption(data.content_type, ['image', 'video'] as const, 'image');
  const direction = resolveOption(data.background_layout_direction, ['horizontal', 'vertical'] as const, 'horizontal');
  const mediaSrc = type === 'video' ? data.video_url : data.image;
  const hasMedia = Boolean(data.show_media && mediaSrc);
  const banner = hasMedia && Boolean(data.use_background_layout);
  const asLink = Boolean(data.button_as_link);
  const countdown = Boolean(data.show_countdown && data.countdown_date);
  const countdownDate = normalizeEndDate(data.countdown_date);
  const textColor = data.background_text_color || '#ffffff';
  const drawerItems = Array.isArray(data.drawer_items) ? data.drawer_items : [];

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeDrawer = () => {
    setClosing(true);
    window.setTimeout(() => {
      setDrawerOpen(false);
      setClosing(false);
    }, 300);
  };

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  if (!(title || description || hasMedia || btnText)) return null;

  const videoProps = data.video_autoplay
    ? { autoPlay: true, muted: true, loop: true, playsInline: true }
    : { controls: true, playsInline: true };

  const buttonEl = btnText ? (
    asLink ? (
      <a
        href={data.button_link || '#'}
        className={`advanced-content-btn${banner ? '' : ' inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors duration-200'}`}
      >
        {btnText} <i className="sicon-arrow-left"></i>
      </a>
    ) : (
      <button
        type="button"
        className={`advanced-content-btn${banner ? '' : ' inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors duration-200'}`}
        onClick={() => setDrawerOpen(true)}
      >
        {btnText} <i className="sicon-arrow-left"></i>
      </button>
    )
  ) : null;

  const mediaEl = type === 'video' ? (
    <video src={mediaSrc} className="advanced-content__video w-full h-full object-cover" preload="metadata" {...videoProps} />
  ) : (
    <img src={mediaSrc} alt={title || 'Media'} className="advanced-content__image w-full h-full object-cover" loading="lazy" />
  );

  const bannerVars = { '--overlay-opacity': (data.background_overlay_opacity ?? 50) / 100, '--text-color': textColor } as CSSProperties;

  return (
    <>
      {banner ? (
        <div style={bannerVars}>
          <div className="background-media-wrapper">
            {type === 'video' ? (
              <video className="background-media" src={mediaSrc} preload="metadata" {...videoProps} />
            ) : (
              <div className="background-media" style={{ backgroundImage: `url('${mediaSrc}')` }}></div>
            )}
            <div className="background-overlay"></div>
          </div>
          <div className="advanced-content__body relative overflow-hidden py-8">
            <div className="advanced-content__inner mx-auto container">
              <div className="advanced-content__layout background-content-wrapper relative">
                <div className="w-full advanced-content-text">
                  <div className="content-wrapper">
                    <div className="bg-content-area">
                      <div className="bg-text-content">
                        {title && <h2 className="bg-title">{title}</h2>}
                        {subtitle && <p className="bg-subtitle">{subtitle}</p>}
                        {description && (
                          <p className="bg-description mt-4" style={{ whiteSpace: 'pre-line' }}>
                            {description}
                          </p>
                        )}
                        {countdown && (
                          <div className="w-full advanced-content-countdown">
                            <salla-count-down
                              className="w-full"
                              date={countdownDate}
                              labeled
                              boxed
                              size="lg"
                              style={{ color: textColor }}
                              data-color={textColor}
                            ></salla-count-down>
                          </div>
                        )}
                      </div>
                      {btnText && <div className="bg-button-wrapper">{buttonEl}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {(title || subtitle) && (
            <div className="home-block-title container">
              <div className="mx-auto max-w-2xl text-center">
                {title && (
                  <p className="advanced-content__title mt-2 text-3xl font-bold tracking-tight text-store-text-primary sm:text-4xl">
                    {title}
                  </p>
                )}
                {subtitle && (
                  <p className="advanced-content__subtitle mt-2 text-lg leading-8 text-store-text-secondary">
                    {subtitle}
                  </p>
                )}
                <div className="my-2 mx-auto w-28 h-0 border-2 border-primary home-block-line"></div>
              </div>
            </div>
          )}
          <div className="advanced-content__body relative overflow-hidden pt-8">
            <div className="advanced-content__inner mx-auto container px-6 lg:px-8">
              <div className="advanced-content__layout flex flex-col gap-8 items-center max-w-5xl mx-auto">
                {description && (
                  <div className="advanced-content__description-wrap w-full text-center">
                    <p
                      className="advanced-content__description text-lg text-store-text-secondary"
                      style={{ whiteSpace: 'pre-line' }}
                    >
                      {description}
                    </p>
                  </div>
                )}
                {countdown && (
                  <div className="w-full advanced-content-countdown">
                    <salla-count-down className="w-full" date={countdownDate} labeled boxed size="lg"></salla-count-down>
                  </div>
                )}
                {hasMedia && (
                  <div className="w-full advanced-content-media">
                    <div className={`media-wrapper ${type === 'video' ? 'video-wrapper' : 'image-wrapper'}`}>
                      {mediaEl}
                    </div>
                  </div>
                )}
                {btnText && (
                  <div className="w-full advanced-content-text text-center">
                    <div className="content-wrapper">
                      <div className="button-wrapper flex justify-center">{buttonEl}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {btnText && !asLink && (
        <div
          className={`advanced-content-drawer drawer-overlay${drawerOpen ? ' is-open' : ''}${closing ? ' is-closing' : ''}`}
        >
          <div className="drawer-backdrop" onClick={closeDrawer}></div>
          <div className="drawer-container" role="dialog" aria-modal="true" aria-label={drawerTitle || btnText}>
            <div className="drawer-header">
              <h3 className="drawer-title">{drawerTitle}</h3>
              <button
                type="button"
                className="drawer-close drawer-close-x"
                aria-label={t('common.elements.close', 'Close')}
                onClick={closeDrawer}
              >
                <i className="sicon-cancel"></i>
              </button>
            </div>
            <div className="drawer-body">
              <div className="drawer-items">
                {drawerItems.map((item, i) => {
                  const itemTitle = pickLang(collectionField(item, 'drawer_items', 'title') as MultiLang, lang);
                  const itemDesc = pickLang(collectionField(item, 'drawer_items', 'description') as MultiLang, lang);
                  const icon = (collectionField(item, 'drawer_items', 'icon') as string) || 'sicon-check-circle';
                  if (!itemTitle && !itemDesc) return null;
                  return (
                    <div key={i} className="drawer-item">
                      <div className="item-icon">
                        <i className={icon}></i>
                      </div>
                      <div className="item-content">
                        {itemTitle && <h4 className="item-title">{itemTitle}</h4>}
                        {itemDesc && (
                          <p className="item-description" style={{ whiteSpace: 'pre-line' }}>
                            {itemDesc}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
