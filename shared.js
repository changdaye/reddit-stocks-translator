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

  function isLikelyUiLabel(text) {
    const normalized = normalizeText(text).toLowerCase();
    if (!normalized) return true;

    const exactMatches = new Set([
      'share',
      'save',
      'report',
      'reply',
      'award',
      'awards',
      'copy link',
      'mod',
      'op',
      'stickied',
      'more replies',
      'sort by: best',
      'best',
      'new',
      'top',
      'hot',
      'rising',
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
    isLikelyUiLabel,
    makeCacheKey,
    maskProtectedTerms,
    restoreProtectedTerms,
    chunkArray,
  };
});
