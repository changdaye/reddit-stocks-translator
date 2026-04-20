const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeText,
  shouldTranslateText,
  maskProtectedTerms,
  restoreProtectedTerms,
  chunkArray,
  makeCacheKey,
  isSupportedRedditPath,
  isLikelyUiLabel,
  classifyTranslationError,
  isSupportedRedditHost,
  isSupportedStocksUrl,
  createDebugEntry,
  appendDebugEntry,
  isCandidateContainerTag,
  shouldIgnoreContainerTag,
} = require('../shared.js');

test('normalizeText collapses whitespace', () => {
  assert.equal(normalizeText('  Hello   world\n  again '), 'Hello world again');
});

test('shouldTranslateText skips empty, tiny, and non-letter strings', () => {
  assert.equal(shouldTranslateText('  '), false);
  assert.equal(shouldTranslateText('OK'), false);
  assert.equal(shouldTranslateText('12345'), false);
  assert.equal(shouldTranslateText('TSLA to the moon'), true);
});

test('shouldTranslateText skips common Reddit UI labels and metadata', () => {
  assert.equal(shouldTranslateText('12 comments'), false);
  assert.equal(shouldTranslateText('1d ago'), false);
  assert.equal(shouldTranslateText('Award'), false);
  assert.equal(shouldTranslateText('MOD'), false);
  assert.equal(shouldTranslateText('This company beat revenue expectations'), true);
});

test('maskProtectedTerms preserves stock tickers, users, and subreddit references', () => {
  const original = 'TSLA is moving faster than $AAPL in r/stocks according to u/value_hunter';
  const { maskedText, tokens } = maskProtectedTerms(original);
  assert.notEqual(maskedText, original);
  const restored = restoreProtectedTerms(maskedText, tokens);
  assert.equal(restored, original);
});

test('chunkArray groups values by batch size', () => {
  assert.deepEqual(chunkArray([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test('makeCacheKey is stable after whitespace normalization', () => {
  assert.equal(makeCacheKey('Hello   world'), makeCacheKey('Hello world'));
});

test('isSupportedRedditPath matches homepage, subreddit feeds, and post pages', () => {
  assert.equal(isSupportedRedditPath('/'), true);
  assert.equal(isSupportedRedditPath('/r/stocks/'), true);
  assert.equal(isSupportedRedditPath('/r/investing/'), true);
  assert.equal(isSupportedRedditPath('/r/stocks/comments/abc123/test-post/'), true);
  assert.equal(isSupportedRedditPath('/comments/abc123/test-post/'), true);
  assert.equal(isSupportedRedditPath('/settings/'), false);
});

test('isLikelyUiLabel detects metadata-style labels', () => {
  assert.equal(isLikelyUiLabel('2 hr. ago'), true);
  assert.equal(isLikelyUiLabel('123 upvotes'), true);
  assert.equal(isLikelyUiLabel('Bullish on NVDA long-term'), false);
});

test('classifyTranslationError maps common API failures to user-facing messages', () => {
  assert.match(classifyTranslationError('Translation request failed: 400 API key not valid. Please pass a valid API key.'), /API Key 无效/);
  assert.match(classifyTranslationError('Translation request failed: 403 API has not been used in project before or it is disabled.'), /未启用/);
  assert.match(classifyTranslationError('Failed to fetch'), /网络或跨域/);
});

test('isSupportedRedditHost accepts reddit.com and www.reddit.com', () => {
  assert.equal(isSupportedRedditHost('reddit.com'), true);
  assert.equal(isSupportedRedditHost('www.reddit.com'), true);
  assert.equal(isSupportedRedditHost('old.reddit.com'), false);
});

test('isSupportedStocksUrl requires supported host and content-like Reddit path', () => {
  assert.equal(isSupportedStocksUrl('https://reddit.com/'), true);
  assert.equal(isSupportedStocksUrl('https://www.reddit.com/r/stocks/comments/abc/test'), true);
  assert.equal(isSupportedStocksUrl('https://www.reddit.com/r/investing/'), true);
  assert.equal(isSupportedStocksUrl('https://old.reddit.com/r/stocks/'), false);
  assert.equal(isSupportedStocksUrl('https://reddit.com/settings/'), false);
});

test('createDebugEntry stores structured log payload', () => {
  const entry = createDebugEntry('info', 'scan.started', { url: 'https://reddit.com/' });
  assert.equal(entry.level, 'info');
  assert.equal(entry.event, 'scan.started');
  assert.equal(entry.context.url, 'https://reddit.com/');
  assert.ok(entry.timestamp);
});

test('appendDebugEntry keeps only the newest entries within the limit', () => {
  const one = createDebugEntry('info', 'one');
  const two = createDebugEntry('info', 'two');
  const three = createDebugEntry('info', 'three');
  assert.deepEqual(appendDebugEntry([one, two], three, 2).map((item) => item.event), ['two', 'three']);
});

test('isCandidateContainerTag accepts common content tags', () => {
  assert.equal(isCandidateContainerTag('p'), true);
  assert.equal(isCandidateContainerTag('h3'), true);
  assert.equal(isCandidateContainerTag('div'), true);
  assert.equal(isCandidateContainerTag('button'), false);
});

test('shouldIgnoreContainerTag rejects obvious interactive chrome tags', () => {
  assert.equal(shouldIgnoreContainerTag('button'), true);
  assert.equal(shouldIgnoreContainerTag('nav'), true);
  assert.equal(shouldIgnoreContainerTag('a'), true);
  assert.equal(shouldIgnoreContainerTag('p'), false);
});

test('isCandidateContainerTag can allow links when explicitly requested', () => {
  assert.equal(isCandidateContainerTag('a', { allowLinks: true }), true);
  assert.equal(isCandidateContainerTag('a', { allowLinks: false }), false);
});
