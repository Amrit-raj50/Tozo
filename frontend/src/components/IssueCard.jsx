import React, { useState } from 'react';
import { 
  Sparkles, 
  Wrench, 
  Copy, 
  Check, 
  ExternalLink, 
  ArrowRight,
  Bug,
  AlertTriangle,
  Server,
  Layout,
  Code,
  Type,
  GitBranch,
  Box,
  BookOpen,
  Lightbulb,
  ShieldCheck,
  Folder,
  FileText,
  ChevronDown,
  ChevronUp,
  Eye,
  FileCode,
  CheckSquare
} from 'lucide-react';
import TozoMascot from './TozoMascot';

const CATEGORY_CONFIG = {
  bug: { label: 'Bug', icon: Bug, color: 'text-rose-400 bg-rose-500/10 border-rose-500/25' },
  error_handling: { label: 'Error Handling', icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
  backend: { label: 'Backend', icon: Server, color: 'text-blue-400 bg-blue-500/10 border-blue-500/25' },
  frontend: { label: 'Frontend', icon: Layout, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25' },
  lint: { label: 'Lint & Style', icon: Code, color: 'text-slate-300 bg-slate-800 border-slate-700' },
  typo: { label: 'Typo', icon: Type, color: 'text-sky-400 bg-sky-500/10 border-sky-500/25' },
  cicd: { label: 'CI/CD', icon: GitBranch, color: 'text-purple-400 bg-purple-500/10 border-purple-500/25' },
  deployment: { label: 'Deployment', icon: Box, color: 'text-orange-400 bg-orange-500/10 border-orange-500/25' },
  documentation: { label: 'Documentation', icon: BookOpen, color: 'text-teal-400 bg-teal-500/10 border-teal-500/25' },
  enhancement: { label: 'Enhancement', icon: Lightbulb, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25' },
  test_coverage: { label: 'Test Coverage', icon: ShieldCheck, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
};

export default function IssueCard({ issue, onDraftToast }) {
  const [copiedFix, setCopiedFix] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [showDraftDrawer, setShowDraftDrawer] = useState(false);
  const [draftMode, setDraftMode] = useState('preview'); // 'preview' | 'raw'

  const isHighSeverity = issue.severity?.toLowerCase() === 'high';

  const handleCopyFix = () => {
    if (!issue.suggested_fix) return;
    navigator.clipboard.writeText(issue.suggested_fix);
    setCopiedFix(true);
    setTimeout(() => setCopiedFix(false), 2000);
  };

  const handleCopyTitle = () => {
    const titleText = issue.draft_title || `[${issue.category}] ${issue.description}`;
    navigator.clipboard.writeText(titleText);
    setCopiedTitle(true);
    if (onDraftToast) {
      onDraftToast("Issue title copied!");
    }
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  const handleCopyDraft = () => {
    const fullDraft = issue.draft_body 
      ? `# ${issue.draft_title}\n\n${issue.draft_body}`
      : `### [Tozo Finding] ${issue.description}\n\nLocation: ${issue.full_path || issue.file}:${issue.line_start || 1}\n\n${issue.suggested_fix ? 'Suggested Fix:\n' + issue.suggested_fix : ''}`;

    navigator.clipboard.writeText(fullDraft);
    setCopiedDraft(true);
    if (onDraftToast) {
      onDraftToast("Complete GitHub Issue markdown copied!");
    }
    setTimeout(() => setCopiedDraft(false), 2500);
  };

  const getNewIssueUrl = () => {
    if (!issue.github_link && !issue.repo_url) return null;
    const targetUrl = issue.github_link || issue.repo_url || '';
    const match = targetUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return null;
    const [, owner, repo] = match;
    const title = issue.draft_title || `[${(issue.category || 'bug').toUpperCase()}] ${issue.description}`;
    const body = issue.draft_body 
      ? issue.draft_body 
      : `### [Tozo Finding] ${issue.description}\n\nLocation: \`${issue.full_path || issue.file}:${issue.line_start || 1}\`\n\n${issue.suggested_fix ? 'Suggested Fix:\n```\n' + issue.suggested_fix + '\n```' : ''}`;
    
    return `https://github.com/${owner}/${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  };

  const newIssueUrl = getNewIssueUrl();

  const severityConfigs = {
    high: {
      card: 'border-l-4 border-l-clay-rust border-rose-500/30 hover:border-rose-500/60 bg-dusk-surface/95',
      badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30 font-bold',
      dot: 'bg-rose-500 animate-pulse',
      label: 'High Severity',
    },
    medium: {
      card: 'border-l-4 border-l-amber-collar/60 border-amber-collar/30 hover:border-amber-collar/60 bg-dusk-surface/90',
      badge: 'bg-amber-500/10 text-amber-collar border-amber-collar/30 font-semibold',
      dot: 'bg-amber-collar',
      label: 'Medium Severity',
    },
    low: {
      card: 'border-l-4 border-l-moss-trail/60 border-moss-trail/30 hover:border-moss-trail/50 bg-dusk-surface/80',
      badge: 'bg-moss-trail/10 text-emerald-300 border-moss-trail/30 font-medium',
      dot: 'bg-moss-trail',
      label: 'Low Severity',
    },
  };

  const catKey = (issue.category || issue.type || 'bug').toLowerCase();
  const catConfig = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.bug;
  const CategoryIcon = catConfig.icon;
  const sevConfig = severityConfigs[issue.severity?.toLowerCase()] || severityConfigs.medium;
  const isAI = issue.source === 'ai';

  const lineDisplay = issue.line_start === issue.line_end || !issue.line_end
    ? `L${issue.line_start || issue.line || 1}`
    : `L${issue.line_start}-L${issue.line_end}`;

  return (
    <div className={`rounded-2xl p-5 sm:p-6 transition-all duration-200 border ${sevConfig.card} shadow-md group relative`}>
      {/* Top Location Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80 text-xs font-mono">
        <div className="flex items-center space-x-1.5 text-slate-400 overflow-hidden">
          <Folder className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          {issue.folder && (
            <>
              <span className="text-slate-400 truncate max-w-[160px] sm:max-w-none">{issue.folder}</span>
              <span className="text-slate-600">/</span>
            </>
          )}
          <span className="text-slate-200 font-bold">{issue.file || 'file'}</span>
          {issue.function_name && (
            <>
              <span className="text-slate-600">→</span>
              <span className="text-amber-collar font-bold">{issue.function_name}()</span>
            </>
          )}
          <span className="text-slate-600">→</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
            {lineDisplay}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Direct Pre-filled GitHub Issue Button */}
          {newIssueUrl && (
            <a
              href={newIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-dusk-base bg-amber-collar hover:bg-amber-400 border border-amber-collar transition-all shadow-sm cursor-pointer hover:scale-105"
              title="Open GitHub new issue form pre-filled with Tozo's title & full 14-point markdown description"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>File Issue on GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {/* Draft GitHub Issue Drawer Toggle */}
          <button
            onClick={() => setShowDraftDrawer(!showDraftDrawer)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors shadow-sm cursor-pointer"
            title="Preview or copy pre-formatted GitHub Issue markdown"
          >
            <FileText className="w-3.5 h-3.5 text-amber-collar" />
            <span>Draft Details</span>
            {showDraftDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* View Code on GitHub Link */}
          {issue.github_link && (
            <a
              href={issue.github_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
              title="View exact line on GitHub repository"
            >
              <span>Code</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Badges Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Severity Badge */}
          <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs border ${sevConfig.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sevConfig.dot}`} />
            <span>{sevConfig.label}</span>
          </span>

          {/* Category Badge */}
          <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${catConfig.color}`}>
            <CategoryIcon className="w-3.5 h-3.5" />
            <span>{catConfig.label}</span>
          </span>

          {/* Beginner Friendly Tag */}
          {issue.beginner_friendly && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <span>Starter Friendly</span>
            </span>
          )}

          {/* Rule ID */}
          {issue.rule_id && (
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 hidden sm:inline-block">
              {issue.rule_id}
            </span>
          )}
        </div>

        {/* Source Badge */}
        {isAI ? (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-collar/15 text-amber-collar border border-amber-collar/30 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-collar" />
            <span>AI Verified</span>
          </span>
        ) : (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-moss-trail/15 text-moss-trail border border-moss-trail/30">
            <Wrench className="w-3.5 h-3.5 text-moss-trail" />
            <span>Static Tool</span>
          </span>
        )}
      </div>

      {/* Description — Full text visible by default */}
      <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal whitespace-pre-line">
        {issue.description}
      </p>

      {/* Beginner Reason Callout */}
      {issue.beginner_reason && (
        <p className="mt-2.5 text-xs text-amber-200/90 bg-amber-950/30 border border-amber-800/30 rounded-lg p-2.5">
          <span className="font-bold text-amber-collar">Tozo's Tip:</span> {issue.beginner_reason}
        </p>
      )}

      {/* Suggested Fix Section */}
      {issue.suggested_fix && (
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
              <ArrowRight className="w-3.5 h-3.5 text-amber-collar" />
              <span>Suggested Fix</span>
            </span>
            <button
              onClick={handleCopyFix}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
              title="Copy suggestion to clipboard"
            >
              {copiedFix ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Fix</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 overflow-x-auto">
            <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap break-words selection:bg-amber-collar/30">
              <code>{issue.suggested_fix}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Draft GitHub Issue Drawer */}
      {showDraftDrawer && (
        <div className="mt-4 pt-4 border-t border-amber-collar/20 bg-dusk-base/95 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl animate-hero-settle">
          {/* Drawer Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-amber-collar/15 text-amber-collar border border-amber-collar/30">
                <FileText className="w-4 h-4" />
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-collar block">
                  Actionable GitHub Issue Draft
                </span>
                <span className="text-[11px] text-slate-400">
                  Formatted to open-source maintainer specifications
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View Switcher: Formatted Preview vs Raw Markdown */}
              <div className="flex items-center rounded-xl bg-slate-900 p-0.5 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setDraftMode('preview')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                    draftMode === 'preview'
                      ? 'bg-amber-collar text-dusk-base font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDraftMode('raw')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                    draftMode === 'raw'
                      ? 'bg-amber-collar text-dusk-base font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Raw Markdown</span>
                </button>
              </div>

              {/* Direct GitHub Issue Link */}
              {getNewIssueUrl() && (
                <a
                  href={getNewIssueUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors shadow-sm"
                  title="Open pre-filled issue form on GitHub"
                >
                  <span>Open on GitHub</span>
                  <ExternalLink className="w-3 h-3 text-amber-collar" />
                </a>
              )}

              {/* Copy Full Issue Button */}
              <button
                type="button"
                onClick={handleCopyDraft}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-collar hover:bg-amber-400 text-dusk-base transition-colors shadow-sm cursor-pointer"
              >
                {copiedDraft ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied Full Issue!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Full Issue</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Issue Title Box */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 mb-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 font-mono text-xs">
              <span className="text-slate-500 font-bold block mb-0.5 text-[10px] uppercase tracking-wider">
                GitHub Issue Title:
              </span>
              <span className="text-cream-text font-semibold break-words">
                {issue.draft_title || `[${issue.category}] ${issue.description}`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyTitle}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors shrink-0"
              title="Copy issue title only"
            >
              {copiedTitle ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Title Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Title</span>
                </>
              )}
            </button>
          </div>

          {/* Issue Body Container */}
          {draftMode === 'preview' ? (
            <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 max-h-96 overflow-y-auto space-y-4 text-xs font-sans text-slate-300">
              <div className="space-y-3">
                {/* Parse Markdown sections */}
                {(issue.draft_body || issue.description).split('\n---\n').map((section, sIdx) => {
                  const lines = section.trim().split('\n');
                  const headerLine = lines.find(l => l.startsWith('## '));
                  const heading = headerLine ? headerLine.replace('## ', '').trim() : null;
                  const contentLines = lines.filter(l => !l.startsWith('## '));
                  const content = contentLines.join('\n').trim();

                  return (
                    <div key={sIdx} className="p-3 rounded-xl bg-dusk-base/80 border border-slate-800/80 space-y-2">
                      {heading && (
                        <h4 className="text-amber-collar font-display font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-collar" />
                          <span>{heading}</span>
                        </h4>
                      )}

                      {/* Render text with code blocks or checklist support */}
                      <div className="text-slate-300 leading-relaxed font-mono text-[11px] whitespace-pre-wrap">
                        {content}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 max-h-96 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap selection:bg-amber-collar/30">
              <pre>{`# ${issue.draft_title || ''}\n\n${issue.draft_body || issue.description}`}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
