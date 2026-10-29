import { memo } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import {
  pickLang,
  collectionField,
  resolveOption,
  asUrl,
  type MultiLang,
} from '../../lib/homeBlockData';

/**
 * Text with Inline Images (Triple) — home block.
 * Port of triple_twig `views/components/home/inline-images-text.twig` (static, no JS) +
 * inline-images-text.scss. One big sentence with small rounded photos sitting between its words.
 * `--inline-text` / `--inline-bg` are set inline on the component's `.tr-inline` element.
 */

interface PartRaw {
  [key: string]: unknown;
}

export interface InlineImagesTextData {
  parts?: PartRaw[];
  size?: unknown;
  align?: unknown;
  image_shape?: unknown;
  text_color?: string;
  bg_color?: string;
  btn_text?: MultiLang;
  btn_link?: unknown;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface InlineImagesTextProps {
  data: InlineImagesTextData;
}

interface Part {
  text: string;
  image: string;
}

export const InlineImagesText = memo(function InlineImagesText({
  data,
}: InlineImagesTextProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const parts: Part[] = (Array.isArray(data.parts) ? data.parts : [])
    .map((p) => ({
      text: pickLang(collectionField(p, 'parts', 'text') as MultiLang, lang),
      image: (collectionField(p, 'parts', 'image') as string) || '',
    }))
    .filter((p) => p.text || p.image);

  if (!parts.length) return null;

  const size = resolveOption(data.size, ['large', 'xlarge'] as const, 'xlarge');
  const align = resolveOption(data.align, ['start', 'center'] as const, 'center');
  const shape = resolveOption(data.image_shape, ['circle', 'pill'] as const, 'pill');
  const btnText = pickLang(data.btn_text, lang);
  const btnLink = asUrl(data.btn_link);

  const inlineClass = [
    'tr-inline',
    `tr-inline--${size}`,
    `tr-inline--${align}`,
    `tr-inline--${shape}`,
    data.bg_color ? 'tr-inline--boxed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const style: CSSProperties = {};
  if (data.text_color) (style as Record<string, string>)['--inline-text'] = data.text_color;
  if (data.bg_color) (style as Record<string, string>)['--inline-bg'] = data.bg_color;

  return (
    <div className="container">
      <div className={inlineClass} style={style}>
        <h2 className="tr-inline__text">
          {parts.map((part, i) => (
            <span key={i}>
              {part.text && <span className="tr-inline__words">{part.text}</span>}
              {part.image && (
                <span
                  className={`tr-inline__photo ${i % 2 === 0 ? 'is-tilt-a' : 'is-tilt-b'} anime-item`}
                  aria-hidden="true"
                >
                  <img
                    className="tr-inline__img"
                    src={part.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </span>
              )}
            </span>
          ))}
        </h2>
        {btnText && btnLink && (
          <a className="tr-btn tr-inline__btn" href={btnLink}>
            <span>{btnText}</span>
            <i className="sicon-arrow-left ltr:rotate-180" aria-hidden="true"></i>
          </a>
        )}
      </div>
    </div>
  );
});
