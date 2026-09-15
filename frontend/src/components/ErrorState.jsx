import React from 'react';
import TozoMascot from './TozoMascot';
import { RefreshCw, ArrowLeft, HelpCircle } from 'lucide-react';

export default function ErrorState({ error, onReset }) {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <div className="rounded-3xl bg-dusk-surface/90 border border-clay-rust/40 p-8 sm:p-12 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-clay-rust" />

        {/* Confused Tozo Mascot */}
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-700/60">
            <TozoMascot pose="confused" className="w-24 h-24 sm:w-28 sm:h-28" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-bold text-cream-text font-display mb-3">
          Tozo Lost the Trail
        </h2>

        {/* Error Detail */}
        <div className="mb-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-rose-300 font-mono text-xs sm:text-sm text-left whitespace-pre-wrap break-words">
          {error || 'An unexpected error occurred during repository analysis.'}
        </div>

        {/* Helpful Guidance */}
        <div className="text-left bg-slate-900/40 rounded-xl p-4 border border-slate-800/80 mb-8 space-y-2 text-xs sm:text-sm text-slate-300">
          <div className="flex items-center space-x-2 text-amber-collar font-semibold">
            <HelpCircle className="w-4 h-4" />
            <span>Things to check:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
            <li>Ensure the repository is public (Tozo currently scans public GitHub repositories).</li>
            <li>Double-check the URL format: <code className="text-slate-300 font-mono">https://github.com/owner/repo</code></li>
            <li>Verify the repository has code files (empty or documentation-only repositories cannot be analyzed).</li>
          </ul>
        </div>

        {/* Action Button */}
        <button
          onClick={onReset}
          className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl font-bold bg-amber-collar hover:bg-amber-400 text-dusk-base transition-all shadow-lg hover:shadow-amber-collar/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Try Another Repository</span>
        </button>
      </div>
    </div>
  );
}
