import React from 'react';
import { GitCommit, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Compass, Sparkles } from 'lucide-react';
import CountUp from './CountUp';

export default function DiffBanner({ 
  diffSummary, 
  commitSha, 
  isFirstScan, 
  onRescan, 
  isRescanning = false 
}) {
  const hasDiff = diffSummary && (diffSummary.new_issues_count > 0 || diffSummary.resolved_issues_count > 0);
  const resolvedCount = diffSummary?.resolved_issues_count || 0;
  const newCount = diffSummary?.new_issues_count || 0;

  return (
    <div className="rounded-3xl bg-dusk-surface/90 border border-slate-700/60 p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      {/* Decorative accent gradient on left */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-amber-collar via-moss-trail to-clay-rust" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pl-1 sm:pl-2">
        {/* Left: Commit & Scan Status */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-dusk-base text-amber-collar border border-amber-collar/40 shadow-sm">
              <GitCommit className="w-3.5 h-3.5" />
              <span>Commit {commitSha ? commitSha.slice(0, 7) : 'HEAD'}</span>
            </span>

            {isFirstScan ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-moss-trail/20 text-emerald-300 border border-moss-trail/40">
                <Compass className="w-3.5 h-3.5" />
                <span>First Baseline Scan</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-dusk-base text-slate-300 border border-slate-700">
                <span>Re-scan against</span>
                <span className="font-mono text-amber-collar font-bold">
                  {diffSummary?.previous_commit_sha ? diffSummary.previous_commit_sha.slice(0, 7) : 'prior scan'}
                </span>
              </span>
            )}
          </div>

          <p className="text-sm text-slate-200">
            {isFirstScan ? (
              <span>
                Tozo recorded this baseline. <strong className="text-amber-collar font-bold">Re-scan anytime</strong> to spot newly introduced bugs and celebrate resolved issues.
              </span>
            ) : hasDiff ? (
              <span>
                Codebase drift detected: <strong className="text-amber-collar font-bold">{newCount} new findings</strong> and <strong className="text-moss-trail font-bold">{resolvedCount} resolved</strong> between git revisions.
              </span>
            ) : (
              <span>
                <strong className="text-moss-trail font-bold">Codebase stable:</strong> Zero new defects introduced since previous scan.
              </span>
            )}
          </p>
        </div>

        {/* Right: Drift Counters with CountUp & Re-scan Action */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {!isFirstScan && diffSummary && (
            <div className="flex items-center gap-2.5">
              {/* Resolved Issues: Celebratory positive visual treatment */}
              {resolvedCount > 0 && (
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-2xl text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-display font-extrabold text-emerald-300">
                    -<CountUp to={resolvedCount} />
                  </span>
                  <span>Resolved</span>
                </div>
              )}

              {/* New Issues */}
              {newCount > 0 ? (
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-2xl text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-sm">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span className="text-sm font-display font-extrabold text-rose-300">
                    +<CountUp to={newCount} />
                  </span>
                  <span>New</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium bg-dusk-base text-slate-300 border border-slate-700">
                  <span>0 New</span>
                </div>
              )}
            </div>
          )}

          {onRescan && (
            <button
              onClick={onRescan}
              disabled={isRescanning}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-bold bg-dusk-base hover:bg-slate-800 text-amber-collar hover:text-amber-300 border border-amber-collar/40 hover:border-amber-collar transition-all shadow-sm disabled:opacity-50"
              title="Force re-clone and re-scan this repository"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRescanning ? 'animate-spin' : ''}`} />
              <span>{isRescanning ? 'Scanning...' : 'Re-scan Repo'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
