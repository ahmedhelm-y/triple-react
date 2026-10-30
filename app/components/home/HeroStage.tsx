import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { asUrl, collectionField, pickLang, resolveOption, type MultiLang } from '../../lib/homeBlockData';

/**
 * Hero stage (home component: home.hero-stage) — `.tr-stage`.
 * Port of triple_twig `views/components/home/hero-stage.twig` + `js/partials/hero-stage.js`
 * (the `<triple-stage>` custom element) + `04-components/hero-stage.scss`.
 *
 * Scenes (picture or mp4 clip) stack and cross-fade. With more than one scene a numbered
 * chapters bar at the bottom is both the nav and the timer: the active chapter's `--fill`
 * grows 0→1 over `scene_seconds`, then the next scene comes. The timer pauses while the
 * stage is hovered, keyboard-focused, off screen or the tab is hidden, and does not run at
 * all under prefers-reduced-motion. A clip gets its `src` only when its scene is shown.
 * The section wrapper classes (`tr-stage tr-stage--{size} …`) are set in router.tsx.
 */

type MediaKind = 'picture' | 'clip';
type TextSpot = 'start' | 'center' | 'end' | 'bottom';

interface SceneRaw {
  'scenes.media_kind'?: unknown;
  media_kind?: unknown;
  [key: string]: unknown;
}

interface Scene {
  clip: string;
  picture: string;
  phone: string;
  chapter: string;
  headline: string;
  lead: string;
  cta: string;
  target: string;
  spot: TextSpot;
}

export interface HeroStageProps {
  data: {
    scenes?: SceneRaw[];
    stage_size?: unknown;
    scene_seconds?: number;
    shade_level?: unknown;
    chapters_bar?: boolean;
    ink_color?: string;
    position?: number;
    [key: string]: unknown;
  };
}

/** Wrapper `<section>` classes for `home.hero-stage` (matches the Twig section). */
export const heroStageConfig = {
  className: (data: HeroStageProps['data']) => {
    const size = resolveOption(data.stage_size, ['full', 'tall', 'compact', 'natural'] as const, 'full');
    const shade = resolveOption(data.shade_level, ['none', 'soft', 'strong'] as const, 'soft');
    return [
      's-block',
      'tr-stage',
      `tr-stage--${size}`,
      `tr-stage--shade-${shade}`,
      's-block--hero-stage',
      `hero-stage-${data.position ?? 0}`,
      data.custom_classes as string | undefined,
    ]
      .filter(Boolean)
      .join(' ');
  },
};

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

