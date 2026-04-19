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

test('isSupportedRedditPath matches feed and post pages under r/stocks', () => {
  assert.equal(isSupportedRedditPath('/r/stocks/'), true);
  assert.equal(isSupportedRedditPath('/r/stocks/comments/abc123/test-post/'), true);
  assert.equal(isSupportedRedditPath('/r/investing/'), false);
  assert.equal(isSupportedRedditPath('/'), false);
});

test('isLikelyUiLabel detects metadata-style labels', () => {
  assert.equal(isLikelyUiLabel('2 hr. ago'), true);
  assert.equal(isLikelyUiLabel('123 upvotes'), true);
  assert.equal(isLikelyUiLabel('Bullish on NVDA long-term'), false);
});
