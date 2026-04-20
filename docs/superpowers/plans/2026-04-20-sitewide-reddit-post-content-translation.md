# Sitewide Reddit Post Content Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the self-use Chrome extension so it translates post-related content across the Reddit homepage, subreddit listing pages, and post detail pages while avoiding most navigation and utility UI.

**Architecture:** Use a mixed detection strategy. First, match strong post/comment anchors such as post links, comment containers, and detail-page body regions. Then fall back to visible text-container scanning for Reddit content blocks when strong anchors are missing. Shared pure helpers keep URL, tag, and filtering rules testable in Node, while the content script logs candidate samples and applies DOM updates.

**Tech Stack:** Chrome Manifest V3, plain JavaScript, Chrome Storage API, MutationObserver, Node built-in test runner.

---

## File Map
- Modify: `shared.js` — widen supported Reddit URL rules and container classification helpers
- Modify: `content.js` — mixed detection strategy for homepage/list/detail/comment flows
- Modify: `tests/shared.test.js` — broader URL coverage and container helper tests
- Modify: `docs/superpowers/plans/2026-04-19-reddit-stocks-translator-implementation.md` (optional later sync)

### Task 1: Widen supported Reddit URL coverage
**Files:**
- Modify: `shared.js`
- Test: `tests/shared.test.js`

- [ ] Step 1: Write failing tests covering `https://www.reddit.com/`, generic subreddit pages, and post-detail URLs.
- [ ] Step 2: Run `node --test tests/shared.test.js` and verify failures.
- [ ] Step 3: Implement broader supported-page helpers while still excluding unsupported hosts like `old.reddit.com`.
- [ ] Step 4: Re-run tests and verify pass.
- [ ] Step 5: Commit URL helper changes.

### Task 2: Mixed content detection strategy
**Files:**
- Modify: `shared.js`
- Modify: `content.js`
- Test: `tests/shared.test.js`

- [ ] Step 1: Write failing tests for candidate/ignore tag rules needed by mixed scanning.
- [ ] Step 2: Run tests and verify failures.
- [ ] Step 3: Implement strong-anchor detection for post title links and comment/body containers.
- [ ] Step 4: Implement fallback visible-text scanning for likely post content blocks while filtering ads/navigation.
- [ ] Step 5: Re-run tests and verify pass.
- [ ] Step 6: Commit mixed detection strategy.

### Task 3: Manual browser verification
**Files:**
- Modify: `README.md` only if behavior changes need docs
- Test: manual in Chrome on homepage, subreddit page, and post page

- [ ] Step 1: Reload unpacked extension in Chrome.
- [ ] Step 2: Verify logs show supportedPage=true on `/`, `/r/<subreddit>/`, and `/comments/...`.
- [ ] Step 3: Verify candidate samples include real post titles rather than only ads/UI.
- [ ] Step 4: Verify translations render on homepage cards, subreddit listings, post bodies, and comments.
