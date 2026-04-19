(() => {
  const {
    normalizeText,
    shouldTranslateText,
    isSupportedStocksUrl,
    makeCacheKey,
    classifyTranslationError,
    createDebugEntry,
    appendDebugEntry,
    isCandidateContainerTag,
    shouldIgnoreContainerTag,
    maskProtectedTerms,
    restoreProtectedTerms,
    chunkArray,
  } = globalThis.RedditTranslatorShared;

  const SETTINGS_DEFAULTS = {
    apiKey: '',
    autoTranslate: true,
    translateComments: true,
    enableCache: true,
    debugMode: true,
  };

  const PROCESSED_ATTR = 'data-rtProcessed';
  const TRANSLATION_CLASS = 'rt-translation-block';
  const NOTICE_ID = 'rt-status-notice';
  const LOG_KEY = 'debugLogs';

  let observer = null;
  let observerTimer = null;
  let currentSettings = { ...SETTINGS_DEFAULTS };

  function debugLog(level, event, context = {}) {
    const entry = createDebugEntry(level, event, context);
    console[level === 'error' ? 'error' : 'log']('[Reddit Stocks Translator]', entry);
    if (!currentSettings.debugMode) return;
    chrome.storage.local.get({ [LOG_KEY]: [] }, (result) => {
      const next = appendDebugEntry(result[LOG_KEY], entry, 200);
      chrome.storage.local.set({ [LOG_KEY]: next });
    });
  }

  function isStocksPage() {
    return isSupportedStocksUrl(window.location.href);
  }

  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(SETTINGS_DEFAULTS, (settings) => {
        currentSettings = settings;
        resolve(settings);
      });
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
    return Boolean(node.closest('[role="button"], .rt-translation-block'));
  }

  function findClosestCandidateContainer(node) {
    let current = node instanceof HTMLElement ? node : node?.parentElement;
    while (current && current !== document.body) {
      const tagName = (current.tagName || '').toLowerCase();
      if (shouldIgnoreContainerTag(tagName)) return null;
      if (current.closest('[aria-hidden="true"], button, a, nav, header, footer, aside')) return null;
      if (isCandidateContainerTag(tagName)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  function getCandidateNodes(root = document, settings = SETTINGS_DEFAULTS) {
    const startRoot = root instanceof HTMLElement || root instanceof Document ? root : document;
    const walker = document.createTreeWalker(startRoot, NodeFilter.SHOW_TEXT, {
      acceptNode(textNode) {
        const text = normalizeText(textNode.textContent || '');
        if (!shouldTranslateText(text)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const collected = new Set();
    let textNode = walker.nextNode();
    while (textNode) {
      const container = findClosestCandidateContainer(textNode.parentElement);
      if (container) {
        collected.add(container);
      }
      textNode = walker.nextNode();
    }

    const nodes = [...collected].filter((node) => {
      if (!(node instanceof HTMLElement)) return false;
      if (isInsideIgnoredContainer(node)) return false;
      if (node.hasAttribute(PROCESSED_ATTR)) return false;
      if (hasTranslationBlock(node)) return false;
      const text = normalizeText(node.innerText || node.textContent || '');
      if (!shouldTranslateText(text)) return false;
      if (!settings.translateComments && isCommentNode(node)) return false;
      return true;
    });

    debugLog('info', 'scan.candidates', { count: nodes.length, url: window.location.href, sample: nodes.slice(0, 5).map((node) => normalizeText(node.innerText || node.textContent || '').slice(0, 80)) });
    return nodes;
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

    debugLog('info', 'translate.request', { batchSize: texts.length });

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
        debugLog('info', 'translate.success', { batchSize: translations.length });
        return translations.map((item, index) => {
          const decoded = decodeHtmlEntities(item.translatedText || '');
          return restoreProtectedTerms(decoded, maskedEntries[index].tokens);
        });
      } catch (error) {
        lastError = error;
        debugLog('error', 'translate.attempt_failed', { attempt: attempt + 1, message: String(error?.message || error) });
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

  function showStatusNotice(message) {
    const target = document.querySelector('main');
    if (!target) return;
    let notice = document.getElementById(NOTICE_ID);
    if (!notice) {
      notice = document.createElement('div');
      notice.id = NOTICE_ID;
      notice.className = TRANSLATION_CLASS;
      target.prepend(notice);
    }
    notice.textContent = message;
  }

  function showMissingApiKeyNotice() {
    showStatusNotice('Reddit Stocks Translator：请先在扩展设置中填写 Google API Key。');
  }

  async function processNodes(root = document) {
    const settings = await getSettings();
    debugLog('info', 'script.process_start', {
      url: window.location.href,
      supportedPage: isStocksPage(),
      autoTranslate: settings.autoTranslate,
      translateComments: settings.translateComments,
      hasApiKey: Boolean(settings.apiKey),
    });

    if (!isStocksPage() || !settings.autoTranslate) return;
    if (!settings.apiKey) {
      showMissingApiKeyNotice();
      debugLog('warn', 'settings.missing_api_key');
      return;
    }

    const nodes = getCandidateNodes(root, settings);
    if (!nodes.length) {
      debugLog('warn', 'scan.no_candidates', { url: window.location.href });
      return;
    }

    const cache = settings.enableCache ? await getCache() : {};
    const unresolved = [];
    const pendingByKey = new Map();
    let cacheHits = 0;

    nodes.forEach((node) => {
      const text = normalizeText(node.innerText || node.textContent || '');
      const cacheKey = makeCacheKey(text);
      const translated = cache[cacheKey];
      if (translated) {
        cacheHits += 1;
        applyTranslation(node, translated);
        return;
      }

      if (!pendingByKey.has(cacheKey)) {
        pendingByKey.set(cacheKey, { text, cacheKey, nodes: [] });
      }
      pendingByKey.get(cacheKey).nodes.push(node);
    });

    debugLog('info', 'cache.summary', { cacheHits, pendingUniqueTexts: pendingByKey.size });
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
        const message = classifyTranslationError(error?.message || error);
        console.error('[Reddit Stocks Translator]', error);
        debugLog('error', 'translate.failed', { message });
        showStatusNotice(`Reddit Stocks Translator：${message}`);
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
      debugLog('info', 'mutation.process', { addedRoots: mutationRoots.length });
      mutationRoots.forEach((root) => processNodes(root).catch((error) => {
        debugLog('error', 'mutation.process_failed', { message: String(error?.message || error) });
        console.error(error);
      }));
    }, 500);
  }

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(scheduleProcess);
    observer.observe(document.body, { childList: true, subtree: true });
    debugLog('info', 'observer.started');
  }

  debugLog('info', 'script.loaded', { url: window.location.href });
  processNodes().catch((error) => {
    debugLog('error', 'script.process_failed', { message: String(error?.message || error) });
    console.error(error);
  });
  startObserver();
})();
