// Enhanced features and utilities

/**
 * Advanced Tab Operations
 */
class TabOperations {
    static async groupByDomain() {
        try {
            const tabs = await chrome.tabs.query({});
            const domainGroups = new Map();

            // Group tabs by domain
            tabs.forEach(tab => {
                try {
                    const domain = new URL(tab.url).hostname.replace(/^www\./, '');
                    if (!domainGroups.has(domain)) {
                        domainGroups.set(domain, []);
                    }
                    domainGroups.get(domain).push(tab);
                } catch (e) {
                    // Skip invalid URLs
                }
            });

            // Create tab groups for domains with multiple tabs
            for (const [domain, domainTabs] of domainGroups) {
                if (domainTabs.length > 1) {
                    const tabIds = domainTabs.map(tab => tab.id);
                    const group = await chrome.tabs.group({ tabIds });
                    await chrome.tabGroups.update(group, {
                        title: domain,
                        color: this.getDomainColor(domain)
                    });
                }
            }

            return domainGroups.size;
        } catch (error) {
            console.error('TabOperations.groupByDomain error:', error);
            return 0;
        }
    }

    static getDomainColor(domain) {
        const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan'];
        const hash = domain.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        return colors[Math.abs(hash) % colors.length];
    }

    static async duplicateTab(tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            return await chrome.tabs.create({
                url: tab.url,
                index: tab.index + 1,
                active: false
            });
        } catch (error) {
            console.error('TabOperations.duplicateTab error:', error);
            return null;
        }
    }

    static async moveTabToNewWindow(tabId) {
        try {
            return await chrome.windows.create({
                tabId: tabId,
                focused: true
            });
        } catch (error) {
            console.error('TabOperations.moveTabToNewWindow error:', error);
            return null;
        }
    }
}

/**
 * Data Export/Import Manager
 */
class DataManager {
    static async exportData() {
        try {
            const data = await chrome.storage.local.get([
                'focusStats',
                'focusHistory', 
                'customDomainCategories',
                'smartTabFavorites',
                'blockedDomains'
            ]);

            const exportData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                data: data
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const filename = `smart-tab-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;

            // Download the file
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();

            URL.revokeObjectURL(url);
            return { success: true, filename };
        } catch (error) {
            console.error('DataManager.exportData error:', error);
            return { success: false, error: error.message };
        }
    }

    static async importData(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            if (!importData.version || !importData.data) {
                throw new Error('Invalid backup file format');
            }

            // Validate data structure
            const validKeys = ['focusStats', 'focusHistory', 'customDomainCategories', 'smartTabFavorites', 'blockedDomains'];
            const dataToImport = {};

            validKeys.forEach(key => {
                if (importData.data[key]) {
                    dataToImport[key] = importData.data[key];
                }
            });

            await chrome.storage.local.set(dataToImport);

            return { 
                success: true, 
                imported: Object.keys(dataToImport),
                timestamp: importData.timestamp 
            };
        } catch (error) {
            console.error('DataManager.importData error:', error);
            return { success: false, error: error.message };
        }
    }
}

/**
 * Keyboard Shortcuts Handler
 */
class KeyboardShortcuts {
    static init() {
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    static handleKeydown(event) {
        // Ctrl/Cmd + K: Open search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }

        // Ctrl/Cmd + G: Group tabs by domain
        if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
            event.preventDefault();
            TabOperations.groupByDomain();
        }

        // Ctrl/Cmd + E: Export data
        if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
            event.preventDefault();
            DataManager.exportData();
        }

        // Escape: Close any open modals or clear search
        if (event.key === 'Escape') {
            const searchInput = document.getElementById('searchInput');
            if (searchInput && searchInput.value) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            }
        }

        // Arrow navigation for tab list
        if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
            this.handleArrowNavigation(event);
        }
    }

    static handleArrowNavigation(event) {
        const tabEntries = document.querySelectorAll('.tab-entry');
        const currentFocus = document.activeElement;
        const currentIndex = Array.from(tabEntries).indexOf(currentFocus);

        if (currentIndex === -1) return;

        event.preventDefault();
        let nextIndex;

        if (event.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % tabEntries.length;
        } else {
            nextIndex = (currentIndex - 1 + tabEntries.length) % tabEntries.length;
        }

        tabEntries[nextIndex].focus();
    }
}

/**
 * Session Management
 */
class SessionManager {
    static async saveSession(name) {
        try {
            const tabs = await chrome.tabs.query({});
            const session = {
                name,
                timestamp: Date.now(),
                tabs: tabs.map(tab => ({
                    url: tab.url,
                    title: tab.title,
                    pinned: tab.pinned,
                    groupId: tab.groupId
                }))
            };

            const { savedSessions = [] } = await chrome.storage.local.get(['savedSessions']);
            savedSessions.push(session);

            await chrome.storage.local.set({ savedSessions });
            return { success: true, sessionId: session.timestamp };
        } catch (error) {
            console.error('SessionManager.saveSession error:', error);
            return { success: false, error: error.message };
        }
    }

    static async restoreSession(sessionId) {
        try {
            const { savedSessions = [] } = await chrome.storage.local.get(['savedSessions']);
            const session = savedSessions.find(s => s.timestamp === sessionId);

            if (!session) {
                throw new Error('Session not found');
            }

            // Create new window with session tabs
            const window = await chrome.windows.create({ focused: true });
            await chrome.tabs.remove(window.tabs[0].id); // Remove default tab

            for (const tabData of session.tabs) {
                await chrome.tabs.create({
                    url: tabData.url,
                    windowId: window.id,
                    pinned: tabData.pinned,
                    active: false
                });
            }

            return { success: true, tabsRestored: session.tabs.length };
        } catch (error) {
            console.error('SessionManager.restoreSession error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.TabOperations = TabOperations;
    window.DataManager = DataManager;
    window.KeyboardShortcuts = KeyboardShortcuts;
    window.SessionManager = SessionManager;
}
