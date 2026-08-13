import { useEffect } from 'react';

/** Marks installed PWA / iOS home-screen mode on the document root. */
export function useStandaloneApp() {
  useEffect(() => {
    const apply = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;

      document.documentElement.classList.toggle('pwa-standalone', standalone);
      document.documentElement.classList.toggle('pwa-browser', !standalone);
    };

    apply();

    const media = window.matchMedia('(display-mode: standalone)');
    media.addEventListener?.('change', apply);

    return () => media.removeEventListener?.('change', apply);
  }, []);
}
