# Reddit Stocks Translator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-use Chrome extension that automatically translates Reddit r/stocks titles, post bodies, and comments into Chinese with bilingual display using Google Cloud Translation Basic v2.

**Architecture:** A Manifest V3 extension injects a content script on Reddit pages, reads the user's API key from extension storage, scans for relevant text nodes, translates uncached text in batches, and appends a Chinese translation block under each original node. Shared pure helpers live in one UMD-style file so the extension can use them directly and Node can test them without a bundler.

**Tech Stack:** Chrome Manifest V3, plain JavaScript, Chrome Storage API, MutationObserver, Node built-in test runner.

---

## File Map
- Create: `manifest.json` — extension metadata, permissions, content scripts, options page
- Create: `shared.js` — text normalization, filtering, masking, batching, cache key helpers
- Create: `content.js` — page scanning, translation requests, DOM updates, mutation observer
- Create: `options.html` — API key and toggle form
- Create: `options.js` — settings persistence and cache clear action
- Create: `styles.css` — bilingual translation block styling
- Create: `package.json` — local test script entrypoint
- Create: `tests/shared.test.js` — helper behavior tests

### Task 1: Shared translation helpers
**Files:**
- Create: `shared.js`
- Test: `tests/shared.test.js`

- [ ] Step 1: Write failing tests for normalization, translation filtering, masking/restoring, and chunking.
- [ ] Step 2: Run `node --test tests/shared.test.js` and verify failures.
- [ ] Step 3: Implement helper functions in `shared.js`.
- [ ] Step 4: Re-run `node --test tests/shared.test.js` and verify pass.
- [ ] Step 5: Commit helper module.

### Task 2: Extension shell and settings
**Files:**
- Create: `manifest.json`
- Create: `options.html`
- Create: `options.js`
- Create: `styles.css`

- [ ] Step 1: Add Manifest V3 config and storage/host permissions.
- [ ] Step 2: Build options page for API key and toggles.
- [ ] Step 3: Implement settings save/load and cache clear behavior.
- [ ] Step 4: Verify options page loads in Chrome extension settings.
- [ ] Step 5: Commit extension shell.

### Task 3: Content translation flow
**Files:**
- Create: `content.js`
- Modify: `manifest.json`
- Modify: `shared.js`
- Test: manual in Chrome on `https://www.reddit.com/r/stocks/`

- [ ] Step 1: Implement candidate node discovery and de-duplication.
- [ ] Step 2: Add batch translation with Google Basic v2 API key.
- [ ] Step 3: Append bilingual translation blocks and mark processed nodes.
- [ ] Step 4: Add MutationObserver for incrementally loaded comments.
- [ ] Step 5: Manually verify bilingual rendering on feed and post pages.
- [ ] Step 6: Commit MVP translation flow.
