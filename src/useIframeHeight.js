import { useEffect } from 'react';

// When the game is embedded in an iframe (e.g. on the WordPress site), tell the
// parent page how tall the game is so the frame can resize with no scrollbars.
// The matching listener is in the README's embed snippet.
export function useIframeHeight() {
  useEffect(() => {
    if (window.parent === window) return;
    document.documentElement.classList.add('embedded');
    const send = () => {
      const height = Math.ceil(document.documentElement.getBoundingClientRect().height);
      window.parent.postMessage({ type: 'Nassaule:height', height }, '*');
    };
    const ro = new ResizeObserver(send);
    ro.observe(document.documentElement);
    send();
    return () => ro.disconnect();
  }, []);
}
