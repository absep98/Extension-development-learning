let currentActiveTabId = null;
let activeStartTime = null;

// Focus tracking: tab switched
chrome.tabs.onActivated.addListener(({ tabId }) => {
  const now = Date.now();
  if (currentActiveTabId && activeStartTime) {
    recordFocusDuration(currentActiveTabId, now - activeStartTime);
  }
  currentActiveTabId = tabId;
  activeStartTime = now;
});

// Focus tracking: window focus changed
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

// Calculate & store focus time per domain
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

// Manual flush from popup
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

// 🧠 NEW: Blocking distracting sites in Focus Mode
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  chrome.storage.local.get(["focusModeActive", "blockedDomains"], (data) => {
    if (!data.focusModeActive) return;

    const blocked = data.blockedDomains || [];
    try {
      const currentDomain = new URL(tab.url).hostname.replace(/^www\./, '');
      const now = Date.now();
      const isBlocked = blocked.some(entry => {
        const isExpired = entry.unblockUntil && entry.unblockUntil <= now;
        return !isExpired && currentDomain.endsWith(entry.domain);
      });

      if (isBlocked) {
        chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") });
      }
    } catch (err) {
      console.warn("Invalid tab URL: ", tab.url);
    }
  });
});