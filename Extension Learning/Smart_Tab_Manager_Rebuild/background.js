let currentActiveTabId = null;
let activeStartTime = null;

// Initialize tracking when service worker starts
chrome.runtime.onStartup.addListener(initializeTracking);
chrome.runtime.onInstalled.addListener(initializeTracking);

// Also initialize immediately when script loads
initializeTracking();

function initializeTracking() {
  console.log("Initializing time tracking...");
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      currentActiveTabId = tabs[0].id;
      activeStartTime = Date.now();
      console.log("Started tracking tab:", tabs[0].url, "at", new Date().toLocaleTimeString());
    }
  });
  
  // Also initialize blocking rules
  updateDeclarativeNetRequestRules();
}

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
  
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus - record current session but don't start new one
    if (currentActiveTabId && activeStartTime) {
      recordFocusDuration(currentActiveTabId, now - activeStartTime);
      activeStartTime = null; // Pause tracking
    }
    return;
  }

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

// Track URL changes within the same tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Handle URL changes for time tracking (only when complete)
  if (changeInfo.status === "complete" && changeInfo.url && tabId === currentActiveTabId) {
    const now = Date.now();
    if (activeStartTime) {
      // Record time for previous URL, then restart timing for new URL
      recordFocusDuration(tabId, now - activeStartTime);
      activeStartTime = now;
    }
  }

  // Handle blocking functionality - Block IMMEDIATELY when URL changes (before loading)
  if (changeInfo.url && tab.url) {
    chrome.storage.local.get(["focusModeActive", "blockedDomains"], (data) => {
      if (!data.focusModeActive) return;

      const blocked = data.blockedDomains || [];
      try {
        const now = Date.now();
        const currentDomain = new URL(tab.url).hostname.replace(/^www\./, '');

        const isBlocked = blocked.some(entry => {
          const domainMatch = currentDomain.endsWith(entry.domain);

          const isPermanentBlock = !entry.unblockUntil;
          const isExpiredUnblock = entry.unblockUntil && now > entry.unblockUntil;

          return domainMatch && (isPermanentBlock || isExpiredUnblock);
        });

        if (isBlocked) {
          console.log(`🚫 Blocking ${currentDomain} immediately`);
          chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") });
        }
      } catch (err) {
        console.warn("Invalid tab URL: ", tab.url);
      }
    });
  }
});

// Track when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === currentActiveTabId) {
    const now = Date.now();
    if (activeStartTime) {
      recordFocusDuration(tabId, now - activeStartTime);
    }
    currentActiveTabId = null;
    activeStartTime = null;
  }
});

// Calculate & store focus time per domain
function recordFocusDuration(tabId, durationMs) {
  // Only record meaningful durations (more than 1 second)
  if (durationMs < 1000) return;
  
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) {
      console.log("Tab not found or no URL:", chrome.runtime.lastError?.message);
      return;
    }

    try {
      const domain = new URL(tab.url).hostname;
      const now = Date.now();
      console.log(`Recording ${Math.round(durationMs/1000)}s for ${domain}`);
      
      chrome.storage.local.get(["focusStats", "focusHistory"], ({ focusStats = {}, focusHistory = {} }) => {
        // Update total time stats
        if (!focusStats[domain]) {
          focusStats[domain] = 0;
        }
        focusStats[domain] += durationMs;

        // Update detailed history for weekly charts
        if (!focusHistory[domain]) {
          focusHistory[domain] = [];
        }
        focusHistory[domain].push({
          timestamp: now,
          duration: durationMs
        });

        // Keep only last 30 days of history to prevent excessive storage
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        focusHistory[domain] = focusHistory[domain].filter(entry => entry.timestamp >= thirtyDaysAgo);

        chrome.storage.local.set({ focusStats, focusHistory }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error saving focus stats:", chrome.runtime.lastError);
          }
        });
      });
    } catch (e) {
      console.warn("Invalid URL", tab.url, e);
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
  } else if (message.type === "updateBlockingRules") {
    updateDeclarativeNetRequestRules();
    sendResponse(true);
  }
});

// Update blocking rules using declarativeNetRequest API
function updateDeclarativeNetRequestRules() {
  chrome.storage.local.get(["focusModeActive", "blockedDomains"], (data) => {
    if (!data.focusModeActive || !data.blockedDomains?.length) {
      // Clear all rules if focus mode is off or no blocked domains
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: Array.from({length: 1000}, (_, i) => i + 1) // Remove rules 1-1000
      });
      return;
    }

    const now = Date.now();
    const activeBlocks = data.blockedDomains.filter(entry => {
      const isPermanentBlock = !entry.unblockUntil;
      const isActiveTemporaryBlock = entry.unblockUntil && now < entry.unblockUntil;
      return isPermanentBlock || isActiveTemporaryBlock;
    });

    const rules = activeBlocks.map((entry, index) => ({
      id: index + 1,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { url: chrome.runtime.getURL("blocked.html") }
      },
      condition: {
        urlFilter: `*://*.${entry.domain}/*`,
        resourceTypes: ["main_frame"]
      }
    }));

    // Clear existing rules and add new ones
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: Array.from({length: 1000}, (_, i) => i + 1),
      addRules: rules
    }, () => {
      console.log(`🚫 Updated blocking rules for ${rules.length} domains`);
    });
  });
}