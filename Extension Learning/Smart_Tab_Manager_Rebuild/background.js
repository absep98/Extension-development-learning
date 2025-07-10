let currentActiveTabId = null;
let activeStartTime = null;
chrome.tabs.onActivated.addListener(({ tabId }) => {
  const now = Date.now();
  if (currentActiveTabId && activeStartTime) {
    recordFocusDuration(currentActiveTabId, now - activeStartTime);
  }
  currentActiveTabId = tabId;
  activeStartTime = now;
});
chrome.windows.onFocusChanged.addListener((windowId) => {
  const now = Date.now();
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;

  chrome.tabs.query({ active: true, windowId }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;

    if (currentActiveTabId && activeStartTime) {
      recordFocusDuration(currentActiveTabId, now - activeStartTime);
    }

    currentActiveTabId = tab.id;
    activeStartTime = now;
  });
});
function recordFocusDuration(tabId, durationMs) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) return;

    try {
      const domain = new URL(tab.url).hostname;
      chrome.storage.local.get("focusStats", ({ focusStats = {} }) => {
        if (!focusStats[domain]) {
          focusStats[domain] = 0;
        }
        focusStats[domain] += durationMs;
        chrome.storage.local.set({ focusStats });
      });
    } catch (e) {
      console.warn("Invalid URL", tab.url);
    }
  });
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "flushFocusTime") {
    const now = Date.now();
    if (currentActiveTabId && activeStartTime) {
      recordFocusDuration(currentActiveTabId, now - activeStartTime);
      activeStartTime = now;
    }
    sendResponse(true);
  }
});