export const HeroStage = memo(function HeroStage({ data }: HeroStageProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const scenes = useMemo<Scene[]>(() => {
    const raw = (data.scenes as SceneRaw[]) || [];
    const field = (item: SceneRaw, key: string) => collectionField(item, 'scenes', key);
    const text = (item: SceneRaw, key: string) => pickLang(field(item, key) as MultiLang, lang);
    const str = (item: SceneRaw, key: string) => {
      const v = field(item, key);
      return typeof v === 'string' ? v : '';
    };
    const out: Scene[] = [];
    for (const item of raw) {
      const kind = resolveOption<MediaKind>(field(item, 'media_kind'), ['picture', 'clip'], 'picture');
      const english = str(item, 'picture_english');
      const picture = lang === 'en' && english ? english : str(item, 'picture');
      const clip = kind === 'clip' ? str(item, 'clip') : '';
      if (!(clip || picture)) continue;
      out.push({
        clip,
        picture,
        phone: lang === 'en' && english ? '' : str(item, 'picture_phone'),
        chapter: text(item, 'chapter'),
        headline: text(item, 'headline'),
        lead: text(item, 'lead'),
        cta: text(item, 'cta'),
        target: asUrl(field(item, 'target')),
        spot: resolveOption<TextSpot>(field(item, 'text_spot'), ['start', 'center', 'end', 'bottom'], 'start'),
      });
    }
    return out;
  }, [data.scenes, lang]);

  const many = scenes.length > 1;
  const seconds = Math.min(15, Math.max(3, Number(data.scene_seconds) || 6));
  const bareChapters = data.chapters_bar === false;
  const ink = data.ink_color || '#ffffff';
  const motionAllowed = useMotionAllowed();

  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  indexRef.current = index;
  const chapterRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const holdsRef = useRef<Set<string>>(new Set());
  const elapsedRef = useRef(0);

  const show = useCallback(
    (next: number) => {
      const count = scenes.length;
      if (count < 2) return;
      const n = ((next % count) + count) % count;
      elapsedRef.current = 0;
      setIndex((prev) => {
        if (prev === n) return prev;
        chapterRefs.current[prev]?.style.setProperty('--fill', '0');
        return n;
      });
    },
    [scenes.length]
  );

  // Play the shown scene's clip (lazy src), pause the others; reset chapter fills.
  useEffect(() => {
    sceneRefs.current.forEach((el, i) => {
      const video = el?.querySelector('video');
      if (video) {
        if (i === index) {
          if (!video.getAttribute('src') && video.dataset.clip) video.src = video.dataset.clip;
          video.play?.().catch(() => undefined);
        } else {
          video.pause?.();
        }
      }
      if (i !== index) chapterRefs.current[i]?.style.setProperty('--fill', i < index ? '1' : '0');
    });
  }, [index]);

  // The timer: advance when the active chapter's fill reaches 1, unless held.
  useEffect(() => {
    if (!many || !motionAllowed) return;
    const duration = seconds * 1000;
    const holds = holdsRef.current;
    const hold = (name: string, on: boolean) => (on ? holds.add(name) : holds.delete(name));
    const onVisibility = () => hold('tab', document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    let observer: IntersectionObserver | undefined;
    const frame = sceneRefs.current[0]?.parentElement;
    if (frame && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(([entry]) => hold('away', !entry.isIntersecting));
      observer.observe(frame);
    }
    let last = performance.now();
    let raf = 0;
    const step = (now: number) => {
      if (!holds.size) {
        elapsedRef.current += now - last;
        if (elapsedRef.current >= duration) show(indexRef.current + 1);
      }
      last = now;
      chapterRefs.current[indexRef.current]?.style.setProperty(
        '--fill',
        String(Math.min(1, elapsedRef.current / duration))
      );
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
      holds.clear();
    };
  }, [many, motionAllowed, seconds, show]);

  // Swipe (touch) changes the scene, following the page direction.
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
    touchX.current = null;
    if (Math.abs(delta) < 50) return;
    const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
    show(indexRef.current + ((delta < 0) !== rtl ? 1 : -1));
  };

  const holdSet = (name: string, on: boolean) => {
    if (on) holdsRef.current.add(name);
    else holdsRef.current.delete(name);
  };

  if (!scenes.length) return null;

  return (
    <div
      className="tr-stage__frame"
      style={{ color: ink }}
      data-seconds={seconds}
      aria-roledescription="carousel"
      onMouseEnter={() => holdSet('hover', true)}
      onMouseLeave={() => holdSet('hover', false)}
      onFocus={(e) => holdSet('focus', (e.target as HTMLElement).matches(':focus-visible'))}
      onBlur={() => holdSet('focus', false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {scenes.map((scene, i) => {
        const on = i === index;
        const count = pad(i + 1);
        return (
          <div
            key={i}
            ref={(el) => {
              sceneRefs.current[i] = el;
            }}
            className={`tr-stage__scene${on ? ' is-on' : ''}`}
            data-scene={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${count} / ${scenes.length}`}
            aria-hidden={on ? undefined : true}
          >
            {scene.clip ? (
              <video
                className="tr-stage__media"
                data-clip={scene.clip}
                muted
                playsInline
                loop
                preload="none"
                poster={scene.picture || undefined}
              />
            ) : (
              <picture>
                {scene.phone && <source media="(max-width: 767px)" srcSet={scene.phone} />}
                <img
                  className="tr-stage__media"
                  src={scene.picture}
                  alt={scene.headline || ''}
                  fetchPriority={i === 0 ? 'high' : undefined}
                  loading={i === 0 ? undefined : 'lazy'}
                  decoding="async"
                />
              </picture>
            )}

            {scene.headline || scene.lead || scene.cta ? (
              <div className={`tr-stage__copy tr-stage__copy--${scene.spot}`}>
                <div className="container">
                  <div className="tr-stage__words">
                    {many && (
                      <span className="tr-stage__count" aria-hidden="true">
                        {count}
                      </span>
                    )}
                    {scene.headline && <h2 className="tr-stage__headline">{scene.headline}</h2>}
                    {scene.lead && <p className="tr-stage__lead">{scene.lead}</p>}
                    {scene.cta && scene.target && (
                      <Link className="tr-stage__cta" to={scene.target} {...(on ? {} : { tabIndex: -1 })}>
                        <span>{scene.cta}</span>
                        <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              scene.target && (
                <Link
                  className="tr-stage__cover"
                  to={scene.target}
                  aria-label=""
                  {...(on ? {} : { tabIndex: -1 })}
                />
              )
            )}
          </div>
        );
      })}

      {many && (
        <div className={`tr-stage__chapters${bareChapters ? ' is-bare' : ''}`}>
          <div className="container">
            <div className="tr-stage__track">
              {scenes.map((scene, i) => (
                <button
                  key={i}
                  type="button"
                  ref={(el) => {
                    chapterRefs.current[i] = el;
                  }}
                  className={`tr-stage__chapter${i === index ? ' is-on' : ''}${i < index ? ' is-past' : ''}`}
                  data-go={i}
                  aria-label={`${t('blocks.home.stage_go')} ${i + 1}`}
                  aria-current={i === index ? 'true' : undefined}
                  onClick={() => show(i)}
                >
                  <span className="tr-stage__fill" aria-hidden="true" />
                  <span className="tr-stage__chapter-name">
                    <b>{pad(i + 1)}</b>
                    {scene.chapter ? ` ${scene.chapter}` : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
