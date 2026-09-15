import React, { useState } from 'react';
import TozoMascot from './TozoMascot';
import CountUp from './CountUp';
import { 
  Check, 
  Copy, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  FileCode, 
  ArrowRight,
  BookOpen,
  Type,
  Code,
  ShieldCheck,
  Lightbulb,
  FileText
} from 'lucide-react';

const STARTER_ICONS = {
  typo: { icon: Type, color: 'text-sky-400 bg-sky-500/10 border-sky-500/25' },
  documentation: { icon: BookOpen, color: 'text-teal-400 bg-teal-500/10 border-teal-500/25' },
  lint: { icon: Code, color: 'text-slate-300 bg-slate-800 border-slate-700' },
  test_coverage: { icon: ShieldCheck, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
  enhancement: { icon: Lightbulb, color: 'text-amber-collar bg-amber-500/10 border-amber-collar/25' },
};

export default function FetchListCard({ fetchList = [], onSelectIssue, onDraftToast }) {
  const [expandedIndices, setExpandedIndices] = useState({});
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!fetchList || fetchList.length === 0) {
    return null;
  }

  const toggleExpand = (idx) => {
    setExpandedIndices(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleCopyDraft = (issue, idx, e) => {
    if (e) e.stopPropagation();
    const text = issue.draft_body 
      ? `# ${issue.draft_title}\n\n${issue.draft_body}`
      : `### [Tozo Starter Task] ${issue.description}\n\nLocation: ${issue.full_path || issue.file}:${issue.line_start || 1}\n\n${issue.suggested_fix ? 'Suggested Fix:\n' + issue.suggested_fix : ''}`;

    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    if (onDraftToast) {
      onDraftToast("Copied — go paste that in a new issue!");
    }
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  return (
    <div className="rounded-3xl bg-dusk-surface/90 border-2 border-amber-collar/40 p-6 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-md">
      {/* Warm accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-collar via-moss-trail to-clay-rust" />

      {/* Header with Tozo Mascot and Animated Counter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3.5">
          <div className="p-2 rounded-2xl bg-amber-collar/15 border border-amber-collar/30 shrink-0">
            <TozoMascot pose="fetching" size={48} speechText="Fetched some starter pickups for you!" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h3 className="text-xl sm:text-2xl font-bold text-cream-text font-display">
                Tozo's Fetch List
              </h3>
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-collar/20 text-amber-collar border border-amber-collar/40">
                <CountUp to={fetchList.length} className="font-mono text-sm" />
                <span>treats found</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Curated beginner-friendly pickups — low risk, high confidence for your first merged pull request.
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Starter Task Items */}
      <div className="space-y-3">
        {fetchList.map((issue, idx) => {
          const cat = (issue.category || 'typo').toLowerCase();
          const config = STARTER_ICONS[cat] || STARTER_ICONS.typo;
          const Icon = config.icon;
          const isExpanded = Boolean(expandedIndices[idx]);
          const isCopied = copiedIndex === idx;

          return (
            <div 
              key={idx}
              className={`rounded-2xl border transition-all duration-200 bg-dusk-base/80 overflow-hidden ${
                isExpanded ? 'border-amber-collar/60 shadow-lg' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Clickable Header / Collapsed Summary */}
              <button
                onClick={() => toggleExpand(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(idx);
                  }
                }}
                className="w-full text-left p-4 sm:p-4.5 flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-amber-collar/50 rounded-2xl group cursor-pointer"
                aria-expanded={isExpanded}
              >
                <div className="flex-1 min-w-0">
                  {/* Category & Location */}
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${config.color}`}>
                      <Icon className="w-3 h-3" />
                      <span className="capitalize">{cat.replace('_', ' ')}</span>
                    </span>

                    <span className="text-xs font-mono text-slate-300 font-medium truncate max-w-[200px] sm:max-w-none">
                      {issue.file}:{issue.line_start || 1}
                    </span>
                  </div>

                  {/* One-Line Reason (Collapsed state) */}
                  <div className="text-sm font-medium text-cream-text line-clamp-1">
                    {issue.beginner_reason ? (
                      <span>
                        <span className="text-amber-collar font-bold">Why start here:</span> {issue.beginner_reason}
                      </span>
                    ) : (
                      issue.description
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-xs text-slate-400 group-hover:text-amber-collar transition-colors hidden sm:inline">
                    {isExpanded ? 'Collapse' : 'Details'}
                  </span>
                  <div className="p-1 rounded-lg bg-slate-800 text-slate-400 group-hover:text-white transition-colors">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </button>

              {/* Smooth Expanded Drawer */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 space-y-3 text-xs sm:text-sm animate-hero-settle">
                  {/* Full Description */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Full Description
                    </span>
                    <p className="text-slate-200 leading-relaxed">
                      {issue.description}
                    </p>
                  </div>

                  {/* Suggested Fix */}
                  {issue.suggested_fix && (
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-collar block mb-1.5">
                        Suggested Fix
                      </span>
                      <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
                        <code>{issue.suggested_fix}</code>
                      </pre>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => handleCopyDraft(issue, idx, e)}
                        className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-collar hover:bg-amber-400 text-dusk-base transition-all shadow-sm"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Issue Markdown Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Draft GitHub Issue</span>
                          </>
                        )}
                      </button>

                      {issue.github_link && (
                        <a
                          href={issue.github_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                        >
                          <span>Open on GitHub</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {onSelectIssue && (
                      <button
                        onClick={() => onSelectIssue(issue)}
                        className="text-xs text-slate-400 hover:text-amber-collar flex items-center space-x-1 transition-colors"
                      >
                        <span>Filter this in Report</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
