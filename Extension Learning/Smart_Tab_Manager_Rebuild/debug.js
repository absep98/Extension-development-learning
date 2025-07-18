/**
 * Debug Panel JavaScript for Smart Tab Manager
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeDebugPanel();
});

function initializeDebugPanel() {
    // Initialize event listeners
    document.querySelector('[data-action="testGroupTabs"]')?.addEventListener('click', testGroupTabs);
    document.querySelector('[data-action="testDuplicateTab"]')?.addEventListener('click', testDuplicateTab);
    document.querySelector('[data-action="testExportData"]')?.addEventListener('click', testExportData);
    document.querySelector('[data-action="testSaveSession"]')?.addEventListener('click', testSaveSession);
    
    // Welcome message
    addResult('🚀 Debug panel loaded successfully', 'success');
    addResult('Click buttons above to test advanced features', 'info');
}

function addResult(message, type = 'info') {
    const testResults = document.getElementById('testResults');
    if (!testResults) return;
    
    const div = document.createElement('div');
    div.className = `test-result ${type}-result`;
    div.textContent = new Date().toLocaleTimeString() + ': ' + message;
    testResults.appendChild(div);
    testResults.scrollTop = testResults.scrollHeight;
}

// Tab Operations Tests
async function testGroupTabs() {
    try {
        addResult('Testing tab grouping by domain...', 'info');
        
        // Use the same logic as in advanced-testing.js
        const tabs = await chrome.tabs.query({});
        const domains = {};
        
        tabs.forEach(tab => {
            try {
                const domain = new URL(tab.url).hostname;
                if (!domains[domain]) domains[domain] = [];
                domains[domain].push(tab);
            } catch (e) {
                // Skip invalid URLs
            }
        });
        
        const domainCount = Object.keys(domains).length;
        addResult(`✅ Successfully grouped ${domainCount} domains`, 'success');
    } catch (error) {
        addResult(`❌ Error: ${error.message}`, 'error');
    }
}

async function testDuplicateTab() {
    try {
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        const currentTab = tabs[0];
        addResult(`Duplicating tab: ${currentTab.title}`, 'info');
        
        const newTab = await chrome.tabs.create({ url: currentTab.url, active: false });
        addResult(`✅ Successfully duplicated tab (ID: ${newTab.id})`, 'success');
    } catch (error) {
        addResult(`❌ Error: ${error.message}`, 'error');
    }
}

// Data Management Tests
async function testExportData() {
    try {
        addResult('Testing data export...', 'info');
        
        const data = await chrome.storage.local.get(null);
        const exportData = {
            timestamp: Date.now(),
            version: "1.0",
            data: data
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smart-tab-manager-debug-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        addResult(`✅ Successfully exported data (${Math.round(blob.size / 1024)} KB)`, 'success');
    } catch (error) {
        addResult(`❌ Error: ${error.message}`, 'error');
    }
}

// Session Management Tests
async function testSaveSession() {
    try {
        const sessionName = 'Debug Test Session - ' + new Date().toLocaleTimeString();
        addResult(`Saving session: ${sessionName}`, 'info');
        
        const tabs = await chrome.tabs.query({});
        const sessionData = {
            name: sessionName,
            timestamp: Date.now(),
            tabs: tabs.map(tab => ({ url: tab.url, title: tab.title }))
        };
        
        const { savedSessions = [] } = await chrome.storage.local.get(['savedSessions']);
        savedSessions.push(sessionData);
        await chrome.storage.local.set({ savedSessions });
        
        addResult(`✅ Successfully saved session with ${sessionData.tabs.length} tabs`, 'success');
    } catch (error) {
        addResult(`❌ Error: ${error.message}`, 'error');
    }
}
