import { useEffect, useRef } from 'react';

/**
 * Jump to the top of the page whenever `key` changes.
 *
 * Every screen swap is an in-place render — no navigation — so the browser
 * keeps whatever scroll offset the previous screen left behind. On desktop the
 * landing page's "Start Step 1" button sits well below the fold, so clicking it
 * dropped people into the state list already scrolled past its heading, mid-card.
 *
 * The first run is deliberately skipped: on a fresh load or a refresh the
 * browser's own scroll restoration should win, and there is nothing to correct
 * yet. `auto` (not `smooth`) because this is a screen change, not a jump within
 * one screen — animating it would just show the person the old screen sliding.
 */
export function useScrollToTop(key: unknown) {
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [key]);
}
