# reddit-stocks-translator

Self-use Chrome extension for automatically translating Reddit `r/stocks` posts and comments into Chinese with bilingual display.

## Current status
- Chrome Manifest V3 extension scaffold is in place
- Google Cloud Translation Basic v2 direct API mode is implemented for self-use
- Reddit feed/post/comment translation flow is implemented as an MVP
- Shared helper tests are passing locally

## Repository
- GitHub: https://github.com/changdaye/reddit-stocks-translator
- Main implementation branch: `feat/implement-chrome-extension`

## Features
- Auto-translate on `https://www.reddit.com/r/stocks/`
- Bilingual display: keep English, append Chinese below
- Translate post titles, body text, and comments
- Skip obvious UI labels like `Award`, `12 comments`, `1d ago`
- Protect common stock/community tokens such as `$AAPL`, `TSLA`, `r/stocks`, `u/name`
- Cache translations in `chrome.storage.local`
- Show a page notice when the API key is missing

## Project files
- `manifest.json` — extension metadata and permissions
- `content.js` — Reddit page scanning, translation requests, DOM injection
- `shared.js` — shared text filtering and batching helpers
- `options.html` / `options.js` — settings page and API key storage
- `styles.css` — bilingual translation styling
- `tests/shared.test.js` — helper tests

## Local development

### 1. Clone the repo
```bash
git clone https://github.com/changdaye/reddit-stocks-translator.git
cd reddit-stocks-translator
git checkout feat/implement-chrome-extension
```

### 2. Run tests
```bash
npm test
```

Expected result: Node test runner reports all tests passing.

## Chrome local loading steps

### 1. Open the extensions page
In Chrome, open:

```text
chrome://extensions/
```

### 2. Enable Developer mode
Turn on the toggle in the top-right corner.

### 3. Load the unpacked extension
Click:

```text
Load unpacked
```

Then select this project folder:

```text
/Users/changdaye/Documents/reddit-stocks-translator
```

### 4. Open the extension options page
After loading, find **Reddit Stocks Translator** and click:
- `Details`
- `Extension options`

### 5. Paste your Google API key
In the options page:
- paste your Google Cloud Translation Basic v2 API key
- keep `自动翻译` enabled
- keep `翻译评论` enabled
- keep `启用本地缓存` enabled
- click `保存设置`

## Manual test flow

### Test case 1: r/stocks feed page
Open:
- https://www.reddit.com/r/stocks/

Expected:
- post titles begin showing Chinese blocks under English text
- obvious UI labels are not translated

### Test case 2: post detail page
Open any post under:
- `https://www.reddit.com/r/stocks/comments/...`

Expected:
- title is translated
- body text is translated
- comments are translated progressively

### Test case 3: dynamic comments
Scroll deeper in a busy comment thread.

Expected:
- newly loaded comments get translated after loading
- the page remains usable while translations are appended

### Test case 4: cache behavior
Refresh the same page after translations were already loaded.

Expected:
- repeated content should appear faster
- identical text should not trigger redundant network requests as often

## Troubleshooting

### API key notice appears on the page
Cause:
- API key is empty in extension settings

Fix:
- open extension options
- paste the Google API key again
- save settings
- refresh the Reddit page

### No translation appears
Check:
- current URL is under `/r/stocks`
- API key is valid
- Chrome extension is enabled
- page was refreshed after saving settings

### Reddit layout changed
This extension currently relies on Reddit DOM selectors. If Reddit changes its page structure, selectors in `content.js` may need updates.

## Security note
This project is intentionally designed for **personal self-use only**.

Because the extension directly calls Google Translation with an API key from the browser:
- do not publish this build publicly with your real key
- do not reuse the same key for sensitive production workloads
- restrict the key in Google Cloud Console as much as practical

## Next steps
- improve Reddit selector coverage
- add a popup UI for quick toggles
- add better error feedback for invalid API keys
- optionally package a release zip for local install convenience
