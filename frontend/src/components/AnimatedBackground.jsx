import { useEffect, useRef } from 'react';
import { cn } from '../lib/cn';

export default function AnimatedBackground({ children, className }) {
  const rootRef = useRef(null);
  const target = useRef({ x: 0.5, y: 0.5 });
  const current = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return undefined;

    const onMove = (e) => {
      target.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };

    window.addEventListener('mousemove', onMove, { passive: true });

    let raf = 0;
    const tick = () => {
      const ease = 0.07;
      current.current.x += (target.current.x - current.current.x) * ease;
      current.current.y += (target.current.y - current.current.y) * ease;

      const el = rootRef.current;
      if (el) {
        const x = current.current.x;
        const y = current.current.y;
        el.style.setProperty('--mouse-x', String(x));
        el.style.setProperty('--mouse-y', String(y));
        el.style.setProperty('--mouse-x-px', `${x * window.innerWidth}px`);
        el.style.setProperty('--mouse-y-px', `${y * window.innerHeight}px`);
        el.style.setProperty('--parallax-x', `${(x - 0.5) * -48}px`);
        el.style.setProperty('--parallax-y', `${(y - 0.5) * -48}px`);
        el.style.setProperty('--glow-x', `${x * 100}%`);
        el.style.setProperty('--glow-y', `${y * 100}%`);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn('animated-bg-root min-h-screen', className)}
      style={{
        '--mouse-x': 0.5,
        '--mouse-y': 0.5,
        backgroundColor: 'var(--color-surface-900)',
      }}
    >
      <div className="animated-bg-grid" aria-hidden="true" />
      <div className="animated-bg-glow" aria-hidden="true" />
      <div className="animated-bg-spotlight" aria-hidden="true" />
      <div className="animated-bg-nodes" aria-hidden="true" />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
