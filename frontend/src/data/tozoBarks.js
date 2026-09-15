/**
 * Tozo's Bark Library
 * Context-aware, warm, concise lines Tozo can say in speech bubbles.
 * Keep each line under 12 words, never generic, tied to real report data.
 */

export const BARK_LIBRARY = {
  hero: [
    "Got a repo? Let's go sniff it out.",
    "Point me to a trail — I'm ready to dig.",
    "Ready to fetch some clean code insights!",
  ],
  pastedUrl: [
    "Ooh, new scent. Ready when you are.",
    "Trail locked. Hit the button when ready!",
  ],
  validating: [
    "Checking the trailhead and repo fences...",
    "Sniffing GitHub guardrails...",
  ],
  cloning: [
    "Shallow clone secured. Sniffing the tree...",
    "Grabbing a lightweight copy of the pack...",
  ],
  scanning: [
    "Mapping functions and cyclomatic trails...",
    "Checking every path and doorway...",
  ],
  static_checking: [
    "Fast linters running ahead of the pack...",
    "Sniffing out typos and docstring gaps...",
  ],
  ai_analyzing: [
    "AI reasoning on the trickiest logic...",
    "Found complex territory. AI is digging in...",
  ],
  finalizing: [
    "Nearly done digging. Curating your fetch list...",
    "Organizing treats and starter tasks...",
  ],
  highSeverity: [
    "Found something big — you'll want to see this one.",
    "Heads up: critical logic trap spotted!",
  ],
  completed: [
    "Walk's done. Here's what I found.",
    "Trail explored! Checked every trail marker.",
    "All findings fetched and ready to review.",
  ],
  error: [
    "Hit a fence here — check the trail notes.",
    "Trail's blocked — let's try another path.",
  ],
  copied: [
    "Copied — go paste that in a new issue!",
    "Paws off! Markdown is in your clipboard.",
  ],
  playfulClick: [
    "Woof! Point me at any codebase.",
    "I love fresh code! Found any bugs?",
    "Ears perked! Let's hunt down some PRs.",
    "Wagging my tail for clean pull requests!",
    "Ready for the next trail, boss!",
  ],
};

/**
 * Returns a dynamic, context-aware bark from Tozo.
 * @param {string} trigger - e.g. 'hero', 'pastedUrl', 'scanning', 'completed', 'copied', 'click'
 * @param {object} context - optional contextual metadata (e.g. folder, file, issuesCount)
 * @returns {string} Short bark string (under 12 words)
 */
export function getTozoBark(trigger, context = {}) {
  // Real data dynamic barks
  if (trigger === 'folder' && context.folder) {
    return `Something's buried in ${context.folder}/...`;
  }
  if (trigger === 'highSeverity') {
    return "Found something big — you'll want to see this one.";
  }
  if (trigger === 'completed' && context.issuesCount !== undefined) {
    if (context.issuesCount === 0) {
      return "Clean trail! Zero defects found anywhere.";
    }
    return `Walk's done. Fetched ${context.issuesCount} trail notes.`;
  }
  if (trigger === 'error' && context.reason) {
    const shortReason = context.reason.length > 35 ? context.reason.slice(0, 32) + '...' : context.reason;
    return `Hit a fence here — ${shortReason}`;
  }

  const list = BARK_LIBRARY[trigger] || BARK_LIBRARY.playfulClick;
  return list[Math.floor(Math.random() * list.length)];
}
