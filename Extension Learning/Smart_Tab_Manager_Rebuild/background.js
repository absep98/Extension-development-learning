chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ tabAnalytics: [] });
});

// 1. When tab is created, store a placeholder entry
chrome.tabs.onCreated.addListener((tab) => {
  const entry = {
    id: tab.id,
    url: "", // will be updated later
    openedAt: Date.now()
  };

  chrome.storage.local.get("tabAnalytics", ({ tabAnalytics = [] }) => {
    tabAnalytics.push(entry);
    chrome.storage.local.set({ tabAnalytics });
  });
});

// 2. When URL is updated, patch the previous entry
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    chrome.storage.local.get("tabAnalytics", ({ tabAnalytics = [] }) => {
      const updated = tabAnalytics.map(entry => {
        if (entry.id === tabId && !entry.url) {
          return { ...entry, url: changeInfo.url };
        }
        return entry;
      });
      chrome.storage.local.set({ tabAnalytics: updated });
    });
  }
});

// 3. When tab is closed, store closedAt timestamp
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get("tabAnalytics", ({ tabAnalytics = [] }) => {
    const updated = tabAnalytics.map(entry => {
      if (entry.id === tabId && !entry.closedAt) {
        return { ...entry, closedAt: Date.now() };
      }
      return entry;
    });
    chrome.storage.local.set({ tabAnalytics: updated });
  });
});
