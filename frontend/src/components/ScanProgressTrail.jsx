import React, { useState, useEffect } from 'react';
import TozoMascot from './TozoMascot';
import { 
  ShieldCheck, 
  GitBranch, 
  FileCode2, 
  Cpu, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  Circle,
  Loader2
} from 'lucide-react';
import { getTozoBark } from '../data/tozoBarks';

const TRAIL_WAYPOINTS = [
  { key: 'validating', label: 'Trailhead Guardrails', desc: 'Verifying repository access & size', icon: ShieldCheck },
  { key: 'cloning', label: 'Shallow Clone', desc: 'Fetching pack tree (depth=1)', icon: GitBranch },
  { key: 'scanning', label: 'AST Function Mapping', desc: 'Tracing functions & complexity', icon: FileCode2 },
  { key: 'static_checking', label: 'Static Scent Checks', desc: 'Ruff, Codespell & test heuristics', icon: Cpu },
  { key: 'ai_analyzing', label: 'AI Deep Reasoning', desc: 'Investigating complex code blocks', icon: Sparkles },
  { key: 'finalizing', label: 'Fetch List & Wrap-up', desc: 'Curating starter PRs & drift', icon: Layers },
];

export default function ScanProgressTrail({ jobStatus, repoUrl }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentStatus = jobStatus?.status || 'queued';
  const progressPercent = Math.min(100, Math.max(8, jobStatus?.progress_percent || 12));
  const stageMessage = jobStatus?.stage_message || 'Tozo is picking up the scent...';

  const stageKeys = TRAIL_WAYPOINTS.map(w => w.key);
  const activeIdx = stageKeys.indexOf(currentStatus);
  const currentStep = activeIdx >= 0 ? activeIdx : (currentStatus === 'completed' ? TRAIL_WAYPOINTS.length : 0);

  // Dynamic context bark
  const currentBark = getTozoBark(currentStatus, { repoUrl });

  // Mascot mood: excited if AI analyzing, focused during scan, neutral otherwise
  const mascotMood = currentStatus === 'ai_analyzing' ? 'excited' : currentStatus === 'scanning' ? 'focused' : 'neutral';

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      <div className="rounded-3xl p-6 sm:p-10 border border-slate-700/60 shadow-2xl relative overflow-hidden bg-dusk-surface/90 backdrop-blur-md">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-collar/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-moss-trail/10 rounded-full blur-3xl pointer-events-none" />

        {/* Trail Progress Header */}
        <div className="text-center relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-collar/15 border border-amber-collar/30 text-amber-collar text-xs font-semibold">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Trail Expedition in Progress</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-cream-text font-display tracking-tight">
            Tracking Repository Trail
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-mono break-all max-w-xl mx-auto">
            {repoUrl}
          </p>
        </div>

        {/* Dynamic Trail Motion: Dog Moving Along the Trail */}
        <div className="mt-8 relative z-10 bg-dusk-base/80 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-2">
            <span className="text-amber-collar font-bold">{stageMessage}</span>
            <span>{progressPercent}%</span>
          </div>

          {/* Progress Trail Track */}
          <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700/80 mb-6">
            <div
              className="h-full bg-gradient-to-r from-amber-collar via-moss-trail to-clay-rust transition-all duration-700 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Animated Mascot Positioned Along the Trail */}
          <div className="flex items-center justify-center py-2">
            <div className="flex flex-col items-center">
              <TozoMascot 
                pose="walking" 
                mood={mascotMood}
                speechText={currentBark}
                size={90}
                className="hover:scale-105 transition-transform"
              />
            </div>
          </div>

          <div className="text-right text-[11px] font-mono text-slate-400 mt-2">
            Expedition time: {elapsed}s
          </div>
        </div>

        {/* Paw-Print Waypoint Stages */}
        <div className="mt-8 space-y-3 relative z-10 border-t border-slate-800 pt-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
            Trail Waypoints ({currentStep} of {TRAIL_WAYPOINTS.length} completed)
          </span>

          {TRAIL_WAYPOINTS.map((waypoint, idx) => {
            const Icon = waypoint.icon;
            const isCompleted = currentStep > idx || currentStatus === 'completed';
            const isActive = currentStep === idx && currentStatus !== 'completed';

            return (
              <div
                key={waypoint.key}
                className={`flex items-start space-x-3.5 p-3.5 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-dusk-base border border-amber-collar/50 shadow-md translate-x-1'
                    : isCompleted
                    ? 'bg-dusk-base/60 border border-slate-800/80 opacity-90'
                    : 'opacity-40 border border-transparent'
                }`}
              >
                {/* Waypoint Paw / Status Icon */}
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-moss-trail" />
                  ) : isActive ? (
                    <div className="relative flex items-center justify-center">
                      <TozoMascot pose="paw" size={20} className="text-amber-collar animate-pulse" />
                    </div>
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600" />
                  )}
                </div>

                {/* Waypoint Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-collar' : isCompleted ? 'text-moss-trail' : 'text-slate-500'}`} />
                      <span className={`text-sm font-semibold ${isActive ? 'text-cream-text' : isCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
                        {waypoint.label}
                      </span>
                    </div>

                    {isActive && (
                      <span className="text-[11px] font-mono text-amber-collar font-bold animate-pulse">
                        Active Step...
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-[11px] font-mono text-moss-trail font-medium">
                        Clear
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{waypoint.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info note */}
        <div className="mt-6 text-center text-xs text-slate-400">
          Fast heuristics &amp; linters verify syntax first. Advanced AI reasoning is reserved exclusively for complex logic chunks.
        </div>
      </div>
    </div>
  );
}
