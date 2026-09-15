import React, { useState, useEffect, useRef } from 'react';
import { getTozoBark } from '../data/tozoBarks';

/**
 * TozoMascot — Interactive, reactive companion dog mascot.
 * Supports:
 * - Poses: 'ready', 'walking', 'fetching', 'proud', 'confused', 'paw'
 * - Moods: 'neutral', 'focused', 'excited', 'curious', 'proud'
 * - 2D Sprite Motion: pose="sprite-walk", "sprite-wag", "sprite-sniff" (or useSprite={true})
 * - Interactivity: Ear perk on hover, tail wag on click, context-aware speech bubble
 */
export default function TozoMascot({ 
  pose = 'ready', 
  mood = 'neutral',
  speechText = null,
  context = {},
  useSprite = false,
  className = '', 
  size = 80,
  interactive = true,
  onClick = null
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [bubbleText, setBubbleText] = useState(speechText);
  const [showBubble, setShowBubble] = useState(Boolean(speechText));
  const bubbleTimerRef = useRef(null);

  // Sync speechText prop changes
  useEffect(() => {
    if (speechText) {
      setBubbleText(speechText);
      setShowBubble(true);
    }
  }, [speechText]);

  const handleClick = (e) => {
    if (!interactive) return;
    
    // Trigger tail wag animation
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 850);

    // Context-aware bark
    const bark = getTozoBark(pose === 'walking' ? 'scanning' : 'playfulClick', context);
    setBubbleText(bark);
    setShowBubble(true);

    // Auto-dismiss after 3.2s
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => {
      setShowBubble(false);
    }, 3200);

    if (onClick) onClick(e);
  };

  // 2D Sprite Animation Mode
  if (useSprite || pose.startsWith('sprite')) {
    const spriteAnimClass = pose === 'sprite-wag' 
      ? 'tozo-2d-sprite-wag' 
      : pose === 'sprite-sniff' 
      ? 'tozo-2d-sprite-sniff' 
      : 'tozo-2d-sprite-walk';

    return (
      <div 
        className={`relative inline-block select-none cursor-pointer ${className}`}
        onClick={handleClick}
        title="Tozo the Code Companion"
      >
        {/* Speech Bubble */}
        {showBubble && bubbleText && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap">
            <div className="tozo-speech-bubble px-3 py-1.5 rounded-xl bg-dusk-surface border border-amber-collar/50 text-cream-text text-xs font-medium shadow-xl relative">
              <span>{bubbleText}</span>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-dusk-surface border-r border-b border-amber-collar/50 rotate-45" />
            </div>
          </div>
        )}

        <div 
          style={{ width: size, height: size }}
          className={`rounded-2xl border border-slate-700/50 shadow-md ${spriteAnimClass} ${isClicked ? 'tozo-clicked-wag' : ''}`}
        />
      </div>
    );
  }

  // Paw Print Icon
  if (pose === 'paw') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <ellipse cx="12" cy="16.5" rx="4.5" ry="3.8" fill="#E8A33D" />
        <ellipse cx="6.5" cy="10.5" rx="2.2" ry="2.8" transform="rotate(-15 6.5 10.5)" fill="#E8A33D" />
        <ellipse cx="17.5" cy="10.5" rx="2.2" ry="2.8" transform="rotate(15 17.5 10.5)" fill="#E8A33D" />
        <ellipse cx="10" cy="7.2" rx="2.2" ry="3" fill="#E8A33D" />
        <ellipse cx="14" cy="7.2" rx="2.2" ry="3" fill="#E8A33D" />
      </svg>
    );
  }

  // Expression variations based on mood
  const eyeRadius = mood === 'excited' ? 3.2 : mood === 'focused' ? 2.3 : 2.8;
  const mouthPath = mood === 'excited' 
    ? 'M33 39C35 43 41 43 43 39' 
    : mood === 'focused'
    ? 'M33 38H41'
    : 'M34 38C36 40 40 40 42 38';

  return (
    <div 
      className={`relative inline-block select-none tozo-interactive ${interactive ? 'cursor-pointer' : ''} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      role={interactive ? "button" : "img"}
      tabIndex={interactive ? 0 : -1}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick(e);
        }
      }}
      aria-label="Tozo Mascot"
    >
      {/* Interactive Speech Bubble */}
      {showBubble && bubbleText && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap">
          <div className="tozo-speech-bubble px-3 py-1.5 rounded-xl bg-dusk-surface border border-amber-collar/50 text-cream-text text-xs font-medium shadow-2xl relative">
            <span>{bubbleText}</span>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-dusk-surface border-r border-b border-amber-collar/50 rotate-45" />
          </div>
        </div>
      )}

      {/* Ready Pose: Sitting attentively */}
      {pose === 'ready' && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Tail */}
          <path 
            d="M72 75C80 72 88 62 86 52" 
            stroke="#E0D7C9" 
            strokeWidth="6" 
            strokeLinecap="round" 
            className={isClicked ? 'tozo-clicked-wag' : isHovered ? 'tozo-proud-tail' : ''}
          />
          {/* Hindquarters */}
          <ellipse cx="62" cy="74" rx="16" ry="14" fill="#C9BEAC" />
          <ellipse cx="62" cy="74" rx="14" ry="12" fill="#E0D7C9" />
          <ellipse cx="68" cy="85" rx="9" ry="4" fill="#F2EDE4" />
          {/* Body */}
          <path d="M42 46C42 46 36 68 38 84H56C58 70 56 50 56 46H42Z" fill="#E0D7C9" />
          {/* Chest & Front Leg */}
          <path d="M38 48C34 56 34 76 35 85H45C45 74 46 56 46 48H38Z" fill="#F2EDE4" />
          <ellipse cx="40" cy="85" rx="7" ry="3.5" fill="#F2EDE4" />
          {/* Amber Collar */}
          <rect x="36" y="44" width="22" height="5" rx="2.5" fill="#E8A33D" />
          <circle cx="47" cy="51" r="3" fill="#E8A33D" stroke="#1B2430" strokeWidth="1" />
          {/* Head */}
          <path d="M32 30C32 20 44 18 52 20C60 22 64 30 64 38C64 46 54 48 44 48C34 48 32 38 32 30Z" fill="#E0D7C9" />
          {/* Muzzle */}
          <path d="M30 34C24 35 24 43 32 44C38 45 44 44 44 38C44 33 36 33 30 34Z" fill="#F2EDE4" />
          {/* Nose */}
          <ellipse cx="25" cy="38" rx="2.8" ry="2.2" fill="#1B2430" />
          {/* Eye */}
          <circle cx="42" cy="28" r={eyeRadius} fill="#1B2430" />
          <circle cx="41.2" cy="27.2" r="0.9" fill="#F2EDE4" />
          {/* Reactive Ears: perk up on hover */}
          <g className={`tozo-ear ${isHovered ? 'tozo-ear-perk' : ''}`}>
            <path d="M48 20L56 6C58 5 62 10 60 18L55 24" fill="#C9BEAC" />
            <path d="M42 20L44 8C45 6 48 8 47 16L45 22" fill="#E0D7C9" />
          </g>
          {/* Mood Eyebrow */}
          <path 
            d={mood === 'focused' ? "M39 26L45 24" : "M39 24C41 23 44 24 45 25"} 
            stroke="#1B2430" 
            strokeWidth="1.2" 
            strokeLinecap="round" 
          />
          {/* Whiskers / Mouth */}
          <path d={mouthPath} stroke="#1B2430" strokeWidth="1" strokeLinecap="round" fill="none" />
        </svg>
      )}

      {/* Walking Pose: Mid-stride */}
      {pose === 'walking' && (
        <div className="tozo-walking">
          <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M74 48C84 42 90 32 86 24" 
              stroke="#E0D7C9" 
              strokeWidth="5.5" 
              strokeLinecap="round"
              className={isClicked ? 'tozo-clicked-wag' : ''}
            />
            <path d="M66 52L76 74H68L60 58" fill="#C9BEAC" />
            <path d="M32 50C32 44 68 42 72 54C74 66 64 68 44 68C34 68 30 60 32 50Z" fill="#E0D7C9" />
            <path d="M30 52C28 62 36 68 44 68C38 64 36 58 36 52H30Z" fill="#F2EDE4" />
            <path d="M58 54L54 78H48L52 56" fill="#E0D7C9" />
            <path d="M40 56L36 76H30L34 54" fill="#C9BEAC" />
            <path d="M32 56L22 68H28L36 58" fill="#F2EDE4" />
            <rect x="28" y="47" width="6" height="15" rx="3" transform="rotate(25 28 47)" fill="#E8A33D" />
            <circle cx="28" cy="62" r="2.5" fill="#E8A33D" stroke="#1B2430" strokeWidth="0.8" />
            <path d="M12 55C12 48 24 44 32 48C34 54 30 62 22 64C16 64 12 60 12 55Z" fill="#E0D7C9" />
            <path d="M8 60C6 62 8 68 14 67C18 66 22 63 20 58C16 58 10 58 8 60Z" fill="#F2EDE4" />
            <ellipse cx="7" cy="63" rx="2.5" ry="2" fill="#1B2430" />
            <circle cx="22" cy="52" r={eyeRadius} fill="#1B2430" />
            <g className={`tozo-ear ${isHovered ? 'tozo-ear-perk' : ''}`}>
              <path d="M28 46C34 42 40 44 38 52L30 50" fill="#C9BEAC" />
            </g>
          </svg>
        </div>
      )}

      {/* Fetching Pose: Leaping with stick */}
      {pose === 'fetching' && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M75 42C86 38 94 30 92 20" 
            stroke="#E0D7C9" 
            strokeWidth="6" 
            strokeLinecap="round" 
            className={isClicked ? 'tozo-clicked-wag' : 'tozo-proud-tail'}
          />
          <path d="M68 48L80 66H72L62 52" fill="#C9BEAC" />
          <path d="M58 50L68 74H60L52 54" fill="#E0D7C9" />
          <ellipse cx="48" cy="48" rx="22" ry="12" transform="rotate(-8 48 48)" fill="#E0D7C9" />
          <path d="M38 50L26 68H32L42 54" fill="#F2EDE4" />
          <path d="M44 50L36 72H42L48 54" fill="#C9BEAC" />
          <rect x="30" y="36" width="6" height="15" rx="3" transform="rotate(30 30 36)" fill="#E8A33D" />
          <circle cx="31" cy="50" r="2.8" fill="#E8A33D" stroke="#1B2430" strokeWidth="0.8" />
          <circle cx="26" cy="32" r="14" fill="#E0D7C9" />
          <ellipse cx="17" cy="35" rx="9" ry="7" fill="#F2EDE4" />
          <ellipse cx="10" cy="35" rx="2.5" ry="2" fill="#1B2430" />
          <circle cx="25" cy="27" r="2.5" fill="#1B2430" />
          <g className={`tozo-ear ${isHovered ? 'tozo-ear-perk' : ''}`}>
            <path d="M34 22C42 20 44 28 38 34L32 26" fill="#C9BEAC" />
          </g>
          <rect x="4" y="32" width="28" height="4.5" rx="2" transform="rotate(-12 4 32)" fill="#8D5B2F" stroke="#5C3A1E" strokeWidth="0.8" />
          <circle cx="22" cy="30" r="1.5" fill="#5C3A1E" />
        </svg>
      )}

      {/* Proud Pose: Sitting tall with happy tail wag */}
      {pose === 'proud' && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M68 68C78 62 88 48 84 38"
            stroke="#E0D7C9"
            strokeWidth="6"
            strokeLinecap="round"
            className={isClicked ? 'tozo-clicked-wag' : 'tozo-proud-tail'}
          />
          <ellipse cx="58" cy="74" rx="16" ry="13" fill="#C9BEAC" />
          <ellipse cx="58" cy="74" rx="14" ry="11" fill="#E0D7C9" />
          <ellipse cx="64" cy="85" rx="8" ry="3.5" fill="#F2EDE4" />
          <path d="M40 40C34 50 34 72 36 84H54C54 68 54 44 54 40H40Z" fill="#E0D7C9" />
          <path d="M36 42C30 52 30 76 34 85H44C44 70 44 48 44 42H36Z" fill="#F2EDE4" />
          <ellipse cx="38" cy="85" rx="7" ry="3.5" fill="#F2EDE4" />
          <rect x="34" y="38" width="22" height="5.5" rx="2.5" fill="#E8A33D" />
          <circle cx="45" cy="46" r="3.2" fill="#E8A33D" stroke="#1B2430" strokeWidth="1" />
          <circle cx="46" cy="24" r="13" fill="#E0D7C9" />
          <ellipse cx="38" cy="25" rx="8" ry="6" fill="#F2EDE4" />
          <ellipse cx="32" cy="25" rx="2.5" ry="2" fill="#1B2430" />
          <circle cx="43" cy="19" r="2.4" fill="#1B2430" />
          <path d="M34 28C36 30 40 30 42 28" stroke="#1B2430" strokeWidth="1.2" strokeLinecap="round" />
          <g className={`tozo-ear ${isHovered ? 'tozo-ear-perk' : ''}`}>
            <path d="M48 13L56 2C58 4 62 10 58 18L54 20" fill="#C9BEAC" />
            <path d="M40 14L44 4C46 5 48 9 46 16L44 18" fill="#E0D7C9" />
          </g>
        </svg>
      )}

      {/* Confused Pose: Curious tilt */}
      {pose === 'confused' && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse cx="56" cy="74" rx="15" ry="13" fill="#C9BEAC" />
          <ellipse cx="56" cy="74" rx="13" ry="11" fill="#E0D7C9" />
          <ellipse cx="62" cy="85" rx="8" ry="3.5" fill="#F2EDE4" />
          <path d="M38 48C34 58 34 76 36 85H52C52 70 52 50 52 48H38Z" fill="#E0D7C9" />
          <path d="M34 50C30 60 30 78 34 85H42C42 72 42 54 42 50H34Z" fill="#F2EDE4" />
          <ellipse cx="36" cy="85" rx="7" ry="3.5" fill="#F2EDE4" />
          <rect x="33" y="46" width="20" height="5" rx="2.5" transform="rotate(-6 33 46)" fill="#E8A33D" />
          <circle cx="43" cy="53" r="2.8" fill="#E8A33D" stroke="#1B2430" strokeWidth="0.8" />
          <g transform="rotate(-18 42 32)">
            <circle cx="42" cy="32" r="14" fill="#E0D7C9" />
            <ellipse cx="34" cy="34" rx="8" ry="6" fill="#F2EDE4" />
            <ellipse cx="28" cy="34" rx="2.5" ry="2" fill="#1B2430" />
            <circle cx="40" cy="26" r="3" fill="#1B2430" />
            <circle cx="39" cy="25" r="1" fill="#F2EDE4" />
            <g className={`tozo-ear ${isHovered ? 'tozo-ear-perk' : ''}`}>
              <path d="M48 20L58 7C60 9 62 16 58 24L52 26" fill="#C9BEAC" />
              <path d="M34 22L28 28C26 32 26 36 30 38L34 30" fill="#C9BEAC" />
            </g>
            <ellipse cx="36" cy="37" rx="1.5" ry="1" fill="#1B2430" />
          </g>
          <text x="64" y="24" fill="#E8A33D" fontSize="16" fontWeight="bold" fontFamily="monospace">?</text>
        </svg>
      )}
    </div>
  );
}
