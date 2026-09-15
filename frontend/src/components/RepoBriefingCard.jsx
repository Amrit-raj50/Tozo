import React, { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  Compass, 
  CheckCircle2, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Info,
  GitCommit,
  GitPullRequest,
  Tag
} from 'lucide-react';
import TozoMascot from './TozoMascot';
import CountUp from './CountUp';

export default function RepoBriefingCard({ briefing, repoName, contributionFriendliness }) {
  const [showFacts, setShowFacts] = useState(true);
  const [showAI, setShowAI] = useState(true);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);

  if (!briefing) return null;

  const score = contributionFriendliness?.score ?? 75;
  const scoreExplanation = contributionFriendliness?.explanation ?? 'Active codebase with standard contributor workflows.';

  const getScoreRating = (s) => {
    if (s >= 80) return { label: 'Very Welcoming', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };
    if (s >= 60) return { label: 'Active Trail', color: 'text-amber-collar bg-amber-500/15 border-amber-collar/30' };
    return { label: 'Steep Climb', color: 'text-clay-rust bg-rose-500/15 border-rose-500/30' };
  };

  const rating = getScoreRating(score);

  return (
    <div className="rounded-3xl p-6 sm:p-8 border border-slate-700/60 shadow-2xl relative overflow-hidden bg-dusk-surface/90 backdrop-blur-md">
      {/* Decorative accent top bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-collar via-moss-trail to-clay-rust" />

      <div className="relative z-10 space-y-6">
        {/* Header with Title and Interactive Collar-Tag Contribution Gauge */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center space-x-3.5">
            <div className="p-2 rounded-2xl bg-amber-collar/15 border border-amber-collar/30 shrink-0">
              <TozoMascot pose="proud" size={44} speechText="I sniffed out the architectural trails!" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-bold text-cream-text font-display">Tozo's Field Guide</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-moss-trail/20 text-moss-trail border border-moss-trail/40">
                  Verified &amp; AI Intelligence
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Executive codebase anatomy, verified facts, and strategic starting points
              </p>
            </div>
          </div>

          {/* Interactive Collar-Tag Gauge */}
          <div 
            onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
            className="cursor-pointer group flex flex-col items-start bg-dusk-base/90 p-3.5 rounded-2xl border border-amber-collar/40 hover:border-amber-collar shadow-md transition-all relative"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowScoreBreakdown(!showScoreBreakdown);
              }
            }}
            title="Click to toggle score factor breakdown"
          >
            <div className="flex items-center space-x-3">
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-amber-collar"
                    strokeDasharray={`${score}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute font-mono font-bold text-xs text-cream-text">
                  <CountUp to={score} />
                </span>
              </div>

              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-200">Contribution Tag</span>
                  <span className={`px-2 py-0.2 rounded-md text-[10px] font-semibold border ${rating.color}`}>
                    {rating.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-1 max-w-[220px] mt-0.5">
                  {scoreExplanation}
                </p>
              </div>
            </div>

            {/* Interactive breakdown popover */}
            {showScoreBreakdown && (
              <div className="mt-3 pt-3 border-t border-slate-800 w-full text-xs space-y-1.5 text-slate-300 animate-hero-settle">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-collar block">
                  Scoring Factors Breakdown:
                </span>
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <GitCommit className="w-3.5 h-3.5 text-amber-collar shrink-0" />
                  <span>Commit cadence &amp; 30-day maintenance frequency</span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <GitPullRequest className="w-3.5 h-3.5 text-moss-trail shrink-0" />
                  <span>Responsiveness to open PRs (low backlog ratio)</span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <Tag className="w-3.5 h-3.5 text-clay-rust shrink-0" />
                  <span>Presence of 'good first issue' starter labels</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 1: Deterministic Verified Facts (Collapsible) */}
        {briefing.verified_facts && briefing.verified_facts.length > 0 && (
          <div className="rounded-2xl bg-dusk-base/80 border border-slate-800 overflow-hidden">
            <button
              onClick={() => setShowFacts(!showFacts)}
              className="w-full p-4 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-amber-collar/50"
              aria-expanded={showFacts}
            >
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-moss-trail">
                <ShieldCheck className="w-4 h-4 text-moss-trail" />
                <span>Verified Facts (Direct File Confirmation — No Hallucinations)</span>
                <span className="text-slate-500 font-mono font-normal">({briefing.verified_facts.length})</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <span className="text-xs">{showFacts ? 'Collapse' : 'Expand'}</span>
                {showFacts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showFacts && (
              <div className="p-4 pt-1 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-2.5 animate-hero-settle">
                {briefing.verified_facts.map((fact, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start justify-between gap-2 p-3 rounded-xl bg-dusk-surface/80 border border-slate-800/80 text-xs text-slate-300 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-moss-trail shrink-0 mt-0.5" />
                      <span>{fact.text}</span>
                    </div>
                    {fact.github_link && (
                      <a
                        href={fact.github_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-collar hover:text-amber-300 shrink-0 p-1 hover:bg-slate-800 rounded transition-colors"
                        title="Inspect source file on GitHub"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section 2: AI Executive Narrative (Collapsible) */}
        {(briefing.ai_analysis || briefing.summary) && (
          <div className="rounded-2xl bg-dusk-base/80 border border-slate-800 overflow-hidden">
            <button
              onClick={() => setShowAI(!showAI)}
              className="w-full p-4 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-amber-collar/50"
              aria-expanded={showAI}
            >
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-collar">
                <Sparkles className="w-4 h-4" />
                <span>AI Architecture Narrative</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <span className="text-xs">{showAI ? 'Collapse' : 'Expand'}</span>
                {showAI ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showAI && (
              <div className="p-4 pt-1 border-t border-slate-800/80 space-y-4 animate-hero-settle">
                <p className="text-sm text-slate-200 leading-relaxed font-normal">
                  {briefing.ai_analysis || briefing.summary}
                </p>

                {/* Tech Stack Chips */}
                {briefing.tech_stack && briefing.tech_stack.length > 0 && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Core Stack &amp; Tooling
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {briefing.tech_stack.map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-collar/15 text-amber-collar border border-amber-collar/30 shadow-sm"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Architecture Explanation */}
                {briefing.architecture_explanation && (
                  <div className="p-3.5 rounded-xl bg-dusk-surface/80 border border-slate-800 text-xs sm:text-sm text-slate-300">
                    <span className="font-bold text-slate-200 block mb-1">Component Boundaries:</span>
                    {briefing.architecture_explanation}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Section 3: Defect-Weighted Starting Waypoints */}
        {briefing.suggested_starting_points && briefing.suggested_starting_points.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-collar mb-3">
              <Compass className="w-4 h-4" />
              <span>Suggested Waypoints (Ranked by Defect Density &amp; Workflows)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {briefing.suggested_starting_points.map((point, idx) => (
                <div
                  key={idx}
                  className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-dusk-base/80 border border-slate-800 hover:border-amber-collar/40 transition-all text-xs text-slate-300"
                >
                  <span className="w-5 h-5 rounded-md bg-amber-collar/20 text-amber-collar font-bold flex items-center justify-center shrink-0 text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
