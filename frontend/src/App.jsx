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
import MySpaceView from './components/MySpaceView';
import { checkHealth, fetchSampleRepos, startAnalysis, pollJob, fetchScorecard } from './api';
import { getTozoBark } from './data/tozoBarks';
import { addTrackedHistory } from './services/auth';

export default function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | report | error
  const [activeTab, setActiveTab] = useState('home'); // home | myspace
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
          addTrackedHistory(cachedReport);
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
        addTrackedHistory(finalJob);
        setState('report');
        return;
      }

      // Poll background worker until completion
      const completedReport = await pollJob(jobId, (progress) => {
        setJobStatus(progress);
      });

      setReport(completedReport);
      addTrackedHistory(completedReport);
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

  const handleAnalyzeFromSpace = (url) => {
    setRepoUrl(url);
    executeAnalysis(url, false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-dusk-base text-cream-text font-sans">
      <Navbar 
        backendStatus={backendHealth} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onReset={handleReset} 
      />

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

        {/* My Space View State */}
        {state === 'idle' && activeTab === 'myspace' && (
          <MySpaceView onAnalyzeRepo={handleAnalyzeFromSpace} />
        )}

        {/* Idle / Landing Page State */}
        {state === 'idle' && activeTab === 'home' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
            {/* Hero Section */}
            <div className="text-center space-y-6 animate-hero-settle">
              {/* Mascot & Friendly Speech Bubble */}
              <div className="flex flex-col items-center justify-center mb-2">
                <div className="p-4 rounded-3xl glass-panel relative shadow-2xl">
                  <TozoMascot 
                    pose={useSpriteMode ? "sprite-wag" : "ready"} 
                    mood="excited"
                    useSprite={useSpriteMode}
                    speechText={heroBark}
                    size={96}
                    className="hover:scale-105 transition-transform"
                  />
                </div>

                {/* 2D Sprite Motion Toggle */}
                <button
                  type="button"
                  onClick={() => setUseSpriteMode(!useSpriteMode)}
                  className="mt-3.5 inline-flex items-center space-x-1.5 px-3.5 py-1.2 rounded-full text-[11px] font-semibold bg-dusk-surface/80 hover:bg-dusk-surface text-amber-collar border border-amber-collar/30 transition-all cursor-pointer shadow-sm hover:scale-105"
                  title="Toggle between Vector and 2D Game Sprite Mode"
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>{useSpriteMode ? "2D Dog Sprite Active (Click for Vector)" : "Switch to 2D Dog Sprite Mode"}</span>
                </button>
              </div>

              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-collar/15 border border-amber-collar/35 text-amber-collar text-xs font-bold tracking-wide uppercase shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Reasoning + Instant Code AST Engine</span>
              </div>
              
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-cream-text font-display tracking-tight leading-[1.1]">
                Find Your Way Through <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-500 bg-clip-text text-transparent">
                  Any Codebase
                </span>
              </h1>

              <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
                Tozo walks alongside open-source contributors. Uncover starter tasks, track commit drift, inspect verified facts, and draft maintainer-ready fixes.
              </p>
            </div>

            {/* Input Search Form Container */}
            <div className="mt-10 max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="p-3.5 sm:p-4 rounded-3xl glass-panel glow-focus shadow-2xl relative">
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
                      className="w-full pl-12 pr-4 py-3.5 bg-dusk-base/90 border border-slate-700/80 rounded-2xl text-sm text-cream-text placeholder-slate-400 focus:outline-none focus:border-amber-collar transition-all font-mono shadow-inner"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-amber-collar hover:bg-amber-400 text-dusk-base font-extrabold text-sm shadow-xl hover:shadow-amber-collar/25 transition-all flex items-center justify-center space-x-2 shrink-0 group cursor-pointer"
                  >
                    <span>Sniff Out Issues</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                {urlError && (
                  <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center space-x-2 animate-hero-settle">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{urlError}</span>
                  </div>
                )}
              </form>

              {/* Guardrails note */}
              <div className="mt-3.5 flex items-center justify-center space-x-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-moss-trail" />
                <span>Shallow clone (depth=1) • Public GitHub repositories up to 50MB</span>
              </div>

              {/* Sample Repositories Chips */}
              {sampleRepos.length > 0 && (
                <div className="mt-8">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block text-center mb-3.5">
                    Or pick a trail to explore:
                  </span>
                  <div className="flex flex-wrap justify-center gap-2.5">
                    {sampleRepos.map((sample) => (
                      <button
                        key={sample.url}
                        onClick={() => handleSelectSample(sample.url)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-dusk-surface/80 hover:bg-dusk-surface text-slate-200 hover:text-amber-collar border border-slate-700/60 hover:border-amber-collar/50 transition-all flex items-center space-x-2 shadow-sm cursor-pointer hover:scale-105"
                      >
                        <Compass className="w-3.5 h-3.5 text-amber-collar" />
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
              {/* Beat 1: Freshness & Drift */}
              <div className="dusk-card dusk-card-interactive p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-amber-collar/15 text-amber-collar border border-amber-collar/30 flex items-center justify-center shadow-inner">
                      <GitCommit className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      +3 resolved, 0 added
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-cream-text font-display">1. Freshness &amp; Drift</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Track code drift across git commits. Know exactly what new defects were introduced and celebrate resolved ones with SQLite history.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-amber-collar">
                  <span>Short SHA Diff</span>
                  <span className="text-slate-500">HEAD vs Baseline</span>
                </div>
              </div>

              {/* Beat 2: Fetch List for Newcomers */}
              <div className="dusk-card dusk-card-interactive p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-moss-trail/15 text-moss-trail border border-moss-trail/30 flex items-center justify-center shadow-inner">
                      <Heart className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-collar/15 text-amber-collar border border-amber-collar/30">
                      8 treats curated
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-cream-text font-display">2. Tozo's Fetch List</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Curated low-risk tasks for first-time contributors. Typos, docstrings, and quick lint fixes with reasons explaining why each is beginner-friendly.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-moss-trail">
                  <span>Draft-a-PR Ready</span>
                  <span className="text-slate-500">14-Point Issue</span>
                </div>
              </div>

              {/* Beat 3: Verified Ground Truth */}
              <div className="dusk-card dusk-card-interactive p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-clay-rust/15 text-clay-rust border border-clay-rust/30 flex items-center justify-center shadow-inner">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      100% verified facts
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-cream-text font-display">3. Ground Truth Facts</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Deterministic checks for tests, CI workflows, and CONTRIBUTING.md guidelines separated from AI architectural reasoning.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-clay-rust">
                  <span>Permalinks</span>
                  <span className="text-slate-500">Source Lines</span>
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
