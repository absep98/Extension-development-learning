// Performance optimizations and error handling improvements

// 1. Add error boundaries and retry logic
class ExtensionError extends Error {
    constructor(message, code, retryable = false) {
        super(message);
        this.code = code;
        this.retryable = retryable;
    }
}

// 2. Debounced storage operations
const debouncedSave = debounce((data) => {
    chrome.storage.local.set(data);
}, 500);

// 3. Performance monitoring
const PerformanceTracker = {
    start(operation) {
        this.timers = this.timers || {};
        this.timers[operation] = performance.now();
    },
    
    end(operation) {
        if (this.timers && this.timers[operation]) {
            const duration = performance.now() - this.timers[operation];
            console.log(`⏱️ ${operation}: ${duration.toFixed(2)}ms`);
            delete this.timers[operation];
        }
    }
};

// 4. Memory usage monitoring
const MemoryTracker = {
    track() {
        if ('memory' in performance) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                total: Math.round(performance.memory.totalJSHeapSize / 1048576),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
            };
        }
        return null;
    }
};

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
