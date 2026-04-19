const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeText,
  shouldTranslateText,
  maskProtectedTerms,
  restoreProtectedTerms,
  chunkArray,
  makeCacheKey,
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
