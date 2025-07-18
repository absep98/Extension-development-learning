/**
 * Privacy and Security Manager
 */
class PrivacyManager {
    static async encryptSensitiveData(data) {
        try {
            // Simple encryption for demonstration - in production use Web Crypto API
            const encoded = btoa(JSON.stringify(data));
            return encoded;
        } catch (error) {
            ErrorHandler.handle(error, 'PrivacyManager.encryptSensitiveData');
            return null;
        }
    }

    static async decryptSensitiveData(encryptedData) {
        try {
            const decoded = JSON.parse(atob(encryptedData));
            return decoded;
        } catch (error) {
            ErrorHandler.handle(error, 'PrivacyManager.decryptSensitiveData');
            return null;
        }
    }

    static async anonymizeAnalytics() {
        try {
            const storage = new StorageManager();
            const { focusStats, focusHistory } = await storage.get(['focusStats', 'focusHistory']);

            // Anonymize domain names but keep structure for analytics
            const anonymized = {
                focusStats: this.anonymizeUrls(focusStats),
                focusHistory: this.anonymizeUrlHistory(focusHistory)
            };

            await storage.set({
                anonymizedAnalytics: anonymized,
                lastAnonymized: Date.now()
            });

            return { success: true };
        } catch (error) {
            ErrorHandler.handle(error, 'PrivacyManager.anonymizeAnalytics');
            return { success: false, error: error.message };
        }
    }

    static anonymizeUrls(stats) {
        const anonymized = {};
        let counter = 1;
        const domainMap = new Map();

        for (const [url, time] of Object.entries(stats)) {
            let anonymizedUrl;
            if (domainMap.has(url)) {
                anonymizedUrl = domainMap.get(url);
            } else {
                anonymizedUrl = `domain-${counter++}`;
                domainMap.set(url, anonymizedUrl);
            }
            anonymized[anonymizedUrl] = time;
        }

        return anonymized;
    }

    static anonymizeUrlHistory(history) {
        const anonymized = {};
        let counter = 1;
        const domainMap = new Map();

        for (const [url, sessions] of Object.entries(history)) {
            let anonymizedUrl;
            if (domainMap.has(url)) {
                anonymizedUrl = domainMap.get(url);
            } else {
                anonymizedUrl = `domain-${counter++}`;
                domainMap.set(url, anonymizedUrl);
            }
            anonymized[anonymizedUrl] = sessions;
        }

        return anonymized;
    }

    static async purgeOldData(daysToKeep = 30) {
        try {
            const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
            const storage = new StorageManager();
            const { focusHistory } = await storage.get(['focusHistory']);

            const purgedHistory = {};
            let purgedSessions = 0;
            let totalSessions = 0;

            for (const [domain, sessions] of Object.entries(focusHistory || {})) {
                const filteredSessions = sessions.filter(session => {
                    totalSessions++;
                    if (session.timestamp >= cutoff) {
                        return true;
                    } else {
                        purgedSessions++;
                        return false;
                    }
                });

                if (filteredSessions.length > 0) {
                    purgedHistory[domain] = filteredSessions;
                }
            }

            await storage.set({ focusHistory: purgedHistory });

            return {
                success: true,
                purgedSessions,
                totalSessions,
                retainedSessions: totalSessions - purgedSessions
            };
        } catch (error) {
            ErrorHandler.handle(error, 'PrivacyManager.purgeOldData');
            return { success: false, error: error.message };
        }
    }

    static async getPrivacyReport() {
        try {
            const storage = new StorageManager();
            const data = await storage.get([
                'focusStats',
                'focusHistory',
                'customDomainCategories',
                'smartTabFavorites',
                'blockedDomains'
            ]);

            const report = {
                totalDomains: Object.keys(data.focusStats || {}).length,
                totalSessions: Object.values(data.focusHistory || {})
                    .reduce((total, sessions) => total + sessions.length, 0),
                customCategories: Object.keys(data.customDomainCategories || {}).length,
                favoritesSaved: (data.smartTabFavorites || []).length,
                blockedDomains: (data.blockedDomains || []).length,
                oldestSession: this.getOldestSession(data.focusHistory),
                storageUsed: JSON.stringify(data).length
            };

            return report;
        } catch (error) {
            ErrorHandler.handle(error, 'PrivacyManager.getPrivacyReport');
            return null;
        }
    }

    static getOldestSession(focusHistory) {
        let oldest = Date.now();
        for (const sessions of Object.values(focusHistory || {})) {
            for (const session of sessions) {
                if (session.timestamp < oldest) {
                    oldest = session.timestamp;
                }
            }
        }
        return oldest === Date.now() ? null : new Date(oldest);
    }

    static async wipeAllData() {
        try {
            const storage = new StorageManager();
            await storage.set({
                focusStats: {},
                focusHistory: {},
                customDomainCategories: {},
                smartTabFavorites: [],
                blockedDomains: [],
                anonymizedAnalytics: null,
                lastAnonymized: null
            });

            storage.clearCache();
            return { success: true };
        } catch (error) {
            ErrorHandler.handle(error, 'PrivacyManager.wipeAllData');
            return { success: false, error: error.message };
        }
    }
}

/**
 * Content Security Policy helpers
 */
class SecurityUtils {
    static sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    static isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static sanitizeDomainName(domain) {
        return domain.replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase();
    }

    static validatePermissions() {
        const required = ['bookmarks', 'storage', 'tabs', 'tabGroups', 'declarativeNetRequest'];
        const manifest = chrome.runtime.getManifest();
        const granted = manifest.permissions || [];

        return required.every(permission => granted.includes(permission));
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.PrivacyManager = PrivacyManager;
    window.SecurityUtils = SecurityUtils;
}
