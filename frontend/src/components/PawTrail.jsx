import React from 'react';
import TozoMascot from './TozoMascot';

/**
 * PawTrail — Vertical connecting dotted trail with paw-print waypoint markers.
 * Visualizes the developer's journey down the page.
 */
export default function PawTrail({ steps = 3, activeStep = 0, className = '' }) {
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {Array.from({ length: steps }).map((_, idx) => {
        const isCurrent = idx === activeStep;
        const isPassed = idx < activeStep;

        return (
          <React.Fragment key={idx}>
            {/* Paw Waypoint Marker */}
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                isCurrent
                  ? 'bg-amber-collar/20 border-2 border-amber-collar shadow-md shadow-amber-collar/20 scale-110'
                  : isPassed
                  ? 'bg-moss-trail/15 border border-moss-trail/40'
                  : 'bg-dusk-surface border border-cream-muted/20 opacity-40'
              }`}
            >
              <TozoMascot
                pose="paw"
                size={16}
                className={isCurrent ? 'text-amber-collar' : isPassed ? 'text-moss-trail' : 'text-cream-muted'}
              />
            </div>

            {/* Dotted Trail Line Segment (between waypoints) */}
            {idx < steps - 1 && (
              <div className="w-0.5 h-16 sm:h-20 my-1 border-l-2 border-dashed border-amber-collar/30" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
