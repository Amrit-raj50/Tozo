import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Loader2, 
  Circle, 
  ShieldCheck, 
  GitBranch, 
  FileCode2, 
  Sparkles, 
  Layers, 
  Cpu
} from 'lucide-react';
import TozoMascot from './TozoMascot';

const STAGES = [
  { key: 'validating', label: 'GitHub Guardrails', icon: ShieldCheck, desc: 'Validating size & public accessibility' },
  { key: 'cloning', label: 'Shallow Clone', icon: GitBranch, desc: 'Downloading repository tree with depth=1' },
  { key: 'scanning', label: 'AST Code Parsing', icon: FileCode2, desc: 'Extracting functions and measuring cyclomatic complexity' },
  { key: 'static_checking', label: 'Static Linters & Tests', icon: Cpu, desc: 'Running Ruff, Codespell, and test suite heuristics' },
  { key: 'ai_analyzing', label: 'AI Code Review', icon: Sparkles, desc: 'Reasoning through high-complexity code chunks' },
  { key: 'finalizing', label: 'Report & Fetch List', icon: Layers, desc: 'Curating starter pickups & deduplicating issues' },
];

export default function LoadingState({ jobStatus, repoUrl }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentStatus = jobStatus?.status || 'queued';
  const progressPercent = Math.min(100, Math.max(5, jobStatus?.progress_percent || 10));
  const stageMessage = jobStatus?.stage_message || 'Tozo is picking up the trail...';

  // Map backend status to stage index
  const stageOrder = ['validating', 'cloning', 'scanning', 'static_checking', 'ai_analyzing', 'finalizing', 'completed'];
  const currentStageIndex = stageOrder.indexOf(currentStatus);

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      <div className="rounded-3xl p-8 sm:p-10 border border-slate-700/60 shadow-2xl relative overflow-hidden bg-dusk-surface/90 backdrop-blur-md">
        {/* Glow background accent */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-collar/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-moss-trail/10 rounded-full blur-3xl pointer-events-none" />

        {/* Mascot & Header */}
        <div className="text-center relative z-10">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-2xl bg-dusk-base/80 border border-slate-700/60 shadow-inner">
              <TozoMascot pose="walking" className="w-16 h-16 animate-tozo-walking" />
            </div>
          </div>

          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-collar/10 border border-amber-collar/20 text-amber-collar text-xs font-semibold mb-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Tozo on the Trail</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-cream-text font-display">
            Sniffing Out Codebase Insights
          </h2>
          <p className="mt-2 text-sm text-slate-300 font-mono break-all max-w-xl mx-auto">
            {repoUrl}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-8 relative z-10">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-2">
            <span className="text-amber-collar font-medium">{stageMessage}</span>
            <span className="font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-dusk-base rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-amber-collar via-moss-trail to-clay-rust transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 text-right">
            <span className="text-[11px] text-slate-400 font-mono">Elapsed: {elapsed}s</span>
          </div>
        </div>

        {/* Real-time stages timeline */}
        <div className="mt-8 space-y-3 relative z-10 border-t border-slate-800 pt-6">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isCompleted = currentStageIndex > idx || currentStatus === 'completed';
            const isActive = currentStageIndex === idx;

            return (
              <div
                key={stage.key}
                className={`flex items-start space-x-4 p-3.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-dusk-base border border-amber-collar/40 shadow-sm'
                    : isCompleted
                    ? 'bg-dusk-base/60 border border-slate-800'
                    : 'opacity-40'
                }`}
              >
                {/* State Icon */}
                <div className="mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-moss-trail" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 text-amber-collar animate-spin" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600" />
                  )}
                </div>

                {/* Stage Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-collar' : isCompleted ? 'text-moss-trail' : 'text-slate-500'}`} />
                      <span className={`text-sm font-semibold ${isActive ? 'text-cream-text' : isCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
                        {stage.label}
                      </span>
                    </div>
                    {isActive && (
                      <span className="text-[11px] font-medium text-amber-collar animate-pulse">
                        Exploring...
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-[11px] font-medium text-moss-trail">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{stage.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footnote */}
        <div className="mt-6 text-center text-xs text-slate-400">
          Fast heuristics and linters run first. Advanced AI reasoning is reserved exclusively for complex code and architecture mapping.
        </div>
      </div>
    </div>
  );
}
