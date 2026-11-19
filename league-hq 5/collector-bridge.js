(() => {
  if (window.__leagueHQBridgeInstalled) return;
  window.__leagueHQBridgeInstalled = true;
  const pending = new Map();
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'LEAGUE_HQ_MAIN' || event.data?.type !== 'RESULT') return;
    chrome.runtime.sendMessage({ type: 'LEAGUE_HQ_COLLECT_RESULT', payload: event.data.payload });
  });
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== 'LEAGUE_HQ_COLLECT') return;
    window.postMessage({ source: 'LEAGUE_HQ_EXTENSION', type: 'COLLECT', options: message.options, week: message.week }, location.origin);
  });
})();
