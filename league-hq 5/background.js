chrome.action.onClicked.addListener((tab) => { const source = tab?.id != null ? `?sourceTab=${tab.id}` : ''; chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') + source }); });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'LEAGUE_HQ_COLLECT_RESULT') {
    chrome.runtime.sendMessage({ type: 'LEAGUE_HQ_RESULT_FOR_DASHBOARD', payload: message.payload }).catch(() => {});
    return;
  }
  if (message?.type === 'LEAGUE_HQ_START_COLLECTION') {
    (async () => {
      let target = null;
      if (Number.isInteger(message.sourceTab)) { try { const candidate = await chrome.tabs.get(message.sourceTab); if (candidate.url?.startsWith('https://all22pokemon.com/franchise')) target = candidate; } catch (_) {} }
      if (!target) { const tabs = await chrome.tabs.query({ url: 'https://all22pokemon.com/franchise*', lastFocusedWindow: true }); target = tabs.find(t => t.id !== sender.tab?.id) || tabs[0] || null; }
      if (!target) { sendResponse({ ok: false, error: 'Open All22 and enter your active franchise first, then try again.' }); return; }
      try {
        await chrome.tabs.sendMessage(target.id, { type: 'LEAGUE_HQ_COLLECT', options: message.options, week: message.week });
        sendResponse({ ok: true, tabId: target.id });
      } catch (e) { sendResponse({ ok: false, error: 'Could not reach the franchise page. Refresh All22, then try again.' }); }
    })();
    return true;
  }
});
