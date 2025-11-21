import { useEffect, useState } from 'react';

// Centralized hook to keep JS logic aligned with CSS @media (max-width: 768px)
export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return;

    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);

    // Initial sync
    update();

    // Newer browsers
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }

    // Fallback
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  return isMobile;
}