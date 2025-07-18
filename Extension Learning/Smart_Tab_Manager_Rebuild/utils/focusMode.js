// focusMode.js

export function initializeFocusModeUI() {
    const focusToggleHeader = document.getElementById("focusToggleHeader");
    const focusModeSection = document.getElementById("focusModeSection");
    const focusToggleBtn = document.getElementById("focusToggleBtn");
    const addBlockDomainBtn = document.getElementById("addBlockDomainBtn");
    const blockDomainInput = document.getElementById("blockDomainInput");
    const blockedDomainsList = document.getElementById("blockedDomainsList");
    const blockDurationInput = document.getElementById("blockDurationInput");

    let isFocusModeActive = false;
    let timerCheckInterval = null;

    // Clean up when popup closes
    window.addEventListener('beforeunload', () => {
        stopTimerCheck();
        // Force a final check for expired timers
        cleanExpiredBlocks(() => {
            chrome.runtime.sendMessage({ type: "updateBlockingRules" });
        });
    });

    // Set up periodic timer check for expired blocks
    function startTimerCheck() {
        if (timerCheckInterval) clearInterval(timerCheckInterval);
        
        timerCheckInterval = setInterval(() => {
            chrome.storage.local.get({ blockedDomains: [] }, (data) => {
                const now = Date.now();
                const hasExpiredTimers = data.blockedDomains.some(entry => 
                    entry.unblockUntil && entry.unblockUntil <= now
                );
                
                if (hasExpiredTimers) {
                    if (expiredDomain) {
                    updateDeclarativeNetRequestRules(); // This will clean and update
                }
                    cleanExpiredBlocks(() => {
                        // Update blocking rules when timers expire
                        chrome.runtime.sendMessage({ type: "updateBlockingRules" });
                        renderBlockedDomains(); // Refresh the UI
                    });
                }
            });
        }, 5000); // Check every 5 seconds
    }

    // Stop timer check when not needed
    function stopTimerCheck() {
        if (timerCheckInterval) {
            clearInterval(timerCheckInterval);
            timerCheckInterval = null;
        }
    }

    // Toggle collapse/expand
    focusToggleHeader.addEventListener("click", () => {
        const isVisible = focusModeSection.style.display === "block";
        focusModeSection.style.display = isVisible ? "none" : "block";
        focusToggleHeader.textContent = isVisible ? "🔒 Focus Mode ⯈" : "🔓 Focus Mode ⯆";
    });

    // Load state on open
    chrome.storage.local.get(["focusModeActive", "blockedDomains"], (data) => {
        isFocusModeActive = data.focusModeActive || false;
        updateFocusToggleUI();
        renderBlockedDomains(); // use internal fetch + cleanup
        
        // Start timer check if focus mode is active
        if (isFocusModeActive) {
            startTimerCheck();
        }
    });

    // Toggle Focus Mode ON/OFF
    focusToggleBtn.addEventListener("click", () => {
        isFocusModeActive = !isFocusModeActive;
        chrome.storage.local.set({ focusModeActive: isFocusModeActive }, () => {
            updateFocusToggleUI();
            // Update blocking rules immediately
            chrome.runtime.sendMessage({ type: "updateBlockingRules" });
            
            // Start/stop timer check based on focus mode state
            if (isFocusModeActive) {
                startTimerCheck();
            } else {
                stopTimerCheck();
            }
        });
    });

    function updateFocusToggleUI() {
        focusToggleBtn.textContent = isFocusModeActive
            ? "⏹️ Deactivate Focus Mode"
            : "🔘 Activate Focus Mode";
        focusToggleBtn.style.backgroundColor = isFocusModeActive ? "#d9534f" : "";
        focusToggleBtn.style.color = isFocusModeActive ? "white" : "";
    }

    // Normalize and validate input domain
    function extractDomain(input) {
        try {
            const url = new URL(input.startsWith("http") ? input : `https://${input}`);
            return url.hostname.replace(/^www\./, "");
        } catch (e) {
            return null;
        }
    }

    // Add blocked domain
    addBlockDomainBtn.addEventListener("click", () => {
        const domain = extractDomain(blockDomainInput.value.trim());
        const duration = parseInt(blockDurationInput.value.trim());

        if (!domain) {
            showStatus("Please enter a valid domain or URL.", "error");
            return;
        }

        const now = Date.now();
        const unblockUntil = !isNaN(duration) && duration > 0
            ? now + duration * 60 * 1000
            : null;

        chrome.storage.local.get({ blockedDomains: [] }, (data) => {
            const blockedDomains = data.blockedDomains || [];

            const existingIndex = blockedDomains.findIndex(entry => entry.domain === domain);
            if (existingIndex >= 0) {
                // 🔄 Update existing domain with new unblock time
                blockedDomains[existingIndex].unblockUntil = unblockUntil;
            } else {
                // ➕ Add new blocked domain
                blockedDomains.push({
                    domain,
                    unblockUntil
                });
            }

            chrome.storage.local.set({ blockedDomains }, () => {
                blockDomainInput.value = "";
                blockDurationInput.value = "";
                renderBlockedDomains();
                // Update blocking rules immediately
                chrome.runtime.sendMessage({ type: "updateBlockingRules" });
                
                // Start timer check if we added a domain with a timer and focus mode is active
                if (unblockUntil && isFocusModeActive) {
                    startTimerCheck();
                }
            });
        });
    });

    // Enter key triggers "Add"
    blockDomainInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") addBlockDomainBtn.click();
    });

    // Render blocked domain list (auto-clean expired)
    function renderBlockedDomains() {
        cleanExpiredBlocks(() => {
            chrome.storage.local.get({ blockedDomains: [] }, (data) => {
                blockedDomainsList.innerHTML = "";

                data.blockedDomains.forEach(({ domain, unblockUntil }, index) => {
                    const li = document.createElement("li");
                    const now = Date.now();
                    const isTemporaryUnblock = unblockUntil && now < unblockUntil;
                    const hasExpiredUnblock = unblockUntil && now >= unblockUntil;

                    let statusText = "";
                    if (isTemporaryUnblock) {
                        statusText = ` (✅ allowed until ${new Date(unblockUntil).toLocaleTimeString()})`;
                    } else if (hasExpiredUnblock || !unblockUntil) {
                        statusText = " (🚫 BLOCKED)";
                    }

                    li.textContent = `${domain}${statusText}`;

                    const removeBtn = document.createElement("button");
                    removeBtn.textContent = "❌";
                    removeBtn.style.marginLeft = "10px";
                    removeBtn.addEventListener('click', () => {
                        const updatedList = [...data.blockedDomains];
                        updatedList.splice(index, 1);
                        chrome.storage.local.set({ blockedDomains: updatedList }, () => {
                            renderBlockedDomains();
                            // Update blocking rules immediately
                            chrome.runtime.sendMessage({ type: "updateBlockingRules" });
                        });
                    });

                    li.appendChild(removeBtn);
                    blockedDomainsList.appendChild(li);
                });
            });
        });
    }
}

// Clean expired blocks (optionally with callback)
export function cleanExpiredBlocks(callback = () => {}) {
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
        } else {
            callback();
        }
    });
}

// Simple status display function for focus mode
function showStatus(message, type) {
    // Create or get status element
    let statusEl = document.getElementById('focusModeStatus');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'focusModeStatus';
        statusEl.style.cssText = `
            position: fixed; top: 10px; right: 10px; padding: 10px 15px;
            border-radius: 4px; z-index: 1000; font-weight: 500;
            max-width: 300px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(statusEl);
    }
    
    // Set message and style based on type
    statusEl.textContent = message;
    statusEl.className = type === 'error' ? 'error' : 'success';
    statusEl.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
    statusEl.style.color = 'white';
    statusEl.style.display = 'block';
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        if (statusEl.parentNode) {
            statusEl.parentNode.removeChild(statusEl);
        }
    }, 3000);
}
