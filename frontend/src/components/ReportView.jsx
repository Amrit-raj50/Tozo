import React, { useState, useMemo, useEffect } from 'react';
import { 
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
  Download, 
  ExternalLink, 
  Search, 
  Clock, 
  FileText, 
  Layers, 
  CheckCircle,
  RotateCcw,
  Sparkles,
  Share2,
  Check,
  GitCommit,
  ArrowUpDown,
  SlidersHorizontal
} from 'lucide-react';
import MetricCard from './MetricCard';
import IssueCard from './IssueCard';
import RepoBriefingCard from './RepoBriefingCard';
import DiffBanner from './DiffBanner';
import FetchListCard from './FetchListCard';
import TozoMascot from './TozoMascot';
import CountUp from './CountUp';

const CATEGORIES = [
  { id: 'all', label: 'All Issues', icon: Layers, defaultTheme: 'full codebase overview' },
  { id: 'bug', label: 'Bugs', icon: Bug, defaultTheme: 'logic & syntax traps' },
  { id: 'error_handling', label: 'Error Handling', icon: AlertTriangle, defaultTheme: 'exceptions & fallbacks' },
  { id: 'backend', label: 'Backend', icon: Server, defaultTheme: 'endpoints & validation' },
  { id: 'frontend', label: 'Frontend', icon: Layout, defaultTheme: 'rendering & UI hooks' },
  { id: 'lint', label: 'Lint & Style', icon: Code, defaultTheme: 'style rules & formatting' },
  { id: 'typo', label: 'Typos', icon: Type, defaultTheme: 'spelling fixes in comments' },
  { id: 'cicd', label: 'CI/CD', icon: GitBranch, defaultTheme: 'actions & workflow permissions' },
  { id: 'deployment', label: 'Deployment', icon: Box, defaultTheme: 'Docker & compose configurations' },
  { id: 'documentation', label: 'Documentation', icon: BookOpen, defaultTheme: 'docstrings & README notes' },
  { id: 'enhancement', label: 'Enhancements', icon: Lightbulb, defaultTheme: 'cleanups & performance wins' },
  { id: 'test_coverage', label: 'Test Coverage', icon: ShieldCheck, defaultTheme: 'assertions & test cases' },
];

/**
 * Derives a rich thematic description from an array of issues.
 */
function getCategoryThematicSummary(issues, defaultTheme) {
  if (!issues || issues.length === 0) return defaultTheme;

  const textPool = issues.map(i => `${i.description} ${i.function_name || ''} ${i.file || ''}`).join(' ').toLowerCase();

  const keywords = [
    { word: 'validation', label: 'request validation' },
    { word: 'async', label: 'async/concurrency' },
    { word: 'database', label: 'database queries' },
    { word: 'query', label: 'database queries' },
    { word: 'spelling', label: 'identifier spelling' },
    { word: 'typo', label: 'comment typos' },
    { word: 'version', label: 'action pinning' },
    { word: 'permission', label: 'least-privilege tokens' },
    { word: 'exception', label: 'broad exception catches' },
    { word: 'docstring', label: 'missing docstrings' },
    { word: 'test', label: 'unit test gaps' },
    { word: 'timeout', label: 'network timeouts' },
    { word: 'docker', label: 'container root users' },
  ];

  const matched = keywords.filter(k => textPool.includes(k.word));
  if (matched.length > 0) {
    const topThemes = matched.slice(0, 2).map(m => m.label).join(' & ');
    return `mostly around ${topThemes}`;
  }

  return defaultTheme;
}

