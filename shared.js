(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.RedditTranslatorShared = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function isSupportedRedditPath(pathname) {
    return /^\/r\/stocks(?:\/|$)/.test(String(pathname || ''));
  }

  function isSupportedRedditHost(hostname) {
    return /^(?:www\.)?reddit\.com$/i.test(String(hostname || ''));
  }

  function isSupportedStocksUrl(urlLike) {
    try {
      const url = typeof urlLike === 'string' ? new URL(urlLike) : urlLike;
      return isSupportedRedditHost(url.hostname) && isSupportedRedditPath(url.pathname);
    } catch {
      return false;
    }
  }

  function isLikelyUiLabel(text) {
    const normalized = normalizeText(text).toLowerCase();
    if (!normalized) return true;

    const exactMatches = new Set([
      'share', 'save', 'report', 'reply', 'award', 'awards', 'copy link',
      'mod', 'op', 'stickied', 'more replies', 'sort by: best', 'best',
      'new', 'top', 'hot', 'rising',
    ]);

    if (exactMatches.has(normalized)) return true;
    if (/^\d+[.,]?\d*\s*(comment|comments|upvote|upvotes|point|points)$/i.test(normalized)) return true;
    if (/^\d+\s*(m|min|mins|h|hr|hrs|d|day|days|mo|month|months|y|yr|yrs)\.?\s*ago$/i.test(normalized)) return true;
    if (/^level\s+\d+$/i.test(normalized)) return true;
    return false;
  }

  function shouldTranslateText(text) {
    const normalized = normalizeText(text);
    if (!normalized) return false;
    if (normalized.length < 4) return false;
    if (/^[\d\W]+$/.test(normalized)) return false;
    if (isLikelyUiLabel(normalized)) return false;
    return /[A-Za-z]/.test(normalized);
  }

  function makeCacheKey(text) {
    return `v1:${normalizeText(text)}`;
  }

  function classifyTranslationError(errorLike) {
    const message = String(errorLike || '未知错误');
    if (/api key not valid|invalid api key/i.test(message)) {
      return 'Google API Key 无效，请重新检查扩展设置里的 API Key。';
    }
    if (/api has not been used|is disabled|permission_denied/i.test(message)) {
      return 'Google Cloud Translation API 可能未启用，或当前 Key 没有权限。';
    }
    if (/referer|ip referer|blocked/i.test(message)) {
      return '当前 API Key 的限制规则拦截了浏览器请求，请检查 Key 限制。';
    }
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      return '网络或跨域请求失败，请稍后重试并检查浏览器扩展错误日志。';
    }
    return `翻译请求失败：${message}`;
  }

  function createDebugEntry(level, event, context = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: String(level || 'info'),
      event: String(event || 'unknown'),
      context: context && typeof context === 'object' ? context : { value: context },
    };
  }

  function appendDebugEntry(entries, entry, limit = 200) {
    const next = [...(Array.isArray(entries) ? entries : []), entry];
    return next.slice(Math.max(0, next.length - Math.max(1, limit)));
  }

  function maskProtectedTerms(text) {
    const tokens = [];
    let index = 0;
    const maskedText = String(text || '').replace(
      /(\$[A-Z]{1,6}\b|\b[A-Z]{2,5}\b(?=(?:\s|\/|,|\.|:|;|$))|r\/[A-Za-z0-9_]+|u\/[A-Za-z0-9_-]+|https?:\/\/\S+)/g,
      (match) => {
        const token = `__RTTOKEN_${index}__`;
        tokens.push({ token, value: match });
        index += 1;
        return token;
      }
    );
    return { maskedText, tokens };
  }

  function restoreProtectedTerms(text, tokens) {
    return (tokens || []).reduce(
      (result, item) => result.split(item.token).join(item.value),
      String(text || '')
    );
  }

  function chunkArray(items, size) {
    const chunks = [];
    const safeSize = Math.max(1, size || 1);
    for (let index = 0; index < items.length; index += safeSize) {
      chunks.push(items.slice(index, index + safeSize));
    }
    return chunks;
  }

  return {
    normalizeText,
    shouldTranslateText,
    isSupportedRedditPath,
    isSupportedRedditHost,
    isSupportedStocksUrl,
    isLikelyUiLabel,
    makeCacheKey,
    classifyTranslationError,
    createDebugEntry,
    appendDebugEntry,
    maskProtectedTerms,
    restoreProtectedTerms,
    chunkArray,
  };
});
