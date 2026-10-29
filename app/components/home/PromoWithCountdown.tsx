import { memo } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import {
  pickLang,
  asUrl,
  resolveOption,
  normalizeEndDate,
  type MultiLang,
} from '../../lib/homeBlockData';

/**
 * Promo with countdown (Triple) — home block.
 * Port of triple_twig `views/components/home/promo_with_countdown.twig` + promo-with-countdown.scss.
 * Two layouts: `bg` (image as the block background, content centered over a dark layer) and
 * `img` (image on one side, content on the other). The countdown is `<salla-count-down>`.
 */

export interface PromoWithCountdownData {
  bg?: string;
  img_type?: unknown;
  bg_color?: string;
  text_color?: string;
  title?: MultiLang;
  description?: MultiLang;
  exp_date?: string;
  hide_countdown?: boolean;
  btn_text?: MultiLang;
  btn_link?: unknown;
  custom_classes?: string;
  position?: number;
  [key: string]: unknown;
}

export interface PromoWithCountdownProps {
  data: PromoWithCountdownData;
}

export const PromoWithCountdown = memo(function PromoWithCountdown({
  data,
}: PromoWithCountdownProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const imgType = resolveOption(data.img_type, ['bg', 'img'] as const, 'bg');
  const title = pickLang(data.title, lang);
  const description = pickLang(data.description, lang);
  const btnText = pickLang(data.btn_text, lang);
  const btnLink = asUrl(data.btn_link);
  const expDate = normalizeEndDate(data.exp_date);
  const showTimer = Boolean(expDate && !data.hide_countdown);
  const color = imgType === 'img' ? data.text_color || '#ffffff' : '#ffffff';
  const gid = `promo-countdown-gradient-${data.position ?? 0}`;

  const timer = showTimer ? (
    <salla-count-down
      style={{ color }}
      data-color={color}
      className="promo-countdown__timer w-full"
      date={expDate}
      labeled
      boxed
      size="lg"
    ></salla-count-down>
  ) : null;

  const button =
    btnText && btnLink ? (
      <div className="mt-8">
        <a
          style={{ color }}
          href={btnLink}
          className="promo-countdown__button inline-flex bg-white/10 px-3.5 py-2.5 text-sm font-semibold shadow-sm hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {btnText}
        </a>
      </div>
    ) : null;

  const content = (
    <>
      <p
        className="promo-countdown__title mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
        style={{ color }}
      >
        {title}
      </p>
      {description && (
        <p className="promo-countdown__description mt-6 text-base leading-7" style={{ color }}>
          {description}
        </p>
      )}
      {timer}
      {button}
    </>
  );

  if (imgType === 'img') {
    return (
      <div className="relative bg-gray-900 as-img" style={{ backgroundColor: data.bg_color || '#004956' }}>
        <div className="promo-countdown__media relative h-80 overflow-hidden bg-primary md:absolute md:left-0 md:h-full md:w-1/3 lg:w-1/2">
          {data.bg && (
            <img
              className="promo-countdown__image h-full w-full object-cover"
              src={data.bg}
              loading="lazy"
              decoding="async"
              alt=""
            />
          )}
          <svg
            viewBox="0 0 926 676"
            aria-hidden="true"
            className="absolute -bottom-24 left-24 w-[57.875rem] transform-gpu blur-[118px]"
          >
            <path
              fill={`url(#${gid})`}
              fillOpacity=".4"
              d="m254.325 516.708-90.89 158.331L0 436.427l254.325 80.281 163.691-285.15c1.048 131.759 36.144 345.144 168.149 144.613C751.171 125.508 707.17-93.823 826.603 41.15c95.546 107.978 104.766 294.048 97.432 373.585L685.481 297.694l16.974 360.474-448.13-141.46Z"
            ></path>
            <defs>
              <linearGradient
                id={gid}
                x1="926.392"
                x2="-109.635"
                y1=".176"
                y2="321.024"
                gradientUnits="userSpaceOnUse"
              >
                <stop style={{ stopColor: 'var(--color-primary)' }}></stop>
                <stop offset="1" style={{ stopColor: 'var(--color-primary)' }}></stop>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="relative container py-4 lg:py-40">
          <div className="promo-countdown__content pl-6 pr-6 md:ml-auto md:w-2/3 md:pl-16 lg:w-1/2 lg:pl-24 lg:pr-0 xl:pl-32 text-center md:text-start">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gray-900 as-bg px-6 py-32 sm:px-12 sm:py-40 lg:px-16">
      <div className="promo-countdown__media absolute inset-0 overflow-hidden">
        {data.bg && (
          <img
            className="promo-countdown__image h-full w-full object-cover object-center"
            src={data.bg}
            loading="lazy"
            decoding="async"
            alt=""
          />
        )}
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-gray-900 bg-opacity-50"></div>
      <div className="promo-countdown__content relative mx-auto flex max-w-3xl flex-col items-center text-center">
        {content}
      </div>
    </div>
  );
});
