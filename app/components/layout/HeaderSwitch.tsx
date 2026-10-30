import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { Header } from './Header';
import { KhadamatyHeader } from './KhadamatyHeader';

interface HeaderSwitchProps {
  navOpen?: boolean;
  onNavOpenChange?: (open: boolean) => void;
}

/**
 * Picks the header the same way the Twig theme's `components/header/header.twig`
 * does: the classic {@link KhadamatyHeader} when `use_khadamaty_header` is on,
 * otherwise the default Triple {@link Header}. Read SSR-safe from the theme
 * settings so the server and first client render agree.
 */
export function HeaderSwitch(props: HeaderSwitchProps) {
  const { theme } = useTwilight();
  const useKhadamaty = !!(theme?.settings as Record<string, unknown> | undefined)
    ?.use_khadamaty_header;
  return useKhadamaty ? <KhadamatyHeader {...props} /> : <Header {...props} />;
}
