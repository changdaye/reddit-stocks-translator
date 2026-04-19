(() => {
  const {
    normalizeText,
    shouldTranslateText,
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
  const SELECTORS = [
    'main h1',
    'main h2',
    'main h3',
    'main p',
    'shreddit-comment p',
    'div[data-testid="comment"] p',
    'div[slot="comment"]'
  ];

  let observer = null;
  let observerTimer = null;

  function isStocksPage() {
    return window.location.pathname.includes('/r/stocks');
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

  function getCandidateNodes(root = document) {
    const collected = new Set();
    SELECTORS.forEach((selector) => {
      root.querySelectorAll(selector).forEach((node) => collected.add(node));
    });

    return [...collected].filter((node) => {
      if (!(node instanceof HTMLElement)) return false;
      if (node.closest(`.${TRANSLATION_CLASS}`)) return false;
      if (node.hasAttribute(PROCESSED_ATTR)) return false;
      if (hasTranslationBlock(node)) return false;
      const text = normalizeText(node.innerText || node.textContent || '');
      if (!shouldTranslateText(text)) return false;
      if (!SETTINGS_DEFAULTS.translateComments && node.closest('shreddit-comment, [data-testid="comment"]')) return false;
      return true;
    });
  }

  async function translateBatch(texts, apiKey) {
    const maskedEntries = texts.map((text) => {
      const { maskedText, tokens } = maskProtectedTerms(text);
      return { original: text, maskedText, tokens };
    });

    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: maskedEntries.map((entry) => entry.maskedText),
        source: 'en',
        target: 'zh-CN',
        format: 'text'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Translation request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const translations = data?.data?.translations || [];
    return translations.map((item, index) => {
      const restored = restoreProtectedTerms(item.translatedText || '', maskedEntries[index].tokens);
      return restored;
    });
  }

  function applyTranslation(element, translatedText) {
    element.setAttribute(PROCESSED_ATTR, 'true');
    const block = document.createElement('div');
    block.className = TRANSLATION_CLASS;
    block.textContent = translatedText;
    element.insertAdjacentElement('afterend', block);
  }

  async function processNodes(root = document) {
    const settings = await getSettings();
    if (!settings.autoTranslate || !settings.apiKey || !isStocksPage()) return;

    const nodes = getCandidateNodes(root).filter((node) => {
      if (!settings.translateComments && node.closest('shreddit-comment, [data-testid="comment"]')) {
        return false;
      }
      return true;
    });
    if (!nodes.length) return;

    const cache = settings.enableCache ? await getCache() : {};
    const unresolved = [];

    nodes.forEach((node) => {
      const text = normalizeText(node.innerText || node.textContent || '');
      const cacheKey = makeCacheKey(text);
      const translated = cache[cacheKey];
      if (translated) {
        applyTranslation(node, translated);
      } else {
        unresolved.push({ node, text, cacheKey });
      }
    });

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
          applyTranslation(item.node, translatedText);
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
    if (observer) return;
    observer = new MutationObserver(scheduleProcess);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  processNodes().catch((error) => console.error(error));
  startObserver();
})();
