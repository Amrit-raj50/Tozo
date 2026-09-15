/**
 * Authentication & "My Space" Storage Service
 * Manages GitHub user session, OAuth token verification, and repository tracking.
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
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
    return sessionData;
  } catch (err) {
    console.error("Failed to save session:", err);
    return user;
  }
}

/**
 * Log in with GitHub username (Fetches public GitHub profile & repositories)
 */
export async function loginWithGithubUsername(username) {
  const cleanUser = username.trim().replace(/^@/, '');
  if (!cleanUser) {
    throw new Error('Please enter your GitHub username.');
  }

  try {
    // 1. Fetch user profile
    const profileRes = await axios.get(`${API_BASE}/api/auth/user-profile/${cleanUser}`);
    const userProfile = profileRes.data;

    // 2. Fetch user repositories
    const reposRes = await axios.get(`${API_BASE}/api/auth/user-repos/${cleanUser}`);
    const repositories = reposRes.data.repositories || [];

    // 3. Save session
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
 * Log in with GitHub Access Token (Supports private + public repos)
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
