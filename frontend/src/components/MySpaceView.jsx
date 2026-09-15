import React, { useState, useEffect } from 'react';
import { 
  Github, 
  Sparkles, 
  ArrowRight, 
  Search, 
  Star, 
  GitPullRequest, 
  LogOut, 
  ShieldCheck, 
  Key, 
  Clock, 
  CheckCircle2, 
  ExternalLink,
  Compass,
  FileCode,
  FolderGit2,
  RefreshCw,
  UserCheck,
  Smartphone,
  Lock,
  ChevronDown,
  ChevronUp,
  Info,
  Layers
} from 'lucide-react';
import TozoMascot from './TozoMascot';
import { 
  getCurrentUser, 
  getGithubAuthConfig,
  redirectToGithubOAuth,
  handleOAuthCallback,
  startGithubDeviceFlow,
  pollGithubDeviceFlow,
  loginWithGithubUsername, 
  loginWithGithubToken, 
  fetchUserRepositories, 
  logoutUser, 
  getTrackedHistory 
} from '../services/auth';

export default function MySpaceView({ onAnalyzeRepo }) {
  const [user, setUser] = useState(null);
  const [authConfig, setAuthConfig] = useState({ oauth_enabled: false, client_id: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Secondary manual sign-in toggle
  const [showManualOptions, setShowManualOptions] = useState(false);
  const [manualMode, setManualMode] = useState('username'); // 'username' | 'token'
  const [usernameInput, setUsernameInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');

  // Device flow modal state
  const [deviceFlowData, setDeviceFlowData] = useState(null);
  const [devicePolling, setDevicePolling] = useState(false);
  const [deviceTimer, setDeviceTimer] = useState(0);

  // Authenticated workspace data
  const [repositories, setRepositories] = useState([]);
  const [repoSearch, setRepoSearch] = useState('');
  const [trackedHistory, setTrackedHistory] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('repos'); // 'repos' | 'history'

  // 1. Initial Mount: Load session, OAuth config, and handle OAuth callback (?code=...)
  useEffect(() => {
    async function initAuth() {
      // Check existing session
      const existingUser = getCurrentUser();
      if (existingUser) {
        setUser(existingUser);
        loadUserRepos(existingUser.username);
      }
      setTrackedHistory(getTrackedHistory());

      // Fetch GitHub OAuth configuration from backend
      const cfg = await getGithubAuthConfig();
      setAuthConfig(cfg);

      // Check if URL has ?code= from GitHub OAuth redirect
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      if (code) {
        // Clean URL cleanly without reload
        window.history.replaceState({}, document.title, window.location.pathname);
        processOAuthCallback(code);
      }
    }

    initAuth();
  }, []);

  // Process OAuth Callback Code from GitHub
  const processOAuthCallback = async (code) => {
    setIsLoading(true);
    setLoadingText('🐾 Verifying GitHub credentials with your 2-digit confirmation...');
    setErrorMsg('');
    try {
      const result = await handleOAuthCallback(code);
      setUser(result.user);
      setRepositories(result.repositories);
    } catch (err) {
      setErrorMsg(err.message || 'GitHub authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  // Load User Repositories
  const loadUserRepos = async (username) => {
    setIsLoading(true);
    setLoadingText('🐾 Sniffing out your repositories...');
    try {
      const repos = await fetchUserRepositories(username);
      setRepositories(repos);
    } catch (err) {
      console.error("Failed to load user repos:", err);
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  // 1-Click Main "Continue with GitHub" button handler
  const handleOneClickGithubLogin = async () => {
    setErrorMsg('');
    setIsLoading(true);
    setLoadingText('Connecting to GitHub...');

    try {
      // Fetch latest config dynamically
      const cfg = await getGithubAuthConfig();
      setAuthConfig(cfg);

      const clientId = cfg.client_id || 'Ov23li3wozYY6QgyE2zy';

      if (cfg.oauth_enabled || clientId) {
        // Direct Web OAuth Redirect Flow (triggers 2-digit mobile verification)
        redirectToGithubOAuth(clientId);
        return;
      }

      // Fallback: Device flow
      const flow = await startGithubDeviceFlow();
      setDeviceFlowData(flow);
      setDevicePolling(true);
      setDeviceTimer(flow.expires_in || 900);
    } catch (err) {
      setShowManualOptions(true);
      setErrorMsg('Could not connect to GitHub OAuth. Please try signing in with your username or token below.');
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  // Device flow polling effect
  useEffect(() => {
    let pollInterval;
    if (devicePolling && deviceFlowData?.device_code) {
      pollInterval = setInterval(async () => {
        try {
          const res = await pollGithubDeviceFlow(deviceFlowData.device_code);
          if (res.status === 'success') {
            clearInterval(pollInterval);
            setDevicePolling(false);
            setDeviceFlowData(null);
            setUser(res.user);
            setRepositories(res.repositories);
          } else if (res.status === 'expired' || res.status === 'error') {
            clearInterval(pollInterval);
            setDevicePolling(false);
            setErrorMsg(res.message || 'Verification session expired. Please try again.');
          }
        } catch (err) {
          console.error("Device poll error:", err);
        }
      }, (deviceFlowData.interval || 5) * 1000);
    }

    return () => clearInterval(pollInterval);
  }, [devicePolling, deviceFlowData]);

  // Handle Manual Username Login
  const handleUsernameLogin = async (e) => {
    if (e) e.preventDefault();
    if (!usernameInput.trim()) {
      setErrorMsg('Please enter your GitHub username.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    setLoadingText('🐾 Fetching your GitHub profile & repositories...');

    try {
      const result = await loginWithGithubUsername(usernameInput);
      setUser(result.user);
      setRepositories(result.repositories);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to connect GitHub account.');
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  // Handle Token Login
  const handleTokenLogin = async (e) => {
    if (e) e.preventDefault();
    if (!tokenInput.trim()) {
      setErrorMsg('Please enter a valid GitHub access token.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    setLoadingText('🐾 Verifying GitHub Personal Access Token...');

    try {
      const result = await loginWithGithubToken(tokenInput);
      setUser(result.user);
      setRepositories(result.repositories);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to verify GitHub token.');
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setRepositories([]);
    setErrorMsg('');
  };

  // Filter repositories by search query
  const filteredRepos = repositories.filter(repo => {
    const term = repoSearch.toLowerCase();
    return (
      repo.name.toLowerCase().includes(term) ||
      (repo.description && repo.description.toLowerCase().includes(term)) ||
      (repo.language && repo.language.toLowerCase().includes(term))
    );
  });

  // ==========================================
  // VIEW 1: UNAUTHENTICATED STATE (Login Landing)
  // ==========================================
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Card */}
        <div className="bg-dusk-surface border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden text-center">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-collar/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-moss-trail/10 rounded-full blur-3xl pointer-events-none" />

          {/* Dog Mascot Avatar */}
          <div className="relative inline-block mx-auto mb-6">
            <div className="w-24 h-24 rounded-3xl bg-dusk-card border-2 border-amber-collar/40 flex items-center justify-center shadow-xl shadow-amber-collar/10 mx-auto">
              <TozoMascot pose="reading" className="w-16 h-16" />
            </div>
            <div className="absolute -top-2 -right-2 bg-amber-collar text-dusk-base p-1.5 rounded-full shadow-md">
              <Github className="w-4 h-4" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-cream-text font-display tracking-tight mb-3">
            Sign In with GitHub
          </h1>
          <p className="text-slate-400 text-base max-w-xl mx-auto mb-8">
            Experience 1-click seamless GitHub authentication with instant 2-digit mobile verification. Auto-discover all your repositories, inspect health metrics, and launch 1-click code audits.
          </p>

          {/* Error Message */}
          {errorMsg && (
            <div className="max-w-md mx-auto mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center space-x-2 text-left">
              <Info className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary 1-Click Action Button */}
          <div className="max-w-md mx-auto space-y-4">
            <button
              onClick={handleOneClickGithubLogin}
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-collar to-amber-500 text-dusk-base font-extrabold text-base flex items-center justify-center space-x-3 shadow-lg shadow-amber-collar/20 hover:shadow-amber-collar/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              <Github className="w-5 h-5 fill-current" />
              <span>{isLoading ? (loadingText || 'Authenticating...') : 'Continue with GitHub'}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            {/* Verification Badge */}
            <div className="flex items-center justify-center space-x-2 text-xs text-slate-400">
              <Smartphone className="w-3.5 h-3.5 text-amber-collar" />
              <span>Verified with standard 2-digits prompt on GitHub Mobile</span>
            </div>
          </div>

          {/* Device Code Popup / Modal if active */}
          {deviceFlowData && (
            <div className="mt-8 max-w-md mx-auto p-6 rounded-2xl bg-dusk-card border border-amber-collar/40 shadow-xl text-left">
              <div className="flex items-center space-x-2 text-amber-collar font-bold text-sm mb-2">
                <Smartphone className="w-4 h-4" />
                <span>GitHub Mobile / Device Confirmation</span>
              </div>
              <p className="text-xs text-slate-300 mb-4">
                Open GitHub and enter this verification code to confirm sign-in:
              </p>
              <div className="bg-dusk-base p-4 rounded-xl border border-slate-700 text-center mb-4">
                <span className="font-mono text-2xl font-black text-amber-collar tracking-widest">
                  {deviceFlowData.user_code}
                </span>
              </div>
              <a
                href={deviceFlowData.verification_uri || "https://github.com/login/device"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cream-text text-xs font-bold flex items-center justify-center space-x-2 border border-slate-700"
              >
                <span>Open GitHub Verification Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <p className="text-[11px] text-slate-500 text-center mt-3 animate-pulse">
                🐾 Waiting for your confirmation on phone/browser...
              </p>
            </div>
          )}

          {/* Expandable Manual / Quick Connect Options */}
          <div className="mt-10 pt-6 border-t border-slate-800/80 max-w-md mx-auto">
            <button
              onClick={() => setShowManualOptions(!showManualOptions)}
              className="text-xs text-slate-400 hover:text-amber-collar flex items-center justify-center space-x-1 mx-auto transition-colors cursor-pointer"
            >
              <span>{showManualOptions ? 'Hide alternative sign-in options' : 'Or quick sign-in with username / token'}</span>
              {showManualOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showManualOptions && (
              <div className="mt-5 p-5 rounded-2xl bg-dusk-card/70 border border-slate-800 text-left space-y-4">
                <div className="flex items-center bg-dusk-base p-1 rounded-xl border border-slate-700/80 text-xs font-semibold">
                  <button
                    onClick={() => setManualMode('username')}
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                      manualMode === 'username' ? 'bg-amber-collar text-dusk-base font-bold' : 'text-slate-400'
                    }`}
                  >
                    GitHub Username
                  </button>
                  <button
                    onClick={() => setManualMode('token')}
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                      manualMode === 'token' ? 'bg-amber-collar text-dusk-base font-bold' : 'text-slate-400'
                    }`}
                  >
                    Personal Access Token
                  </button>
                </div>

                {manualMode === 'username' ? (
                  <form onSubmit={handleUsernameLogin} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        GitHub Username
                      </label>
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="e.g. Amrit-raj50 or octocat"
                        className="w-full bg-dusk-base border border-slate-700 rounded-xl px-3.5 py-2.5 text-cream-text text-xs focus:outline-none focus:border-amber-collar"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cream-text font-bold text-xs flex items-center justify-center space-x-2 border border-slate-700 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4 text-amber-collar" />
                      <span>Connect Username</span>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleTokenLogin} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        GitHub Personal Access Token (PAT)
                      </label>
                      <input
                        type="password"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        className="w-full bg-dusk-base border border-slate-700 rounded-xl px-3.5 py-2.5 text-cream-text text-xs focus:outline-none focus:border-amber-collar"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cream-text font-bold text-xs flex items-center justify-center space-x-2 border border-slate-700 cursor-pointer"
                    >
                      <Key className="w-4 h-4 text-amber-collar" />
                      <span>Authenticate Token</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Feature Highlights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          <div className="bg-dusk-surface/80 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-amber-collar/15 border border-amber-collar/30 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5 text-amber-collar" />
            </div>
            <h3 className="text-cream-text font-bold text-sm mb-1.5">Auto-Discovered Repos</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Instantly discover all public and private repositories under your GitHub account without typing URLs.
            </p>
          </div>

          <div className="bg-dusk-surface/80 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-moss-trail/15 border border-moss-trail/30 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-moss-trail" />
            </div>
            <h3 className="text-cream-text font-bold text-sm mb-1.5">1-Click Issue Sniffing</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Launch deep code scans, AST dependency tracing, and issue audits with a single click from your workspace.
            </p>
          </div>

          <div className="bg-dusk-surface/80 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5 text-sky-400" />
            </div>
            <h3 className="text-cream-text font-bold text-sm mb-1.5">Tracked Audit History</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Maintain an active scorecard log of all previous repository health ratings and contributor briefings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: AUTHENTICATED STATE (My Space Dashboard)
  // ==========================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* User Profile Banner */}
      <div className="bg-dusk-surface border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5 text-center sm:text-left">
            {/* User Avatar */}
            <div className="relative">
              <img
                src={user.avatar_url || 'https://github.com/identicons/tozo.png'}
                alt={user.username}
                className="w-20 h-20 rounded-2xl border-2 border-amber-collar/40 shadow-lg object-cover"
              />
              <div className="absolute -bottom-1 -right-1 bg-moss-trail w-5 h-5 rounded-full border-2 border-dusk-base flex items-center justify-center" title="Connected">
                <CheckCircle2 className="w-3.5 h-3.5 text-dusk-base font-black" />
              </div>
            </div>

            {/* User Details */}
            <div>
              <div className="flex items-center space-x-2 justify-center sm:justify-start">
                <h2 className="text-xl sm:text-2xl font-bold text-cream-text font-display">
                  {user.name || user.username}
                </h2>
                <a
                  href={user.html_url || `https://github.com/${user.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-amber-collar transition-colors"
                  title="View GitHub Profile"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <p className="text-xs text-amber-collar font-mono mt-0.5">@{user.username}</p>
              {user.bio && <p className="text-xs text-slate-400 mt-2 max-w-md line-clamp-2">{user.bio}</p>}

              {/* Stats badges */}
              <div className="flex items-center space-x-4 mt-3 text-xs text-slate-300">
                <div className="flex items-center space-x-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-amber-collar" />
                  <span><strong>{repositories.length}</strong> Repositories</span>
                </div>
                {user.followers !== undefined && (
                  <div className="flex items-center space-x-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-moss-trail" />
                    <span><strong>{user.followers}</strong> Followers</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadUserRepos(user.username)}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white transition-all cursor-pointer"
              title="Refresh Repositories"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-collar' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs: Repositories vs Audit History */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab('repos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'repos'
                ? 'bg-amber-collar text-dusk-base shadow-sm'
                : 'text-slate-400 hover:text-white bg-dusk-surface/60 border border-slate-800'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>My Repositories ({repositories.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'history'
                ? 'bg-amber-collar text-dusk-base shadow-sm'
                : 'text-slate-400 hover:text-white bg-dusk-surface/60 border border-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Audit History ({trackedHistory.length})</span>
          </button>
        </div>

        {/* Search Input for Repositories */}
        {activeSubTab === 'repos' && (
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={repoSearch}
              onChange={(e) => setRepoSearch(e.target.value)}
              placeholder="Search your repos..."
              className="w-full bg-dusk-surface border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-cream-text focus:outline-none focus:border-amber-collar"
            />
          </div>
        )}
      </div>

      {/* SUB-VIEW 1: REPOSITORIES GRID */}
      {activeSubTab === 'repos' && (
        <>
          {isLoading && repositories.length === 0 ? (
            <div className="py-16 text-center">
              <TozoMascot pose="sniffing" className="w-14 h-14 mx-auto mb-3 animate-bounce" />
              <p className="text-xs text-slate-400">🐾 Sniffing out your GitHub repositories...</p>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="py-16 text-center bg-dusk-surface/40 rounded-2xl border border-slate-800">
              <FolderGit2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-cream-text">No repositories found</p>
              <p className="text-xs text-slate-400 mt-1">
                {repoSearch ? 'Try a different search term.' : 'No public repositories found for this account.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRepos.map((repo) => (
                <div
                  key={repo.id || repo.name}
                  className="bg-dusk-surface border border-slate-800 rounded-2xl p-5 hover:border-amber-collar/40 transition-all flex flex-col justify-between group shadow-md hover:shadow-xl"
                >
                  <div>
                    {/* Repo Title & Link */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-2 truncate">
                        <FolderGit2 className="w-4 h-4 text-amber-collar shrink-0" />
                        <h4 className="font-bold text-sm text-cream-text truncate group-hover:text-amber-collar transition-colors">
                          {repo.name}
                        </h4>
                      </div>
                      <a
                        href={repo.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-slate-300 p-1"
                        title="View on GitHub"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                      {repo.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Metadata & 1-Click Scan Button */}
                  <div>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 mb-4 pb-3 border-b border-slate-800/80">
                      {repo.language && (
                        <span className="flex items-center space-x-1">
                          <span className="w-2 h-2 rounded-full bg-amber-collar" />
                          <span>{repo.language}</span>
                        </span>
                      )}
                      <span className="flex items-center space-x-1">
                        <Star className="w-3 h-3 text-amber-400" />
                        <span>{repo.stars}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <GitPullRequest className="w-3 h-3 text-moss-trail" />
                        <span>{repo.open_issues} issues</span>
                      </span>
                    </div>

                    {/* 1-Click Audit Trigger */}
                    <button
                      onClick={() => onAnalyzeRepo && onAnalyzeRepo(repo.repo_url)}
                      className="w-full py-2 px-3.5 rounded-xl bg-amber-collar/15 hover:bg-amber-collar text-amber-collar hover:text-dusk-base font-bold text-xs flex items-center justify-center space-x-2 border border-amber-collar/30 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Sniff Out Issues</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* SUB-VIEW 2: AUDIT HISTORY */}
      {activeSubTab === 'history' && (
        <div>
          {trackedHistory.length === 0 ? (
            <div className="py-16 text-center bg-dusk-surface/40 rounded-2xl border border-slate-800">
              <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-cream-text">No audit history yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Scan your first repository from the "My Repositories" tab or Explore page!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trackedHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-dusk-surface border border-slate-800 rounded-2xl p-5 flex items-center justify-between hover:border-slate-700 transition-all"
                >
                  <div className="truncate pr-4">
                    <h4 className="font-bold text-sm text-cream-text truncate">{item.repo_name}</h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{item.repo_url}</p>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-2">
                      <span>Issues: <strong>{item.total_issues}</strong></span>
                      <span>Score: <strong className="text-moss-trail">{item.score}/100</strong></span>
                      <span>Scanned: {new Date(item.scanned_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onAnalyzeRepo && onAnalyzeRepo(item.repo_url)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-amber-collar text-slate-200 hover:text-dusk-base text-xs font-bold flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer border border-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-scan</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
