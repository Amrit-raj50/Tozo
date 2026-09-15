/**
 * Authentication & "My Space" Storage Service
 * Manages 1-click GitHub OAuth 2.0 Web Flow, Device Flow, Session, and Repository Tracking.
 */

import axios from 'axios';

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return ''; // Call relative endpoints on Vercel deployment
  }
  return 'http://localhost:8000';
};
const API_BASE = getApiBase();
const SESSION_KEY = 'tozo_user_session';
const TRACKED_HISTORY_KEY = 'tozo_tracked_repos_history';

/**
 * Get current logged in user profile session
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

/**
 * Save user session to localStorage
 */
export function saveUserSession(user) {
  try {
    const sessionData = {
      ...user,
      loggedInAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    // Trigger custom event so Navbar updates instantly
    window.dispatchEvent(new Event('storage'));
    return sessionData;
  } catch (err) {
    console.error("Failed to save session:", err);
    return user;
  }
}

/**
 * Check backend GitHub OAuth configuration status
 */
export async function getGithubAuthConfig() {
  try {
    const res = await axios.get(`${API_BASE}/api/auth/github/config`);
    return res.data;
  } catch (err) {
    return { oauth_enabled: false, client_id: '' };
  }
}

/**
 * Initiate 1-click GitHub OAuth 2.0 Web Flow
 * Redirects to GitHub login, triggering the standard 2-digit GitHub Mobile verification prompt!
 */
export function redirectToGithubOAuth(clientId) {
  const currentOrigin = window.location.origin;
  const isLocalhost = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1');
  const redirectUri = isLocalhost ? `${currentOrigin}/` : 'https://tozo.vercel.app/';
  const state = Math.random().toString(36).substring(2, 15);
  sessionStorage.setItem('tozo_oauth_state', state);

  const scope = encodeURIComponent('read:user repo');
  const targetUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;

  window.location.href = targetUrl;
}

/**
 * Handle incoming OAuth callback code from GitHub redirect (?code=...)
 */
export async function handleOAuthCallback(code) {
  try {
    const currentOrigin = window.location.origin;
    const redirectUri = `${currentOrigin}/`;

    const res = await axios.post(`${API_BASE}/api/auth/github/callback`, {
      code,
      redirect_uri: redirectUri,
    });

    const user = res.data.user;
    const repositories = res.data.repositories || [];
    const token = res.data.token;

    const session = saveUserSession({
      ...user,
      token,
    });

    return {
      user: session,
      repositories,
    };
  } catch (err) {
    const msg = err.response?.data?.detail || err.message || 'GitHub OAuth verification failed.';
    throw new Error(msg);
  }
}

/**
 * Start GitHub Device Authorization Flow
 */
export async function startGithubDeviceFlow() {
  try {
    const res = await axios.post(`${API_BASE}/api/auth/github/device/start`);
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.detail || err.message || 'Failed to start GitHub device flow.';
    throw new Error(msg);
  }
}

/**
 * Poll GitHub Device Authorization status
 */
export async function pollGithubDeviceFlow(deviceCode) {
  try {
    const res = await axios.post(`${API_BASE}/api/auth/github/device/poll`, {
      device_code: deviceCode,
    });
    if (res.data.status === 'success') {
      saveUserSession(res.data.user);
    }
    return res.data;
  } catch (err) {
    throw err;
  }
}

/**
 * Log in with GitHub username (Direct public lookup)
 */
export async function loginWithGithubUsername(username) {
  const cleanUser = username.trim().replace(/^@/, '');
  if (!cleanUser) {
    throw new Error('Please enter your GitHub username.');
  }

  try {
    const profileRes = await axios.get(`${API_BASE}/api/auth/user-profile/${cleanUser}`);
    const userProfile = profileRes.data;

    const reposRes = await axios.get(`${API_BASE}/api/auth/user-repos/${cleanUser}`);
    const repositories = reposRes.data.repositories || [];

    const session = saveUserSession(userProfile);

    return {
      user: session,
      repositories,
    };
  } catch (err) {
    const msg = err.response?.data?.detail || err.message || 'Failed to authenticate with GitHub username.';
    throw new Error(msg);
  }
}

/**
 * Log in with GitHub Personal Access Token
 */
export async function loginWithGithubToken(token) {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('Please enter a valid GitHub access token.');
  }

  try {
    const res = await axios.post(`${API_BASE}/api/auth/token-verify`, { token: cleanToken });
    const user = res.data.user;
    const repositories = res.data.repositories || [];

    const session = saveUserSession({
      ...user,
      token: cleanToken,
    });

    return {
      user: session,
      repositories,
    };
  } catch (err) {
    const msg = err.response?.data?.detail || err.message || 'Failed to verify GitHub token.';
    throw new Error(msg);
  }
}

/**
 * Fetch repositories for an authenticated user
 */
export async function fetchUserRepositories(username) {
  try {
    const res = await axios.get(`${API_BASE}/api/auth/user-repos/${username}`);
    return res.data.repositories || [];
  } catch (err) {
    return [];
  }
}

/**
 * Log out user
 */
export function logoutUser() {
  try {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error("Failed to clear session:", err);
  }
}

/**
 * Get user's tracked repositories scan history
 */
export function getTrackedHistory() {
  try {
    const raw = localStorage.getItem(TRACKED_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

/**
 * Add a newly scanned repository to user's tracked history
 */
export function addTrackedHistory(report) {
  if (!report || !report.repo_url) return;
  try {
    const current = getTrackedHistory();
    const existingIdx = current.findIndex(item => item.repo_url === report.repo_url);

    const newItem = {
      repo_name: report.repo_name,
      repo_url: report.repo_url,
      total_issues: report.total_issues || 0,
      commit_sha: report.commit_sha || 'HEAD',
      scanned_at: new Date().toISOString(),
      score: report.contribution_friendliness?.score || 75,
    };

    let updated = [];
    if (existingIdx >= 0) {
      current[existingIdx] = newItem;
      updated = current;
    } else {
      updated = [newItem, ...current].slice(0, 30);
    }

    localStorage.setItem(TRACKED_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error("Failed to add tracked history:", err);
  }
}
