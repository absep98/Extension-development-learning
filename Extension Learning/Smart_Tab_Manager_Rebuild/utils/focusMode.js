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
    });

    // Toggle Focus Mode ON/OFF
    focusToggleBtn.addEventListener("click", () => {
        isFocusModeActive = !isFocusModeActive;
        chrome.storage.local.set({ focusModeActive: isFocusModeActive }, () => {
            updateFocusToggleUI();
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
            alert("Please enter a valid domain or URL.");
            return;
        }

        const now = Date.now();
        const unblockUntil = !isNaN(duration) && duration > 0
            ? now + duration * 60 * 1000
            : null;

        chrome.storage.local.get({ blockedDomains: [] }, (data) => {
            const blockedDomains = data.blockedDomains || [];

            const alreadyExists = blockedDomains.find(entry => entry.domain === domain);
            if (!alreadyExists) {
                blockedDomains.push({
                    domain,
                    unblockUntil
                });

                chrome.storage.local.set({ blockedDomains }, () => {
                    blockDomainInput.value = "";
                    blockDurationInput.value = "";
                    renderBlockedDomains();
                });
            }
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
                    const isTemporary = unblockUntil && Date.now() < unblockUntil;

                    li.textContent = `${domain}${isTemporary
                        ? ` (unblocks until ${new Date(unblockUntil).toLocaleTimeString()})`
                        : ""}`;

                    const removeBtn = document.createElement("button");
                    removeBtn.textContent = "❌";
                    removeBtn.style.marginLeft = "10px";
                    removeBtn.onclick = () => {
                        const updatedList = [...data.blockedDomains];
                        updatedList.splice(index, 1);
                        chrome.storage.local.set({ blockedDomains: updatedList }, renderBlockedDomains);
                    };

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
        const cleaned = data.blockedDomains.filter(entry => {
            return !entry.unblockUntil || entry.unblockUntil > now;
        });

        chrome.storage.local.set({ blockedDomains: cleaned }, callback);
    });
}
