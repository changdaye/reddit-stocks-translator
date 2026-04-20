# reddit-stocks-translator

A self-use Chrome extension that translates Reddit post-related content into Chinese while keeping the original English visible.

## What it currently does
- Supports Reddit homepage: `https://www.reddit.com/`
- Supports subreddit feed pages: `https://www.reddit.com/r/<subreddit>/`
- Supports post detail pages: `https://www.reddit.com/comments/...` and subreddit comment URLs
- Translates post-related content only:
  - post titles
  - feed/list excerpts
  - post body content
  - comments
- Tries to avoid translating general site chrome such as:
  - top navigation
  - buttons
  - sidebars
  - utility labels
  - obvious ads/promoted text

## Visual behavior
- Original English remains visible
- Plugin-inserted translation blocks use a light blue background
- Plugin-inserted translation text is red
- Inline Chinese text already present inside post-related content is also styled red

## Current architecture
- **Manifest V3** Chrome extension
- **Google Cloud Translation Basic v2** direct API usage for self-use
- **Mixed detection strategy**:
  - strong signals first (`/comments/` links, post/comment containers, content blocks)
  - visible-text scanning as fallback
- **Local cache** in `chrome.storage.local`
- **Persistent debug logs** visible in the extension options page

## Project files
- `manifest.json` — extension metadata and permissions
- `content.js` — Reddit scanning, translation requests, DOM injection, inline Chinese styling, debug logging
- `shared.js` — shared helper logic for URL support, filtering, batching, and debug helpers
- `options.html` / `options.js` — API key settings and debug log viewer
- `styles.css` — translation block styles and inline Chinese red text styles
- `tests/shared.test.js` — helper tests
- `docs/superpowers/specs/` — design docs
- `docs/superpowers/plans/` — implementation plans

## Local development

### Clone the repo
```bash
git clone https://github.com/changdaye/reddit-stocks-translator.git
cd reddit-stocks-translator
```

### Run tests
```bash
npm test
```

Expected result: all Node tests pass.

## Load into Chrome

### 1. Open extensions page
Open:

```text
chrome://extensions/
```

### 2. Enable Developer mode
Turn on the toggle in the top-right corner.

### 3. Load unpacked extension
Click:

```text
Load unpacked
```

Then select:

```text
/Users/changdaye/Documents/reddit-stocks-translator
```

### 4. Open extension options
After loading **Reddit Stocks Translator**:
- click `Details`
- click `Extension options`

### 5. Configure API key
In the options page:
- paste your Google Cloud Translation Basic v2 API key
- keep `自动翻译` enabled
- keep `翻译评论` enabled if you want comments translated
- keep `启用本地缓存` enabled for faster repeat loads
- keep `记录调试日志` enabled while debugging
- click `保存设置`

## Manual test checklist

### Homepage
Open:
- `https://www.reddit.com/`

Expected:
- homepage post cards are eligible for translation
- post-related Chinese text appears in red
- general site navigation should mostly remain untouched

### Subreddit feed
Open:
- `https://www.reddit.com/r/stocks/`
- or any other subreddit feed

Expected:
- titles and excerpts can be translated
- plugin translation blocks appear under matched content

### Post detail page
Open any Reddit post page.

Expected:
- title translates
- body content translates
- comments translate progressively

### Reload behavior
Refresh a page you already translated.

Expected:
- cache should reduce repeat work
- already translated content should appear faster

## Debug logs
The options page includes a debug log viewer.

Useful events include:
- `script.loaded`
- `script.process_start`
- `scan.candidates`
- `cache.summary`
- `translate.request`
- `translate.success`
- `translate.failed`
- `mutation.process`

If translation is not happening, open the options page and inspect the logs first.

## Troubleshooting

### Nothing happens on the page
Check:
- the extension is enabled
- you reloaded the unpacked extension after code changes
- a valid Google API key is saved
- the current page is a supported Reddit content page

### Page shows a notice about missing API key
Fix:
- open extension options
- paste the API key again
- save
- refresh Reddit

### Black inline Chinese appears instead of red
That usually means the Chinese text was produced by another translation layer (for example Chrome page translation), not by this extension's own styles.

### Duplicate translations appear
Reload the latest unpacked extension build. Recent fixes reduce duplicate title/body translation insertion, but Reddit DOM changes may still require more tuning.

## Security note
This project is intended for **personal self-use only**.

Because the browser extension directly calls Google Translation with an API key:
- do not publish your real API key publicly
- do not use the same key for sensitive production workloads
- restrict the key in Google Cloud Console as much as practical

## Repository
- GitHub: https://github.com/changdaye/reddit-stocks-translator
