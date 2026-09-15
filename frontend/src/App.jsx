import React, { useState, useEffect } from 'react';
import { 
  Github, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  Compass, 
  GitCommit, 
  Heart,
  FileCheck,
  Gamepad2
} from 'lucide-react';
import Navbar from './components/Navbar';
import ScanProgressTrail from './components/ScanProgressTrail';
import ReportView from './components/ReportView';
import ErrorState from './components/ErrorState';
import TozoMascot from './components/TozoMascot';
import PawTrail from './components/PawTrail';
import { checkHealth, fetchSampleRepos, startAnalysis, pollJob, fetchScorecard } from './api';
import { getTozoBark } from './data/tozoBarks';

export default function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | report | error
  const [jobStatus, setJobStatus] = useState(null);
  const [report, setReport] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [backendHealth, setBackendHealth] = useState(null);
  const [sampleRepos, setSampleRepos] = useState([]);
  const [isRescanning, setIsRescanning] = useState(false);
  const [useSpriteMode, setUseSpriteMode] = useState(false);
  const [heroBark, setHeroBark] = useState("Got a repo? Let's go sniff it out.");

  // Initialize and check for /scorecard/:owner/:repo route
  useEffect(() => {
    async function init() {
      const health = await checkHealth();
      setBackendHealth(health);
      const samples = await fetchSampleRepos();
      setSampleRepos(samples);

      // Check if URL matches /scorecard/:owner/:repo
      const path = window.location.pathname;
      const match = path.match(/^\/scorecard\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);
      if (match) {
        const [, owner, repo] = match;
        try {
          setState('loading');
          setJobStatus({ status: 'scanning', stage_message: `Loading scorecard for ${owner}/${repo}...`, progress_percent: 50 });
          const cachedReport = await fetchScorecard(owner, repo);
          setReport(cachedReport);
          setState('report');
        } catch (err) {
          setErrorMessage(err.message || `No cached scorecard found for ${owner}/${repo}.`);
          setState('error');
        }
      }
    }
    init();
  }, []);

  // Validate URL format
  const validateUrl = (url) => {
    const cleaned = url.trim();
    if (!cleaned) {
      return 'Please enter a GitHub repository URL.';
    }
    if (!cleaned.startsWith('https://github.com/') && !cleaned.startsWith('http://github.com/')) {
      return 'URL must start with https://github.com/';
    }
    if (cleaned.includes('/tree/') || cleaned.includes('/blob/')) {
      return 'Please provide the root repository URL (e.g. https://github.com/owner/repo), not a subfolder or branch.';
    }
    return '';
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setRepoUrl(val);
    if (urlError) {
      setUrlError('');
    }
    if (val.trim().length > 15) {
      setHeroBark("Ooh, new scent. Ready when you are.");
    }
  };

  const executeAnalysis = async (targetUrl, forceRescan = false) => {
    setUrlError('');
    setErrorMessage('');
    setState('loading');
    setJobStatus({ 
      status: 'queued', 
      stage_message: forceRescan ? 'Re-scanning repository for commit changes...' : 'Tozo is preparing to explore the trail...', 
      progress_percent: 5 
    });

    try {
      const startRes = await startAnalysis(targetUrl.trim(), forceRescan);
      const jobId = startRes.job_id;

      // If already served from cache
      if (startRes.status === 'completed') {
        const finalJob = await pollJob(jobId, (progress) => setJobStatus(progress), 300);
        setReport(finalJob);
        setState('report');
        return;
      }

      // Poll background worker until completion
      const completedReport = await pollJob(jobId, (progress) => {
        setJobStatus(progress);
      });

      setReport(completedReport);
      setState('report');
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred during repository analysis.');
      setState('error');
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const error = validateUrl(repoUrl);
    if (error) {
      setUrlError(error);
      return;
    }
    executeAnalysis(repoUrl, false);
  };

  const handleRescan = async () => {
    if (!report?.repo_url) return;
    setIsRescanning(true);
    try {
      await executeAnalysis(report.repo_url, true);
    } finally {
      setIsRescanning(false);
    }
  };

  const handleSelectSample = (url) => {
    setRepoUrl(url);
    setUrlError('');
    setHeroBark("Ooh, good trail choice! Ready when you are.");
  };

  const handleReset = () => {
    setState('idle');
    setReport(null);
    setJobStatus(null);
    setErrorMessage('');
    setHeroBark("Got a repo? Let's go sniff it out.");
    if (window.location.pathname.startsWith('/scorecard')) {
      window.history.pushState({}, '', '/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-dusk-base text-cream-text font-sans">
      <Navbar backendStatus={backendHealth} onReset={handleReset} />

      <main className="flex-1">
        {/* Loading State: Interactive Waypoint Trail with Walking Tozo */}
        {state === 'loading' && (
          <ScanProgressTrail jobStatus={jobStatus} repoUrl={repoUrl} />
        )}

        {/* Report View */}
        {state === 'report' && report && (
          <ReportView 
            report={report} 
            onReset={handleReset} 
            onRescan={handleRescan}
            isRescanning={isRescanning}
          />
        )}

        {/* Error State */}
        {state === 'error' && (
          <ErrorState error={errorMessage} onReset={handleReset} />
        )}

        {/* Idle / Landing Page State */}
        {state === 'idle' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            {/* Hero Section */}
            <div className="text-center space-y-5 animate-hero-settle">
              {/* Mascot & Friendly Speech Bubble */}
              <div className="flex flex-col items-center justify-center mb-2">
                <div className="p-3.5 rounded-3xl bg-dusk-surface/90 border border-slate-700/60 shadow-xl relative">
                  <TozoMascot 
                    pose={useSpriteMode ? "sprite-wag" : "ready"} 
                    mood="excited"
                    useSprite={useSpriteMode}
                    speechText={heroBark}
                    size={90}
                    className="hover:scale-105 transition-transform"
                  />
                </div>

                {/* 2D Sprite Motion Toggle */}
                <button
                  type="button"
                  onClick={() => setUseSpriteMode(!useSpriteMode)}
                  className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-dusk-surface/80 hover:bg-dusk-surface text-amber-collar border border-amber-collar/30 transition-all cursor-pointer shadow-sm"
                  title="Toggle between Vector and 2D Game Sprite Mode"
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>{useSpriteMode ? "2D Dog Sprite Active (Click for Vector)" : "Switch to 2D Dog Sprite"}</span>
                </button>
              </div>

              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-collar/15 border border-amber-collar/30 text-amber-collar text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Reasoning + Instant Static Code Heuristics</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-cream-text font-display tracking-tight leading-tight">
                Find Your Way Through <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-amber-collar via-moss-trail to-clay-rust bg-clip-text text-transparent">
                  Any Codebase
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
                Tozo guides you through open-source repositories. Discover high-leverage starter tasks, commit freshness drift, verified facts, and actionable code fixes.
              </p>
            </div>

            {/* Input Search Form */}
            <div className="mt-10">
              <form onSubmit={handleSubmit} className="p-3 sm:p-4 rounded-3xl border border-slate-700/70 bg-dusk-surface/90 shadow-2xl backdrop-blur-md relative">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <label htmlFor="repo-url-input" className="sr-only">
                      GitHub Repository URL
                    </label>
                    <Github className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="repo-url-input"
                      type="url"
                      placeholder="https://github.com/owner/repository"
                      value={repoUrl}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-dusk-base/90 border border-slate-700/80 rounded-2xl text-sm text-cream-text placeholder-slate-400 focus:outline-none focus:border-amber-collar focus:ring-2 focus:ring-amber-collar/20 transition-all font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-amber-collar hover:bg-amber-400 text-dusk-base font-bold text-sm shadow-lg hover:shadow-amber-collar/20 transition-all flex items-center justify-center space-x-2 shrink-0 group cursor-pointer"
                  >
                    <span>Sniff Out Issues</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {urlError && (
                  <div className="mt-3 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{urlError}</span>
                  </div>
                )}
              </form>

              {/* Guardrails note */}
              <div className="mt-3 flex items-center justify-center space-x-2 text-xs text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-moss-trail" />
                <span>Safe shallow cloning (depth=1) • Public GitHub repositories up to 50MB</span>
              </div>

              {/* Sample Repositories Chips */}
              {sampleRepos.length > 0 && (
                <div className="mt-8">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block text-center mb-3">
                    Or pick a trail to explore:
                  </span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {sampleRepos.map((sample) => (
                      <button
                        key={sample.url}
                        onClick={() => handleSelectSample(sample.url)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-dusk-surface/80 hover:bg-dusk-surface text-slate-200 hover:text-amber-collar border border-slate-700/60 hover:border-amber-collar/40 transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
                      >
                        <Compass className="w-3 h-3 text-amber-collar" />
                        <span>{sample.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Connecting Paw Trail */}
            <PawTrail />

            {/* Three Rhythmic Feature Beats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Beat 1: Freshness & Drift */}
              <div className="rounded-2xl p-6 border border-slate-700/60 bg-dusk-surface/80 shadow-md flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-collar/15 text-amber-collar border border-amber-collar/30 flex items-center justify-center mb-4">
                    <GitCommit className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-cream-text font-display">1. Freshness &amp; Drift</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Track code drift across git commits. Know exactly what new defects were introduced and celebrate resolved ones with SQLite scan history.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-amber-collar">
                  Short SHA + Line Drift
                </div>
              </div>

              {/* Beat 2: Fetch List for Newcomers */}
              <div className="rounded-2xl p-6 border border-slate-700/60 bg-dusk-surface/80 shadow-md flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-moss-trail/15 text-moss-trail border border-moss-trail/30 flex items-center justify-center mb-4">
                    <Heart className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-cream-text font-display">2. Tozo's Fetch List</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Curated low-risk tasks for first-time contributors. Typos, docstrings, and quick lint fixes with reasons explaining why each is beginner-friendly.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-moss-trail">
                  Draft-a-PR Ready
                </div>
              </div>

              {/* Beat 3: Verified Ground Truth */}
              <div className="rounded-2xl p-6 border border-slate-700/60 bg-dusk-surface/80 shadow-md flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-clay-rust/15 text-clay-rust border border-clay-rust/30 flex items-center justify-center mb-4">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-cream-text font-display">3. Ground Truth Facts</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Deterministic checks for tests, CI workflows, and CONTRIBUTING.md guidelines separated from AI architectural reasoning.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-clay-rust">
                  Clickable Source Links
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-400">
        <p>Tozo • Code Companion for Developers • AI &amp; AST Engine</p>
      </footer>
    </div>
  );
}
