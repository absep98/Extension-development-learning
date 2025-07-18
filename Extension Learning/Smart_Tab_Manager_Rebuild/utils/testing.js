/**
 * Testing utilities for Chrome Extension
 */
class ExtensionTester {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    addTest(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async runAllTests() {
        console.log('🧪 Running Extension Tests...');
        console.log('================================');

        for (const test of this.tests) {
            try {
                const startTime = performance.now();
                const result = await test.testFn();
                const duration = performance.now() - startTime;

                this.results.push({
                    name: test.name,
                    passed: true,
                    duration: Math.round(duration),
                    result
                });

                console.log(`✅ ${test.name} (${Math.round(duration)}ms)`);
            } catch (error) {
                this.results.push({
                    name: test.name,
                    passed: false,
                    error: error.message
                });

                console.error(`❌ ${test.name}: ${error.message}`);
            }
        }

        this.printSummary();
        return this.results;
    }

    printSummary() {
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        
        console.log('\n📊 Test Summary');
        console.log('================');
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${total - passed}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    }
}

// Test Suite
const testSuite = new ExtensionTester();

// Storage Tests
testSuite.addTest('Storage - Save and Retrieve', async () => {
    const storage = new StorageManager();
    const testData = { testKey: 'testValue', timestamp: Date.now() };
    
    await storage.set(testData);
    const retrieved = await storage.get(['testKey', 'timestamp']);
    
    if (retrieved.testKey !== testData.testKey) {
        throw new Error('Data mismatch in storage test');
    }
    
    return 'Storage operations successful';
});

// Tab Operations Tests
testSuite.addTest('Tab Operations - Get Current Tabs', async () => {
    const tabs = await chrome.tabs.query({});
    
    if (!Array.isArray(tabs) || tabs.length === 0) {
        throw new Error('No tabs found or invalid response');
    }
    
    return `Found ${tabs.length} tabs`;
});

// AI Insights Tests
testSuite.addTest('AI Insights - Category Detection', async () => {
    const { categorizeDomainSync } = await import('./aiInsights.js');
    
    const testCases = [
        { domain: 'github.com', expected: 'productivity' },
        { domain: 'youtube.com', expected: 'entertainment' },
        { domain: 'unknown-domain.xyz', expected: 'other' }
    ];
    
    for (const testCase of testCases) {
        const result = categorizeDomainSync(testCase.domain);
        if (result !== testCase.expected) {
            throw new Error(`Domain ${testCase.domain} categorized as ${result}, expected ${testCase.expected}`);
        }
    }
    
    return 'Category detection working correctly';
});

// Performance Tests
testSuite.addTest('Performance - Analytics Generation', async () => {
    const { getAIProductivityInsights } = await import('./aiInsights.js');
    
    const startTime = performance.now();
    await getAIProductivityInsights();
    const duration = performance.now() - startTime;
    
    if (duration > 2000) {
        throw new Error(`Analytics generation too slow: ${Math.round(duration)}ms`);
    }
    
    return `Analytics generated in ${Math.round(duration)}ms`;
});

// Security Tests
testSuite.addTest('Security - Input Validation', async () => {
    const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:void(0)',
        '../../etc/passwd',
        'DROP TABLE users;'
    ];
    
    for (const input of maliciousInputs) {
        const sanitized = SecurityUtils.sanitizeHTML(input);
        if (sanitized.includes('<script>') || sanitized.includes('javascript:')) {
            throw new Error(`Malicious input not properly sanitized: ${input}`);
        }
    }
    
    return 'Input validation working correctly';
});

// Privacy Tests
testSuite.addTest('Privacy - Data Anonymization', async () => {
    const testData = {
        'sensitive-site.com': 150000,
        'work-internal.company.com': 300000
    };
    
    const anonymized = PrivacyManager.anonymizeUrls(testData);
    
    // Check that original URLs are not present
    for (const originalUrl of Object.keys(testData)) {
        if (Object.keys(anonymized).includes(originalUrl)) {
            throw new Error('Original URL found in anonymized data');
        }
    }
    
    // Check that time values are preserved
    const originalSum = Object.values(testData).reduce((a, b) => a + b, 0);
    const anonymizedSum = Object.values(anonymized).reduce((a, b) => a + b, 0);
    
    if (originalSum !== anonymizedSum) {
        throw new Error('Time values not preserved during anonymization');
    }
    
    return 'Data anonymization working correctly';
});

// UI Tests
testSuite.addTest('UI - Popup Elements Present', async () => {
    const requiredElements = [
        'searchInput',
        'tabList',
        'favoriteList',
        'settingsBtn'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        throw new Error(`Missing UI elements: ${missingElements.join(', ')}`);
    }
    
    return 'All required UI elements present';
});

// Export test runner
if (typeof window !== 'undefined') {
    window.ExtensionTester = ExtensionTester;
    window.runTests = () => testSuite.runAllTests();
}

// Auto-run tests in development
document.addEventListener('DOMContentLoaded', () => {
    const isDevelopment = !chrome.runtime.getManifest().update_url;
    if (isDevelopment && window.location.href.includes('debug.html')) {
        console.log('🔧 Development mode detected - running tests');
        setTimeout(() => testSuite.runAllTests(), 1000);
    }
});
