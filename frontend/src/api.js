/**
 * API Client for AI Repo Analyzer Backend
 * Handles asynchronous job launching, polling, scorecard loading, and metadata retrieval.
 */

import axios from 'axios';

// Use local proxy or direct backend URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Check backend health and AI availability
 */
export async function checkHealth() {
  try {
    const res = await client.get('/health');
    return res.data;
  } catch (err) {
    return { status: 'offline', ai_enabled: false };
  }
}

/**
 * Fetch list of sample public repositories
 */
export async function fetchSampleRepos() {
  try {
    const res = await client.get('/sample-repos');
    return res.data;
  } catch (err) {
    return [];
  }
}

/**
 * Submit repository for analysis (supports forced re-scan)
 */
export async function startAnalysis(repoUrl, forceRescan = false) {
  try {
    const res = await client.post('/analyze', { 
      repo_url: repoUrl,
      force_rescan: forceRescan,
    });
    return res.data;
  } catch (err) {
    const detail = err.response?.data?.detail;
    if (Array.isArray(detail)) {
      throw new Error(detail.map(d => d.msg || d.message).join(', '));
    }
    throw new Error(detail || err.message || 'Failed to submit repository for analysis.');
  }
}

/**
 * Fetch current status of an analysis job
 */
export async function fetchJobStatus(jobId) {
  try {
    const res = await client.get(`/status/${jobId}`);
    return res.data;
  } catch (err) {
    const detail = err.response?.data?.detail || err.message;
    throw new Error(detail || 'Failed to fetch job progress.');
  }
}

/**
 * Fetch public shareable scorecard report directly from cache
 */
export async function fetchScorecard(owner, repo) {
  try {
    const res = await client.get(`/scorecard/${owner}/${repo}`);
    return res.data;
  } catch (err) {
    const detail = err.response?.data?.detail;
    throw new Error(detail || 'Scorecard not found. Repository may need to be scanned first.');
  }
}

/**
 * Poll job status until completed or failed
 * @param {string} jobId
 * @param {function} onProgress - Callback receiving status update
 * @param {number} intervalMs - Polling interval in ms (default 1500)
 */
export async function pollJob(jobId, onProgress, intervalMs = 1500) {
  const maxAttempts = 160; // Up to 4 minutes polling
  let attempts = 0;
  let consecutiveErrors = 0;

  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      attempts++;
      try {
        const data = await fetchJobStatus(jobId);
        consecutiveErrors = 0; // Reset error count on successful poll
        if (onProgress) {
          onProgress(data);
        }

        if (data.status === 'completed') {
          clearInterval(timer);
          resolve(data.report);
        } else if (data.status === 'failed') {
          clearInterval(timer);
          reject(new Error(data.error || data.stage_message || 'Analysis failed.'));
        } else if (attempts >= maxAttempts) {
          clearInterval(timer);
          reject(new Error('Analysis timed out. Please try again.'));
        }
      } catch (err) {
        consecutiveErrors++;
        // Allow up to 3 consecutive transient polling network errors before failing job poll
        if (consecutiveErrors > 3 || attempts >= maxAttempts) {
          clearInterval(timer);
          reject(err);
        }
      }
    }, intervalMs);
  });
}

