import React, { useEffect, useRef, useState } from 'react';

/**
 * useCountUp — Animates a numeric string value from 0 to the target.
 * Non-numeric strings are returned as-is after a brief fade delay.
 */
function useCountUp(value, duration = 900) {
  const [displayed, setDisplayed] = useState('0');
  const rafRef = useRef(null);

  useEffect(() => {
    // Parse numeric component from formatted strings like "1,234" or "12.5%"
    const rawStr = String(value).replace(/,/g, '');
    const parsed = parseFloat(rawStr);

    if (isNaN(parsed)) {
      // Non-numeric — just display as-is
      setDisplayed(value);
      return;
    }

    const isInteger = Number.isInteger(parsed) && !String(value).includes('.');
    const suffix = String(value).replace(rawStr, '').trim(); // preserve suffixes

    let startTime = null;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = parsed * eased;

      if (isInteger) {
        setDisplayed(Math.round(current).toLocaleString() + suffix);
      } else {
        setDisplayed(current.toFixed(2) + suffix);
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayed(value); // ensure final value is exact
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return displayed;
}

export default function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = '#0D9488', 
  bgLight = '#F0FDFA',
  animationDelay = 0
}) {
  const animatedValue = useCountUp(value);

  return (
    <div 
      className="kpi-card kpi-card-animated"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div>
        <div className="kpi-header">
          <span className="kpi-title">{title}</span>
          <div className="kpi-icon" style={{ backgroundColor: bgLight, color: color }}>
            {Icon && <Icon size={20} />}
          </div>
        </div>
        <div className="kpi-value" style={{ color: color !== '#0D9488' ? color : 'var(--text-main)' }}>
          {animatedValue}
        </div>
      </div>
      {subtitle && <div className="kpi-footer">{subtitle}</div>}
    </div>
  );
}
