import React from 'react';
import CountUp from './CountUp';

export default function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = 'brand', 
  active = false, 
  onClick 
}) {
  const colorStyles = {
    brand: {
      border: 'border-amber-collar/30 hover:border-amber-collar/60',
      bg: 'bg-amber-collar/15 text-amber-collar',
      activeRing: 'ring-2 ring-amber-collar/60 bg-dusk-surface',
    },
    rose: {
      border: 'border-rose-500/30 hover:border-rose-500/60',
      bg: 'bg-rose-500/15 text-rose-300',
      activeRing: 'ring-2 ring-rose-500/60 bg-dusk-surface',
    },
    amber: {
      border: 'border-amber-collar/30 hover:border-amber-collar/60',
      bg: 'bg-amber-collar/15 text-amber-collar',
      activeRing: 'ring-2 ring-amber-collar/60 bg-dusk-surface',
    },
    emerald: {
      border: 'border-moss-trail/30 hover:border-moss-trail/60',
      bg: 'bg-moss-trail/15 text-emerald-300',
      activeRing: 'ring-2 ring-moss-trail/60 bg-dusk-surface',
    },
    indigo: {
      border: 'border-indigo-500/30 hover:border-indigo-500/60',
      bg: 'bg-indigo-500/15 text-indigo-300',
      activeRing: 'ring-2 ring-indigo-500/60 bg-dusk-surface',
    },
  };

  const current = colorStyles[color] || colorStyles.brand;
  const numValue = typeof value === 'number' ? value : parseInt(value, 10) || 0;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onClick) onClick();
        }
      }}
      className={`p-5 rounded-2xl transition-all duration-200 cursor-pointer border bg-dusk-surface/90 shadow-md ${current.border} ${
        active ? current.activeRing : 'hover:-translate-y-0.5 hover:border-amber-collar/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`p-2 rounded-xl ${current.bg} border border-white/5`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline space-x-2">
        <span className="text-3xl sm:text-4xl font-extrabold text-cream-text font-display tracking-tight">
          <CountUp to={numValue} />
        </span>
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}
