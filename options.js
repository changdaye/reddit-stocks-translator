const DEFAULT_SETTINGS = {
  apiKey: '',
  autoTranslate: true,
  translateComments: true,
  enableCache: true,
  debugMode: true,
};

const apiKeyInput = document.getElementById('apiKey');
const autoTranslateInput = document.getElementById('autoTranslate');
const translateCommentsInput = document.getElementById('translateComments');
const enableCacheInput = document.getElementById('enableCache');
const debugModeInput = document.getElementById('debugMode');
const saveButton = document.getElementById('saveButton');
const clearCacheButton = document.getElementById('clearCacheButton');
const refreshLogsButton = document.getElementById('refreshLogsButton');
const clearLogsButton = document.getElementById('clearLogsButton');
const statusNode = document.getElementById('status');
const logsOutput = document.getElementById('logsOutput');

function setStatus(message) {
  statusNode.textContent = message;
  setTimeout(() => {
    if (statusNode.textContent === message) {
      statusNode.textContent = '';
    }
  }, 2500);
}

function renderLogs(logs) {
  const entries = Array.isArray(logs) ? logs : [];
  if (!entries.length) {
    logsOutput.textContent = '暂无日志';
    return;
  }

  logsOutput.textContent = entries
    .map((entry) => `${entry.timestamp} [${entry.level}] ${entry.event}\n${JSON.stringify(entry.context || {}, null, 2)}`)
    .join('\n\n');
}

function refreshLogs() {
  chrome.storage.local.get({ debugLogs: [] }, (result) => renderLogs(result.debugLogs));
}

function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    apiKeyInput.value = settings.apiKey || '';
    autoTranslateInput.checked = Boolean(settings.autoTranslate);
    translateCommentsInput.checked = Boolean(settings.translateComments);
    enableCacheInput.checked = Boolean(settings.enableCache);
    debugModeInput.checked = Boolean(settings.debugMode);
  });
  refreshLogs();
}

function saveSettings() {
  chrome.storage.sync.set(
    {
      apiKey: apiKeyInput.value.trim(),
      autoTranslate: autoTranslateInput.checked,
      translateComments: translateCommentsInput.checked,
      enableCache: enableCacheInput.checked,
      debugMode: debugModeInput.checked,
    },
    () => setStatus('设置已保存')
  );
}

function clearCache() {
  chrome.storage.local.remove(['translationCache'], () => setStatus('缓存已清空'));
}

function clearLogs() {
  chrome.storage.local.remove(['debugLogs'], () => {
    renderLogs([]);
    setStatus('日志已清空');
  });
}

saveButton.addEventListener('click', saveSettings);
clearCacheButton.addEventListener('click', clearCache);
refreshLogsButton.addEventListener('click', refreshLogs);
clearLogsButton.addEventListener('click', clearLogs);
document.addEventListener('DOMContentLoaded', loadSettings);
