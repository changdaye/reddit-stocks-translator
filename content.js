(() => {
  const {
    normalizeText,
    shouldTranslateText,
    isSupportedRedditPath,
    makeCacheKey,
    maskProtectedTerms,
    restoreProtectedTerms,
    chunkArray,
  } = globalThis.RedditTranslatorShared;

  const SETTINGS_DEFAULTS = {
    apiKey: '',
    autoTranslate: true,
    translateComments: true,
    enableCache: true,
  };

  const PROCESSED_ATTR = 'data-rtProcessed';
  const TRANSLATION_CLASS = 'rt-translation-block';
  const NOTICE_ID = 'rt-missing-api-key';
  const SELECTORS = [
    'main h1',
    'main h2',
    'main h3',
    'main p',
    'shreddit-comment p',
    'div[data-testid="comment"] p',
    'div[slot="comment"]',
    '[data-testid="post-container"] h3',
    '[data-testid="post-content"] p'
  ];

  let observer = null;
  let observerTimer = null;

  function isStocksPage() {
    return isSupportedRedditPath(window.location.pathname);
  }

  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(SETTINGS_DEFAULTS, (settings) => resolve(settings));
    });
  }

  function getCache() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ translationCache: {} }, (result) => {
        resolve(result.translationCache || {});
      });
    });
  }

  function setCache(cache) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ translationCache: cache }, resolve);
    });
  }

  function hasTranslationBlock(element) {
    return Boolean(element.nextElementSibling && element.nextElementSibling.classList.contains(TRANSLATION_CLASS));
  }

  function isCommentNode(node) {
    return Boolean(node.closest('shreddit-comment, [data-testid="comment"]'));
  }

  function isInsideIgnoredContainer(node) {
    return Boolean(node.closest('button, a, nav, header, footer, aside, [role="button"], .rt-translation-block'));
  }

  function getCandidateNodes(root = document, settings = SETTINGS_DEFAULTS) {
    const collected = new Set();
    SELECTORS.forEach((selector) => {
      root.querySelectorAll(selector).forEach((node) => collected.add(node));
    });

    return [...collected].filter((node) => {
      if (!(node instanceof HTMLElement)) return false;
      if (isInsideIgnoredContainer(node)) return false;
      if (node.closest('[aria-hidden="true"]')) return false;
      if (node.hasAttribute(PROCESSED_ATTR)) return false;
      if (hasTranslationBlock(node)) return false;
      const text = normalizeText(node.innerText || node.textContent || '');
      if (!shouldTranslateText(text)) return false;
      if (!settings.translateComments && isCommentNode(node)) return false;
      return true;
    });
  }

  function decodeHtmlEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  async function translateBatch(texts, apiKey) {
    const maskedEntries = texts.map((text) => {
      const { maskedText, tokens } = maskProtectedTerms(text);
      return { maskedText, tokens };
    });

    const requestBody = {
      q: maskedEntries.map((entry) => entry.maskedText),
      source: 'en',
      target: 'zh-CN',
      format: 'text'
    };

    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Translation request failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const translations = data?.data?.translations || [];
        return translations.map((item, index) => {
          const decoded = decodeHtmlEntities(item.translatedText || '');
          return restoreProtectedTerms(decoded, maskedEntries[index].tokens);
        });
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }

    throw lastError;
  }

  function applyTranslation(element, translatedText) {
    element.setAttribute(PROCESSED_ATTR, 'true');
    if (hasTranslationBlock(element)) return;
    const block = document.createElement('div');
    block.className = TRANSLATION_CLASS;
    block.textContent = translatedText;
    element.insertAdjacentElement('afterend', block);
  }

  function showMissingApiKeyNotice() {
    if (document.getElementById(NOTICE_ID)) return;
    const target = document.querySelector('main');
    if (!target) return;
    const notice = document.createElement('div');
    notice.id = NOTICE_ID;
    notice.className = TRANSLATION_CLASS;
    notice.textContent = 'Reddit Stocks Translator：请先在扩展设置中填写 Google API Key。';
    target.prepend(notice);
  }

  async function processNodes(root = document) {
    const settings = await getSettings();
    if (!isStocksPage() || !settings.autoTranslate) return;
    if (!settings.apiKey) {
      showMissingApiKeyNotice();
      return;
    }

    const nodes = getCandidateNodes(root, settings);
    if (!nodes.length) return;

    const cache = settings.enableCache ? await getCache() : {};
    const unresolved = [];
    const pendingByKey = new Map();

    nodes.forEach((node) => {
      const text = normalizeText(node.innerText || node.textContent || '');
      const cacheKey = makeCacheKey(text);
      const translated = cache[cacheKey];
      if (translated) {
        applyTranslation(node, translated);
        return;
      }

      if (!pendingByKey.has(cacheKey)) {
        pendingByKey.set(cacheKey, { text, cacheKey, nodes: [] });
      }
      pendingByKey.get(cacheKey).nodes.push(node);
    });

    unresolved.push(...pendingByKey.values());

    for (const batch of chunkArray(unresolved, 20)) {
      if (!batch.length) continue;
      try {
        const translatedBatch = await translateBatch(batch.map((item) => item.text), settings.apiKey);
        batch.forEach((item, index) => {
          const translatedText = translatedBatch[index];
          if (!translatedText) return;
          if (settings.enableCache) {
            cache[item.cacheKey] = translatedText;
          }
          item.nodes.forEach((node) => applyTranslation(node, translatedText));
        });
      } catch (error) {
        console.error('[Reddit Stocks Translator]', error);
      }
    }

    if (settings.enableCache) {
      await setCache(cache);
    }
  }

  function scheduleProcess(mutations) {
    const mutationRoots = mutations
      .flatMap((mutation) => [...mutation.addedNodes])
      .filter((node) => node instanceof HTMLElement);

    if (!mutationRoots.length) return;
    clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
      mutationRoots.forEach((root) => processNodes(root).catch((error) => console.error(error)));
    }, 500);
  }

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(scheduleProcess);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  processNodes().catch((error) => console.error(error));
  startObserver();
})();
