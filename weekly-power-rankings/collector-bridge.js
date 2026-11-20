(() => {
  if (window.__weeklyRankBridgeInstalled) return;
  window.__weeklyRankBridgeInstalled = true;
  const pending = new Map();
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'IFL_RANK_MAIN' || event.data?.type !== 'RESULT') return;
    chrome.runtime.sendMessage({ type: 'IFL_RANK_RESULT', payload: event.data.payload });
  });
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== 'IFL_RANK_COLLECT') return;
    window.postMessage({ source: 'IFL_RANK_EXTENSION', type: 'COLLECT', options: message.options, week: message.week }, location.origin);
  });
})();
