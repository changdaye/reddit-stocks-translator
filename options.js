const DEFAULT_SETTINGS = {
  apiKey: '',
  autoTranslate: true,
  translateComments: true,
  enableCache: true,
};

const apiKeyInput = document.getElementById('apiKey');
const autoTranslateInput = document.getElementById('autoTranslate');
const translateCommentsInput = document.getElementById('translateComments');
const enableCacheInput = document.getElementById('enableCache');
const saveButton = document.getElementById('saveButton');
const clearCacheButton = document.getElementById('clearCacheButton');
const statusNode = document.getElementById('status');

function setStatus(message) {
  statusNode.textContent = message;
  setTimeout(() => {
    if (statusNode.textContent === message) {
      statusNode.textContent = '';
    }
  }, 2500);
}

function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    apiKeyInput.value = settings.apiKey || '';
    autoTranslateInput.checked = Boolean(settings.autoTranslate);
    translateCommentsInput.checked = Boolean(settings.translateComments);
    enableCacheInput.checked = Boolean(settings.enableCache);
  });
}

function saveSettings() {
  chrome.storage.sync.set(
    {
      apiKey: apiKeyInput.value.trim(),
      autoTranslate: autoTranslateInput.checked,
      translateComments: translateCommentsInput.checked,
      enableCache: enableCacheInput.checked,
    },
    () => setStatus('设置已保存')
  );
}

function clearCache() {
  chrome.storage.local.remove(['translationCache'], () => setStatus('缓存已清空'));
}

saveButton.addEventListener('click', saveSettings);
clearCacheButton.addEventListener('click', clearCache);
document.addEventListener('DOMContentLoaded', loadSettings);
