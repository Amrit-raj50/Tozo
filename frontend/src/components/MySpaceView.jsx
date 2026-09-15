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
  UserCheck
} from 'lucide-react';
import TozoMascot from './TozoMascot';
import { 
  getCurrentUser, 
  loginWithGithubUsername, 
  loginWithGithubToken, 
  fetchUserRepositories, 
  logoutUser, 
  getTrackedHistory 
} from '../services/auth';

export default function MySpaceView({ onAnalyzeRepo }) {
  const [user, setUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [loginMode, setLoginMode] = useState('username'); // 'username' | 'token'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [repositories, setRepositories] = useState([]);
  const [repoSearch, setRepoSearch] = useState('');
  const [trackedHistory, setTrackedHistory] = useState([]);

  // Check initial user session
  useEffect(() => {
    const existingUser = getCurrentUser();
    if (existingUser) {
      setUser(existingUser);
      loadUserRepos(existingUser.username);
    }
    setTrackedHistory(getTrackedHistory());
  }, []);

  const loadUserRepos = async (username) => {
    setIsLoading(true);
    try {
      const repos = await fetchUserRepositories(username);
      setRepositories(repos);
    } catch (err) {
      console.error("Failed to load user repos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameLogin = async (e) => {
    if (e) e.preventDefault();
    if (!usernameInput.trim()) {
      setErrorMsg('Please enter your GitHub username.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);

    try {
      const result = await loginWithGithubUsername(usernameInput);
      setUser(result.user);
      setRepositories(result.repositories);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to connect GitHub account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenLogin = async (e) => {
    if (e) e.preventDefault();
    if (!tokenInput.trim()) {
      setErrorMsg('Please enter a valid GitHub access token.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);

    try {
      const result = await loginWithGithubToken(tokenInput);
      setUser(result.user);
      setRepositories(result.repositories);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to verify GitHub token.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setRepositories([]);
    setUsernameInput('');
    setTokenInput('');
    setErrorMsg('');
  };

  const filteredRepos = repositories.filter(r => {
    const query = repoSearch.toLowerCase().trim();
    if (!query) return true;
    return (
      r.name.toLowerCase().includes(query) ||
      (r.description && r.description.toLowerCase().includes(query)) ||
      (r.language && r.language.toLowerCase().includes(query))
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10 animate-hero-settle">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-cream-text font-display tracking-tight">
              My Space
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-collar/15 text-amber-collar border border-amber-collar/30 uppercase tracking-wider">
              Personal Workspace
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-1.5 font-medium">
            Connect your GitHub account to track, monitor, and audit all of your personal repositories in one place.
          </p>
        </div>

        {user && (
          <button
            onClick={handleLogout}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all shadow-sm shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Disconnect Account</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STATE 1: NOT LOGGED IN — SHOW GITHUB LOGIN OPTION */}
      {/* ========================================================================= */}
      {!user ? (
        <div className="max-w-2xl mx-auto py-6">
          <div className="glass-panel p-8 sm:p-10 rounded-3xl text-center space-y-8 shadow-2xl relative overflow-hidden">
            {/* Top Amber Ambient Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-collar via-moss-trail to-clay-rust" />

            {/* Mascot Preview */}
            <div className="flex justify-center mb-2">
              <div className="p-3.5 rounded-3xl bg-dusk-base/90 border border-slate-700/60 shadow-xl">
                <TozoMascot 
                  pose="ready" 
                  mood="curious" 
                  speechText="Welcome to My Space! Connect your GitHub account to track your repos." 
                  size={84} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-cream-text font-display">
                Connect Your GitHub Account
              </h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Log in with your GitHub username or Personal Access Token to auto-discover all your public repositories and launch 1-click audits.
              </p>
            </div>

            {/* Login Mode Switcher */}
            <div className="flex justify-center">
              <div className="inline-flex rounded-xl bg-dusk-base p-1 border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setLoginMode('username')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    loginMode === 'username' 
                      ? 'bg-amber-collar text-dusk-base font-bold shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  GitHub Username
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMode('token')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    loginMode === 'token' 
                      ? 'bg-amber-collar text-dusk-base font-bold shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Access Token (Private Support)
                </button>
              </div>
            </div>

            {/* Username Login Form */}
            {loginMode === 'username' && (
              <form onSubmit={handleUsernameLogin} className="space-y-4 max-w-md mx-auto text-left">
                <div>
                  <label htmlFor="github-username" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Enter GitHub Username
                  </label>
                  <div className="relative">
                    <Github className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="github-username"
                      type="text"
                      placeholder="e.g. Amrit-raj50 or torvalds"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-dusk-base border border-slate-700/80 rounded-2xl text-sm text-cream-text placeholder-slate-400 focus:outline-none focus:border-amber-collar transition-all font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-2xl bg-amber-collar hover:bg-amber-400 text-dusk-base font-bold text-sm shadow-xl hover:shadow-amber-collar/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Fetching Your Repositories...</span>
                  ) : (
                    <>
                      <Github className="w-4 h-4 fill-current" />
                      <span>Connect GitHub Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Token Login Form */}
            {loginMode === 'token' && (
              <form onSubmit={handleTokenLogin} className="space-y-4 max-w-md mx-auto text-left">
                <div>
                  <label htmlFor="github-token" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    GitHub Personal Access Token
                  </label>
                  <div className="relative">
                    <Key className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="github-token"
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-dusk-base border border-slate-700/80 rounded-2xl text-sm text-cream-text placeholder-slate-400 focus:outline-none focus:border-amber-collar transition-all font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Requires <code className="text-amber-collar">repo</code> scope for private repositories. Token is stored only in local browser memory.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-2xl bg-amber-collar hover:bg-amber-400 text-dusk-base font-bold text-sm shadow-xl hover:shadow-amber-collar/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Verifying Token...</span>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Authenticate Token</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs text-left">
                {errorMsg}
              </div>
            )}

            {/* My Space Features Showcase */}
            <div className="pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left text-xs">
              <div className="p-3 rounded-xl bg-dusk-base/70 border border-slate-800/80 space-y-1">
                <div className="text-amber-collar font-bold flex items-center space-x-1">
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>Auto-Discovery</span>
                </div>
                <p className="text-slate-400 text-[11px]">Lists all your public repositories automatically in one place.</p>
              </div>

              <div className="p-3 rounded-xl bg-dusk-base/70 border border-slate-800/80 space-y-1">
                <div className="text-moss-trail font-bold flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>1-Click Audits</span>
                </div>
                <p className="text-slate-400 text-[11px]">Launch end-to-end 12-stage analysis on any of your repos instantly.</p>
              </div>

              <div className="p-3 rounded-xl bg-dusk-base/70 border border-slate-800/80 space-y-1">
                <div className="text-clay-rust font-bold flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Drift History</span>
                </div>
                <p className="text-slate-400 text-[11px]">Track historical issues added or resolved across your commit SHAs.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (

        /* ========================================================================= */
        /* STATE 2: LOGGED IN — MY SPACE DASHBOARD */
        /* ========================================================================= */
        <div className="space-y-8">
          {/* User Profile Banner */}
          <div className="glass-panel p-6 sm:p-7 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center space-x-4">
              <img
                src={user.avatar_url}
                alt={user.name || user.username}
                className="w-16 h-16 rounded-2xl border-2 border-amber-collar/40 shadow-md shrink-0"
              />
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-xl sm:text-2xl font-bold text-cream-text font-display">
                    {user.name || user.username}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-collar/15 text-amber-collar border border-amber-collar/30">
                    @{user.username}
                  </span>
                </div>
                {user.bio && (
                  <p className="text-xs text-slate-300 mt-1 max-w-lg line-clamp-1">{user.bio}</p>
                )}
                <div className="flex items-center space-x-3 mt-2 text-xs text-slate-400 font-mono">
                  <span>{user.public_repos || repositories.length} Public Repositories</span>
                  <span>•</span>
                  <a
                    href={user.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-collar hover:underline inline-flex items-center space-x-1"
                  >
                    <span>View GitHub Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => loadUserRepos(user.username)}
                disabled={isLoading}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-dusk-base hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-collar ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Repos</span>
              </button>
            </div>
          </div>

          {/* Search Bar for User Repositories */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <label htmlFor="user-repo-search" className="sr-only">Search your repositories</label>
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="user-repo-search"
                type="text"
                placeholder="Filter your repositories by name or language..."
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-dusk-surface border border-slate-700/80 rounded-2xl text-xs text-cream-text placeholder-slate-400 focus:outline-none focus:border-amber-collar transition-all font-mono"
              />
            </div>

            <div className="text-xs text-slate-400 font-mono flex items-center space-x-2">
              <FolderGit2 className="w-4 h-4 text-amber-collar" />
              <span>Showing {filteredRepos.length} of {repositories.length} repositories</span>
            </div>
          </div>

          {/* Repositories Grid */}
          {isLoading ? (
            <div className="glass-panel p-12 rounded-3xl text-center space-y-4">
              <RefreshCw className="w-8 h-8 text-amber-collar animate-spin mx-auto" />
              <p className="text-sm font-semibold text-cream-text">Fetching your GitHub repositories...</p>
            </div>
          ) : filteredRepos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="dusk-card dusk-card-interactive p-5 flex flex-col justify-between space-y-4 shadow-md group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-cream-text text-base font-display line-clamp-1 group-hover:text-amber-collar transition-colors">
                        {repo.name}
                      </h3>
                      {repo.is_private && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          Private
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 min-h-[36px]">
                      {repo.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-dusk-base border border-slate-800 text-slate-300">
                        <FileCode className="w-3 h-3 text-slate-400" />
                        <span>{repo.language}</span>
                      </span>

                      <div className="flex items-center space-x-3 text-[11px]">
                        <span className="flex items-center space-x-1 text-amber-collar font-semibold">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{repo.stars}</span>
                        </span>
                        <span>{repo.open_issues} issues</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onAnalyzeRepo(repo.repo_url)}
                      className="w-full py-2.5 rounded-xl bg-amber-collar hover:bg-amber-400 text-dusk-base font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer group-hover:shadow-amber-collar/20"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      <span>Sniff Out Issues</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel p-10 rounded-3xl text-center space-y-3">
              <p className="text-base font-bold text-cream-text">No matching repositories found.</p>
              <p className="text-xs text-slate-400">Try adjusting your search filter above.</p>
            </div>
          )}

          {/* Tracked Repositories Scan History Section */}
          {trackedHistory.length > 0 && (
            <div className="pt-8 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-cream-text font-display flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-collar" />
                  <span>My Space Scan History</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {trackedHistory.length} repositories audited
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {trackedHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-dusk-surface/80 border border-slate-700/60 hover:border-amber-collar/40 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-cream-text truncate block font-mono">
                        {item.repo_name}
                      </span>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1 font-mono">
                        <span className="text-amber-collar font-bold">{item.total_issues} issues</span>
                        <span>•</span>
                        <span>SHA {item.commit_sha}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onAnalyzeRepo(item.repo_url)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-dusk-base hover:bg-slate-800 text-amber-collar border border-amber-collar/40 transition-all shadow-sm shrink-0 cursor-pointer"
                    >
                      Re-Scan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