export default function ReportView({ report, onReset, onRescan, isRescanning = false }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('severity'); // severity | file | category
  const [copiedShare, setCopiedShare] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [showCelebration, setShowCelebration] = useState(true);

  // Auto-hide celebratory paw particles after 1.4 seconds (under 1.5s as requested)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCelebration(false);
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  const metrics = report.metrics || {};
  const categories = report.issues_by_category || {};
  const warnings = report.warnings || [];

  // Extract owner/repo
  const cleanRepoName = report.repo_name || 'unknown/repo';
  const [owner, repo] = cleanRepoName.includes('/') ? cleanRepoName.split('/') : ['owner', cleanRepoName];

  // Flatten all issues
  const allIssues = useMemo(() => {
    const list = [];
    Object.values(categories).forEach((items) => {
      if (Array.isArray(items)) {
        list.push(...items);
      }
    });
    return list;
  }, [categories]);

  // Unique files with issues
  const uniqueFilesCount = useMemo(() => {
    const files = new Set();
    allIssues.forEach(i => {
      if (i.file || i.full_path) files.add(i.file || i.full_path);
    });
    return files.size;
  }, [allIssues]);

  const quickWinsCount = report.fetch_list?.length || allIssues.filter(i => i.severity === 'low').length;

  // High severity count
  const highSeverityCount = useMemo(() => {
    return allIssues.filter((i) => i.severity?.toLowerCase() === 'high').length;
  }, [allIssues]);

  // Filtered & Sorted issues
  const filteredIssues = useMemo(() => {
    const result = allIssues.filter((issue) => {
      const cat = (issue.category || issue.type || 'bug').toLowerCase();

      // Category filter
      if (selectedCategory !== 'all' && cat !== selectedCategory) {
        return false;
      }

      // Severity filter
      if (selectedSeverity !== 'all' && issue.severity?.toLowerCase() !== selectedSeverity) {
        return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inDesc = issue.description?.toLowerCase().includes(q);
        const inFile = issue.file?.toLowerCase().includes(q);
        const inFolder = issue.folder?.toLowerCase().includes(q);
        const inFunc = issue.function_name?.toLowerCase().includes(q);
        const inFix = issue.suggested_fix?.toLowerCase().includes(q);
        const inRule = issue.rule_id?.toLowerCase().includes(q);
        if (!inDesc && !inFile && !inFolder && !inFunc && !inFix && !inRule) return false;
      }

      return true;
    });

    // Sorting
    const severityOrder = { high: 0, medium: 1, low: 2 };
    result.sort((a, b) => {
      if (sortBy === 'severity') {
        const diff = (severityOrder[a.severity?.toLowerCase()] ?? 9) - (severityOrder[b.severity?.toLowerCase()] ?? 9);
        if (diff !== 0) return diff;
        return (a.file || '').localeCompare(b.file || '');
      }
      if (sortBy === 'file') {
        const diff = (a.file || '').localeCompare(b.file || '');
        if (diff !== 0) return diff;
        return (a.line_start || 0) - (b.line_start || 0);
      }
      if (sortBy === 'category') {
        return (a.category || '').localeCompare(b.category || '');
      }
      return 0;
    });

    return result;
  }, [allIssues, selectedCategory, selectedSeverity, searchQuery, sortBy]);

  // Export report to JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tozo_report_${cleanRepoName.replace('/', '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Toast trigger
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Share Scorecard
  const handleShareScorecard = () => {
    const scorecardUrl = `${window.location.origin}/scorecard/${owner}/${repo}`;
    navigator.clipboard.writeText(scorecardUrl);
    setCopiedShare(true);
    triggerToast("Scorecard link copied to clipboard!");
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative">
      {/* Toast Notification in Tozo's voice */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="toast-slide-up flex items-center space-x-2.5 px-4 py-2.5 rounded-2xl bg-dusk-surface border border-amber-collar/50 text-cream-text text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md">
            <TozoMascot pose="paw" size={20} className="text-amber-collar" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Banner / Repository Info */}
      <div className="rounded-3xl p-6 sm:p-8 border border-slate-700/60 bg-dusk-surface/90 shadow-xl relative overflow-hidden backdrop-blur-md">
        {/* Celebration paw particles near Tozo Mascot */}
        {showCelebration && (
          <div className="absolute top-6 left-16 z-20 pointer-events-none">
            <div className="paw-particle-1 absolute text-amber-collar opacity-90">
              <TozoMascot pose="paw" size={18} />
            </div>
            <div className="paw-particle-2 absolute text-moss-trail opacity-90">
              <TozoMascot pose="paw" size={16} />
            </div>
            <div className="paw-particle-3 absolute text-amber-collar opacity-90">
              <TozoMascot pose="paw" size={20} />
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-cream-text font-display">
                {report.repo_name}
              </h1>
              
              {report.commit_sha && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-dusk-base text-amber-collar border border-amber-collar/40 shadow-sm">
                  <GitCommit className="w-3.5 h-3.5" />
                  <span>{report.commit_sha.slice(0, 7)}</span>
                </span>
              )}

              {metrics.cached && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  Cache Served
                </span>
              )}
            </div>

            <a
              href={report.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs text-amber-collar hover:text-amber-300 mt-1 font-mono transition-colors"
            >
              <span>{report.repo_url}</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {/* Rich Headline Summary Copy */}
            <p className="text-sm sm:text-base text-slate-200 mt-3 font-medium">
              <strong className="text-amber-collar font-bold font-display text-lg">
                <CountUp to={report.total_issues} /> issues found
              </strong>{' '}
              across <strong className="text-cream-text font-semibold">{uniqueFilesCount} files</strong> —{' '}
              <strong className="text-moss-trail font-bold">{quickWinsCount} are quick wins</strong>.
            </p>

            {/* Scan Summary Meta Pills */}
            <div className="flex flex-wrap items-center gap-2.5 mt-3 text-xs text-slate-300">
              <span className="flex items-center space-x-1 bg-dusk-base/80 px-3 py-1 rounded-full border border-slate-700 font-mono">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>{metrics.files_scanned || 0} Files</span>
              </span>
              <span className="flex items-center space-x-1 bg-dusk-base/80 px-3 py-1 rounded-full border border-slate-700 font-mono">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>{(metrics.total_lines_scanned || 0).toLocaleString()} Lines</span>
              </span>
              <span className="flex items-center space-x-1 bg-dusk-base/80 px-3 py-1 rounded-full border border-slate-700 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-collar" />
                <span>{metrics.ai_chunks_analyzed || 0} AI Reviews</span>
              </span>
              <span className="flex items-center space-x-1 bg-dusk-base/80 px-3 py-1 rounded-full border border-slate-700 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{metrics.duration_seconds || 0}s Duration</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleShareScorecard}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-dusk-base hover:bg-slate-800 text-amber-collar border border-amber-collar/40 hover:border-amber-collar transition-all shadow-sm"
              title="Copy shareable scorecard URL"
            >
              {copiedShare ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Scorecard Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share Scorecard</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportJSON}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-dusk-base hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>

            <button
              onClick={onReset}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-collar hover:bg-amber-400 text-dusk-base transition-all shadow-md"
            >
              <RotateCcw className="w-4 h-4" />
              <span>New Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature 1: Visible Freshness & Re-scan Diff Banner */}
      <DiffBanner
        diffSummary={report.diff_summary}
        commitSha={report.commit_sha}
        isFirstScan={report.is_first_scan}
        onRescan={onRescan}
        isRescanning={isRescanning}
      />

      {/* Feature 2: Tozo's Fetch List (Expandable Starter Pickups) */}
      {report.fetch_list && report.fetch_list.length > 0 && (
        <FetchListCard 
          fetchList={report.fetch_list} 
          onSelectIssue={(issue) => {
            const cat = (issue.category || 'all').toLowerCase();
            setSelectedCategory(cat);
            setSearchQuery(issue.file || '');
          }}
          onDraftToast={triggerToast}
        />
      )}

      {/* Features 3, 4, 6, 7: Tozo's Field Guide (Collapsible Briefing + Verified Facts + Collar Tag Score) */}
      {report.briefing && (
        <RepoBriefingCard 
          briefing={report.briefing} 
          repoName={report.repo_name} 
          contributionFriendliness={report.contribution_friendliness}
        />
      )}

      {/* Pipeline Warnings Notice */}
      {warnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-amber-200">
          <div className="flex items-center space-x-2 font-semibold text-xs uppercase tracking-wider mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-collar" />
            <span>Pipeline Execution Notices ({warnings.length})</span>
          </div>
          <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
            {warnings.map((warn, idx) => (
              <li key={idx}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary Metric Strip with CountUp */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Issues"
          value={report.total_issues}
          subtitle="Across all 11 categories"
          icon={Layers}
          color="brand"
          active={selectedCategory === 'all'}
          onClick={() => setSelectedCategory('all')}
        />
        <MetricCard
          title="High Severity"
          value={highSeverityCount}
          subtitle="Critical fixes needed"
          icon={AlertTriangle}
          color="rose"
          active={selectedSeverity === 'high'}
          onClick={() => setSelectedSeverity(selectedSeverity === 'high' ? 'all' : 'high')}
        />
        <MetricCard
          title="Bugs & Logic"
          value={categories.bug?.length || 0}
          subtitle="Logic & syntax flaws"
          icon={Bug}
          color="amber"
          active={selectedCategory === 'bug'}
          onClick={() => setSelectedCategory('bug')}
        />
        <MetricCard
          title="Backend & DB"
          value={categories.backend?.length || 0}
          subtitle="Queries & endpoints"
          icon={Server}
          color="indigo"
          active={selectedCategory === 'backend'}
          onClick={() => setSelectedCategory('backend')}
        />
        <MetricCard
          title="CI/CD & Deploy"
          value={(categories.cicd?.length || 0) + (categories.deployment?.length || 0)}
          subtitle="Workflows & Docker"
          icon={GitBranch}
          color="emerald"
          active={selectedCategory === 'cicd' || selectedCategory === 'deployment'}
          onClick={() => setSelectedCategory('cicd')}
        />
      </div>

      {/* Filters, Sort & Search Toolbar */}
      <div className="rounded-3xl p-5 border border-slate-700/60 bg-dusk-surface/90 space-y-4 shadow-md">
        {/* Category Tabs with Thematic Subtitles */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Filter by Taxonomy Domain:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((tab) => {
              const Icon = tab.icon;
              const count = tab.id === 'all' ? report.total_issues : (categories[tab.id]?.length || 0);
              const isSelected = selectedCategory === tab.id;
              const issuesInCat = tab.id === 'all' ? allIssues : (categories[tab.id] || []);
              const themeSubtitle = getCategoryThematicSummary(issuesInCat, tab.defaultTheme);

              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-collar/50 ${
                    isSelected
                      ? 'bg-amber-collar text-dusk-base border-amber-collar font-bold shadow-md scale-105'
                      : 'text-slate-300 hover:text-white bg-dusk-base/70 border-slate-800 hover:border-slate-700'
                  }`}
                  title={`${tab.label} — ${themeSubtitle}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-dusk-base' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-dusk-base text-amber-collar' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Controls Row: Search Input, Severity Filter, and Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-slate-800">
          {/* Live Search Input with Accessible Label */}
          <div className="relative flex-1 max-w-md">
            <label htmlFor="issue-search-input" className="sr-only">
              Search file, function, or suggested fix
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="issue-search-input"
              type="text"
              placeholder="Search by file name, keyword, or fix..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 bg-dusk-base border border-slate-700/80 rounded-xl text-xs text-cream-text placeholder-slate-400 focus:outline-none focus:border-amber-collar focus:ring-2 focus:ring-amber-collar/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Severity Filter */}
            <div className="flex items-center space-x-1.5">
              <label htmlFor="severity-select" className="text-xs font-semibold text-slate-400">
                Severity:
              </label>
              <select
                id="severity-select"
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-dusk-base border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-collar"
              >
                <option value="all">All Severities</option>
                <option value="high">High Severity Only</option>
                <option value="medium">Medium Severity Only</option>
                <option value="low">Low Severity Only</option>
              </select>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center space-x-1.5">
              <label htmlFor="sort-select" className="text-xs font-semibold text-slate-400 flex items-center space-x-1">
                <ArrowUpDown className="w-3 h-3 text-amber-collar" />
                <span>Sort:</span>
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-dusk-base border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-collar font-mono"
              >
                <option value="severity">By Severity</option>
                <option value="file">By File Path</option>
                <option value="category">By Category</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Issues Feed */}
      <div className="space-y-4">
        {filteredIssues.length > 0 ? (
          filteredIssues.map((issue, idx) => (
            <IssueCard 
              key={`${issue.full_path || issue.file}-${issue.line_start}-${idx}`} 
              issue={issue} 
              onDraftToast={triggerToast}
            />
          ))
        ) : (
          <div className="rounded-3xl p-12 text-center border border-slate-700/60 bg-dusk-surface/80">
            <div className="flex justify-center mb-3">
              <TozoMascot pose="proud" size={60} speechText="No issues matching your filters!" />
            </div>
            <h3 className="text-lg font-bold text-cream-text">Trail Clear of Matching Issues</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              {allIssues.length === 0
                ? "This repository passed all static checks, specialized audits, and AI reasoning with zero defects!"
                : "No issues match your current filters. Try selecting 'All Issues' or clearing your search filter."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
