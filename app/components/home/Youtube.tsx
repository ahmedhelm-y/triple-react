import { memo, useEffect } from 'react';
import type { HomeComponentConfig } from '@salla.sa/twilight-theme-engine/routes/home';

/**
 * `youtube` home block — a single lazy YouTube embed via `<lite-youtube>`.
 * Port of `triple_twig/src/views/components/home/youtube.twig`. The custom
 * element is registered by importing `lite-youtube-embed` on the client (the
 * Twig theme imports it in `home.js`); its facade CSS is bundled in `app.scss`.
 */

export interface YoutubeData {
  youtube_id?: string;
  position?: number;
  [key: string]: unknown;
}

export const youtubeConfig: HomeComponentConfig = {
  className: 's-block s-block--video mt-16',
};

export const Youtube = memo(function Youtube({ data }: { data: YoutubeData }) {
  useEffect(() => {
    // Registers the <lite-youtube> custom element (client only).
    import('lite-youtube-embed').catch(() => {});
  }, []);

  const id = data.youtube_id ? String(data.youtube_id) : '';
  if (!id) return null;

  return (
    <div className="container">
      <div className="videoWrapper">
        <lite-youtube videoid={id} params="rel=0" />
      </div>
    </div>
  );
});
