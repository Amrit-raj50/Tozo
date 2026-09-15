import React, { useState, useEffect } from 'react';

/**
 * CountUp Component
 * Animates a number counting up from 0 to its target over durationMs using ease-out.
 * Automatically respects prefers-reduced-motion (renders instantly without animation).
 */
export default function CountUp({ 
  to = 0, 
  durationMs = 800, 
  prefix = '', 
  suffix = '', 
  className = '' 
}) {
  const [current, setCurrent] = useState(() => {
    // If reduced motion is preferred, initialize directly to target
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return to;
    }
    return 0;
  });

  useEffect(() => {
    // Check reduced motion preference
    const prefersReducedMotion = typeof window !== 'undefined' && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || durationMs <= 0 || to === 0) {
      setCurrent(to);
      return;
    }

    const startVal = 0;
    const endVal = Number(to);
    const startTime = performance.now();

    let frameId;
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      
      // Ease-out cubic: 1 - Math.pow(1 - progress, 3)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(startVal + (endVal - startVal) * easeOut);

      setCurrent(val);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setCurrent(endVal);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [to, durationMs]);

  return (
    <span className={className}>
      {prefix}{current.toLocaleString()}{suffix}
    </span>
  );
}
