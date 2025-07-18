let currentActiveTabId = null;
let activeStartTime = null;

// Initialize tracking when service worker starts
chrome.runtime.onStartup.addListener(initializeTracking);
chrome.runtime.onInstalled.addListener(initializeTracking);

// Also initialize immediately when script loads
initializeTracking();

function initializeTracking() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      currentActiveTabId = tabs[0].id;
      activeStartTime = Date.now();
    }
  });
  
  // Also initialize blocking rules
  updateDeclarativeNetRequestRules();
  
  // Set up periodic backup to prevent data loss (every 30 seconds)
  setInterval(() => {
    if (currentActiveTabId && activeStartTime) {
      const now = Date.now();
      const currentDuration = now - activeStartTime;
      
      // Only backup if we have significant time (>10 seconds)
      if (currentDuration > 10000) {
        recordFocusDuration(currentActiveTabId, currentDuration);
        activeStartTime = now; // Reset timer after backup
      }
    }
  }, 30000); // Every 30 seconds
  
  // Set up periodic cleanup of expired blocks (every 10 seconds for responsive blocking)
  setInterval(() => {
    chrome.storage.local.get({ blockedDomains: [], focusModeActive: false }, (data) => {
      if (data.focusModeActive && data.blockedDomains.length > 0) {
        const now = Date.now();
        const hasExpired = data.blockedDomains.some(entry => 
          entry.unblockUntil && entry.unblockUntil <= now
        );
        
        if (hasExpired) {
          updateDeclarativeNetRequestRules(); // This will clean and update
        }
      }
    });
  }, 10000); // Every 10 seconds for faster response
}

// Focus tracking: tab switched
chrome.tabs.onActivated.addListener(({ tabId }) => {
  const now = Date.now();
  if (currentActiveTabId && activeStartTime) {
    const duration = now - activeStartTime;
    recordFocusDuration(currentActiveTabId, duration);
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
      const duration = now - activeStartTime;
      recordFocusDuration(currentActiveTabId, duration);
      activeStartTime = null; // Pause tracking
    }
    return;
  }

  chrome.tabs.query({ active: true, windowId }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;

    if (currentActiveTabId && activeStartTime) {
      const duration = now - activeStartTime;
      recordFocusDuration(currentActiveTabId, duration);
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
          
          if (!domainMatch) return false;

          // If it's a permanent block (no unblockUntil), block it
          if (!entry.unblockUntil) return true;
          
          // If it's a temporary block that hasn't expired yet, DON'T block it
          if (entry.unblockUntil && now < entry.unblockUntil) return false;
          
          // If it's a temporary block that has expired, block it
          return true;
        });

        if (isBlocked) {
          console.log(`🚫 Blocking ${currentDomain} immediately`);
          chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") });
          
          // Also trigger rule update to ensure declarativeNetRequest is current
          updateDeclarativeNetRequestRules();
        } else {
          console.log(`✅ Allowing ${currentDomain} - not blocked or within unblock period`);
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
  // REMOVE THIS THRESHOLD - it's causing lost time tracking!
  // Old problematic line: if (durationMs < 1000) return;
  
  // Only ignore very short durations (less than 500ms) to avoid accidental switches
  if (durationMs < 500) {
    console.log(`⏱️ Skipping very short duration: ${Math.round(durationMs)}ms`);
    return;
  }
  
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) {
      console.log("Tab not found or no URL:", chrome.runtime.lastError?.message);
      return;
    }

    try {
      const domain = new URL(tab.url).hostname;
      const now = Date.now();
      console.log(`✅ Recording ${Math.round(durationMs/1000)}s (${durationMs}ms) for ${domain}`);
      
      chrome.storage.local.get(["focusStats", "focusHistory"], ({ focusStats = {}, focusHistory = {} }) => {
        // Update total time stats
        if (!focusStats[domain]) {
          focusStats[domain] = 0;
        }
        const oldTime = focusStats[domain];
        focusStats[domain] += durationMs;
        console.log(`📊 ${domain}: ${Math.round(oldTime/1000)}s → ${Math.round(focusStats[domain]/1000)}s (+${Math.round(durationMs/1000)}s)`);

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
  // First clean expired blocks
  cleanExpiredBlocksInBackground(() => {
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
        // Only block permanent blocks OR expired temporary blocks
        const isPermanentBlock = !entry.unblockUntil;
        const isExpiredTemporaryBlock = entry.unblockUntil && now >= entry.unblockUntil;
        return isPermanentBlock || isExpiredTemporaryBlock;
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
        console.log(`📋 Active blocks:`, activeBlocks.map(b => `${b.domain}${b.unblockUntil ? ` (blocked after ${new Date(b.unblockUntil).toLocaleTimeString()})` : ' (permanently blocked)'}`));
      });
    });
  });
}

// Clean expired blocks in background (helper function)
function cleanExpiredBlocksInBackground(callback = () => {}) {
  chrome.storage.local.get({ blockedDomains: [] }, (data) => {
    const now = Date.now();

    // Convert expired temporary unblocks to permanent blocks
    const updated = data.blockedDomains.map(entry => {
      // If it's a temporary unblock that has expired, make it a permanent block
      if (entry.unblockUntil && entry.unblockUntil <= now) {
        return { domain: entry.domain, unblockUntil: null }; // Remove unblockUntil to make it permanent
      }
      return entry; // Keep as is
    });

    // Only update storage if something changed
    const hasChanges = updated.some((entry, index) => 
      JSON.stringify(entry) !== JSON.stringify(data.blockedDomains[index])
    );

    if (hasChanges) {
      chrome.storage.local.set({ blockedDomains: updated }, callback);
      const expiredCount = updated.filter((entry, index) => 
        !entry.unblockUntil && data.blockedDomains[index].unblockUntil
      ).length;
      console.log(`🔄 Converted ${expiredCount} expired unblocks to permanent blocks`);
    } else {
      callback();
    }
  });
}