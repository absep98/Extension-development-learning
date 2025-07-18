/**
 * Logger utility with different levels for development vs production
 */
class Logger {
    constructor(level = 'info') {
        this.level = level;
        this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
        this.isDevelopment = !('update_url' in chrome.runtime.getManifest());
    }

    error(...args) {
        if (this.shouldLog('error')) {
            console.error('🚨 [ERROR]', ...args);
        }
    }

    warn(...args) {
        if (this.shouldLog('warn')) {
            console.warn('⚠️ [WARN]', ...args);
        }
    }

    info(...args) {
        if (this.shouldLog('info')) {
            console.log('ℹ️ [INFO]', ...args);
        }
    }

    debug(...args) {
        if (this.shouldLog('debug') && this.isDevelopment) {
            console.log('🐛 [DEBUG]', ...args);
        }
    }

    shouldLog(level) {
        return this.levels[level] <= this.levels[this.level];
    }
}

/**
 * Configuration management
 */
class Config {
    static get defaults() {
        return {
            timeTracking: {
                minSessionDuration: 500, // ms
                backupInterval: 30000,   // 30 seconds
                dataRetentionDays: 30
            },
            ui: {
                animationDuration: 200,
                loadingTimeout: 5000,
                autoSaveDelay: 500
            },
            analytics: {
                enableAdvancedInsights: true,
                categoryUpdateInterval: 1000,
                maxSuggestions: 8
            }
        };
    }

    static async get(key) {
        return new Promise((resolve) => {
            chrome.storage.sync.get([key], (data) => {
                resolve(data[key] || this.getNestedDefault(key));
            });
        });
    }

    static getNestedDefault(key) {
        return key.split('.').reduce((obj, k) => obj?.[k], this.defaults);
    }
}

/**
 * Enhanced error handling with user-friendly messages
 */
class ErrorHandler {
    static handle(error, context = 'Unknown') {
        const logger = new Logger();
        
        const userMessage = this.getUserFriendlyMessage(error);
        const technicalDetails = {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        };

        logger.error(`Error in ${context}:`, technicalDetails);
        
        // Show user-friendly notification
        this.showNotification(userMessage, 'error');
        
        return { userMessage, technicalDetails };
    }

    static getUserFriendlyMessage(error) {
        if (error.message.includes('storage')) {
            return 'Unable to save your settings. Please try again.';
        }
        if (error.message.includes('tabs')) {
            return 'Unable to access tab information. Please refresh and try again.';
        }
        if (error.message.includes('network')) {
            return 'Network error. Please check your connection.';
        }
        return 'Something went wrong. Please try again or restart the extension.';
    }

    static showNotification(message, type = 'info') {
        // Implementation would depend on your notification system
        // Remove console.log for production
    }
}

/**
 * Storage utilities with error handling and caching
 */
class StorageManager {
    constructor() {
        this.cache = new Map();
        this.logger = new Logger();
    }

    async get(keys, useCache = true) {
        try {
            if (useCache && this.cache.has(keys)) {
                return this.cache.get(keys);
            }

            const data = await new Promise((resolve, reject) => {
                chrome.storage.local.get(keys, (result) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(result);
                    }
                });
            });

            if (useCache) {
                this.cache.set(keys, data);
            }

            return data;
        } catch (error) {
            ErrorHandler.handle(error, 'StorageManager.get');
            return {};
        }
    }

    async set(data) {
        try {
            await new Promise((resolve, reject) => {
                chrome.storage.local.set(data, () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve();
                    }
                });
            });

            // Update cache
            Object.keys(data).forEach(key => {
                this.cache.delete(key);
            });

            this.logger.debug('Data saved successfully:', Object.keys(data));
        } catch (error) {
            ErrorHandler.handle(error, 'StorageManager.set');
            throw error;
        }
    }

    clearCache() {
        this.cache.clear();
        this.logger.debug('Storage cache cleared');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Logger, Config, ErrorHandler, StorageManager };
} else {
    window.ExtensionUtils = { Logger, Config, ErrorHandler, StorageManager };
}
