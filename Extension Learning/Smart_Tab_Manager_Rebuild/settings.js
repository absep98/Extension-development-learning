// settings.js - Domain Categories Management

// Category metadata with emojis and descriptions
const CATEGORY_META = {
    productivity: { emoji: '💼', name: 'Productivity', description: 'Work tools, development, documentation' },
    education: { emoji: '📚', name: 'Education', description: 'Learning platforms, courses, tutorials' },
    entertainment: { emoji: '🎬', name: 'Entertainment', description: 'Videos, music, games, streaming' },
    social: { emoji: '👥', name: 'Social', description: 'Social media, messaging, forums' },
    news: { emoji: '📰', name: 'News', description: 'News sites, blogs, current events' },
    other: { emoji: '🌐', name: 'Other', description: 'Uncategorized domains' }
};

// Default domains (from aiInsights.js)
const DEFAULT_CATEGORIES = {
    productivity: [
        'github.com', 'stackoverflow.com', 'gitlab.com', 'bitbucket.org',
        'notion.so', 'trello.com', 'asana.com', 'slack.com', 'teams.microsoft.com',
        'docs.google.com', 'sheets.google.com', 'drive.google.com',
        'figma.com', 'canva.com', 'adobe.com',
        'chatgpt.com', 'openai.com', 'chat.openai.com', 'claude.ai', 'anthropic.com',
        'copilot.github.com', 'bard.google.com', 'gemini.google.com',
        'codepen.io', 'replit.com', 'codesandbox.io', 'jsfiddle.net',
        'miro.com', 'lucidchart.com', 'draw.io', 'excalidraw.com',
        'developer.mozilla.org', 'w3schools.com', 'geeksforgeeks.org', 'workat.tech', 'leetcode.com', 'kaggle.com'
    ],
    education: [
        'coursera.org', 'udemy.com', 'khanacademy.org', 'edx.org',
        'codecademy.com', 'freecodecamp.org', 'pluralsight.com',
        'skillshare.com', 'udacity.com', 'lynda.com'
    ],
    entertainment: [
        'youtube.com', 'netflix.com', 'spotify.com', 'twitch.tv',
        'hulu.com', 'disneyplus.com', 'amazon.com/prime',
        'soundcloud.com', 'apple.com/music', 'pandora.com'
    ],
    social: [
        'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
        'reddit.com', 'tiktok.com', 'snapchat.com', 'discord.com',
        'whatsapp.com', 'telegram.org', 'pinterest.com'
    ],
    news: [
        'cnn.com', 'bbc.com', 'nytimes.com', 'techcrunch.com',
        'reddit.com/r/news', 'news.google.com', 'reuters.com',
        'theverge.com', 'arstechnica.com', 'medium.com'
    ]
};

let customCategories = {};
let userBrowsingData = {};

// Initialize the settings page
document.addEventListener('DOMContentLoaded', async () => {
    await loadCustomCategories();
    await loadBrowsingData();
    renderCategories();
    renderSuggestions();
    
    // Add event listeners
    document.getElementById('resetBtn').addEventListener('click', resetToDefaults);
});

// Load custom categories from storage
async function loadCustomCategories() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['customDomainCategories'], (data) => {
            customCategories = data.customDomainCategories || {};
            resolve();
        });
    });
}

// Load user's browsing data for suggestions
async function loadBrowsingData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['focusStats'], (data) => {
            userBrowsingData = data.focusStats || {};
            resolve();
        });
    });
}

// Render all category sections
function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    container.innerHTML = '';
    
    Object.entries(CATEGORY_META).forEach(([category, meta]) => {
        if (category === 'other') return; // Skip 'other' category
        
        const section = createCategorySection(category, meta);
        container.appendChild(section);
    });
}

// Create a category section
function createCategorySection(category, meta) {
    const section = document.createElement('div');
    section.className = 'category-section';
    
    // Get all domains for this category (default + custom)
    const defaultDomains = DEFAULT_CATEGORIES[category] || [];
    const customDomains = customCategories[category] || [];
    
    section.innerHTML = `
        <div class="category-header">
            <span class="category-emoji">${meta.emoji}</span>
            <span>${meta.name}</span>
            <span style="margin-left: 10px; font-size: 12px; color: #666; font-weight: normal;">${meta.description}</span>
        </div>
        
        <div class="domain-list" id="domains-${category}">
            ${defaultDomains.map(domain => `
                <div class="domain-tag">
                    <span>${domain}</span>
                </div>
            `).join('')}
            ${customDomains.map(domain => `
                <div class="domain-tag custom">
                    <span>${domain}</span>
                    <span class="remove-domain" data-category="${category}" data-domain="${domain}">×</span>
                </div>
            `).join('')}
        </div>
        
        <div class="add-domain-form">
            <input type="text" class="add-domain-input" id="input-${category}" 
                   placeholder="Add domain (e.g., example.com)" 
                   data-category="${category}">
            <button class="add-domain-btn" data-category="${category}">+ Add</button>
        </div>
    `;
    
    // Add event listeners after creating the HTML
    const addButton = section.querySelector('.add-domain-btn');
    const input = section.querySelector('.add-domain-input');
    const removeButtons = section.querySelectorAll('.remove-domain');
    
    // Add domain button click
    addButton.addEventListener('click', () => addDomain(category));
    
    // Enter key in input
    input.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addDomain(category);
        }
    });
    
    // Remove domain buttons
    removeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const domain = button.getAttribute('data-domain');
            removeDomain(category, domain);
        });
    });
    
    return section;
}

// Add domain to category
async function addDomain(category) {
    const input = document.getElementById(`input-${category}`);
    const domain = input.value.trim().toLowerCase();
    
    if (!domain) return;
    
    // Validate domain format
    if (!isValidDomain(domain)) {
        showStatus('Invalid domain format. Use format like "example.com"', 'error');
        return;
    }
    
    // Initialize category if not exists
    if (!customCategories[category]) {
        customCategories[category] = [];
    }
    
    // Check if domain already exists
    const allDomains = [...(DEFAULT_CATEGORIES[category] || []), ...customCategories[category]];
    if (allDomains.includes(domain)) {
        showStatus('Domain already exists in this category', 'error');
        return;
    }
    
    // Add domain
    customCategories[category].push(domain);
    
    // Save to storage
    await saveCustomCategories();
    
    // Update UI
    input.value = '';
    renderCategories();
    showStatus(`Added ${domain} to ${CATEGORY_META[category].name}`, 'success');
}

// Remove custom domain
async function removeDomain(category, domain) {
    if (!customCategories[category]) return;
    
    customCategories[category] = customCategories[category].filter(d => d !== domain);
    
    // Clean up empty categories
    if (customCategories[category].length === 0) {
        delete customCategories[category];
    }
    
    await saveCustomCategories();
    renderCategories();
    showStatus(`Removed ${domain} from ${CATEGORY_META[category].name}`, 'success');
}

// Validate domain format
function isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/;
    return domainRegex.test(domain) || domain.includes('.com') || domain.includes('.org') || domain.includes('.net');
}

// Save custom categories to storage
async function saveCustomCategories() {
    return new Promise((resolve) => {
        chrome.storage.local.set({ customDomainCategories: customCategories }, () => {
            resolve();
        });
    });
}

// Render suggestions based on user's browsing data
function renderSuggestions() {
    const container = document.getElementById('suggestionsContainer');
    const uncategorizedDomains = getUncategorizedDomains();
    
    if (uncategorizedDomains.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = `
        <div class="auto-suggestions">
            <div class="suggestion-header">💡 Suggested Categorizations (from your browsing history)</div>
            ${uncategorizedDomains.slice(0, 8).map(({ domain, suggestedCategory, time }) => `
                <div class="suggestion-item">
                    <div>
                        <span class="suggestion-domain">${domain}</span>
                        <span style="color: #999; font-size: 12px;">(${formatTime(time)})</span>
                    </div>
                    <div>
                        <span style="margin-right: 10px; font-size: 12px;">→ ${CATEGORY_META[suggestedCategory].emoji} ${CATEGORY_META[suggestedCategory].name}</span>
                        <button class="suggestion-btn" data-domain="${domain}" data-category="${suggestedCategory}">Add</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Add event listeners for suggestion buttons
    container.querySelectorAll('.suggestion-btn').forEach(button => {
        button.addEventListener('click', () => {
            const domain = button.getAttribute('data-domain');
            const category = button.getAttribute('data-category');
            acceptSuggestion(domain, category);
        });
    });
}

// Get uncategorized domains from user's browsing data
function getUncategorizedDomains() {
    const allCategorizedDomains = new Set();
    
    // Collect all categorized domains
    Object.values(DEFAULT_CATEGORIES).forEach(domains => {
        domains.forEach(domain => allCategorizedDomains.add(domain));
    });
    
    Object.values(customCategories).forEach(domains => {
        domains.forEach(domain => allCategorizedDomains.add(domain));
    });
    
    // Find uncategorized domains from user's browsing data
    const uncategorized = [];
    Object.entries(userBrowsingData).forEach(([domain, time]) => {
        // Clean domain
        const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
        
        // Check if it's already categorized
        const isAlreadyCategorized = Array.from(allCategorizedDomains).some(catDomain => 
            cleanDomain.includes(catDomain) || catDomain.includes(cleanDomain)
        );
        
        if (!isAlreadyCategorized && time > 30000) { // Only suggest domains with >30s usage
            uncategorized.push({
                domain: cleanDomain,
                time,
                suggestedCategory: suggestCategory(cleanDomain)
            });
        }
    });
    
    return uncategorized.sort((a, b) => b.time - a.time); // Sort by usage time
}

// Simple AI-like category suggestion
function suggestCategory(domain) {
    const domainLower = domain.toLowerCase();
    
    if (domainLower.includes('learn') || domainLower.includes('course') || domainLower.includes('tutorial') || domainLower.includes('edu')) {
        return 'education';
    }
    if (domainLower.includes('git') || domainLower.includes('code') || domainLower.includes('dev') || domainLower.includes('docs')) {
        return 'productivity';
    }
    if (domainLower.includes('news') || domainLower.includes('blog') || domainLower.includes('tech')) {
        return 'news';
    }
    if (domainLower.includes('social') || domainLower.includes('chat') || domainLower.includes('meet')) {
        return 'social';
    }
    if (domainLower.includes('video') || domainLower.includes('music') || domainLower.includes('game') || domainLower.includes('stream')) {
        return 'entertainment';
    }
    
    return 'productivity'; // Default suggestion
}

// Accept suggestion
async function acceptSuggestion(domain, category) {
    if (!customCategories[category]) {
        customCategories[category] = [];
    }
    
    customCategories[category].push(domain);
    await saveCustomCategories();
    
    renderCategories();
    renderSuggestions();
    showStatus(`Added ${domain} to ${CATEGORY_META[category].name}`, 'success');
}

// Reset to defaults
async function resetToDefaults() {
    // Create a custom confirmation dialog instead of browser alert
    const confirmed = await showConfirmDialog(
        'Reset Categories', 
        'Are you sure you want to reset all custom categorizations? This cannot be undone.'
    );
    
    if (confirmed) {
        customCategories = {};
        await saveCustomCategories();
        renderCategories();
        renderSuggestions();
        showStatus('Reset to default categories', 'success');
    }
}

// Custom confirmation dialog
function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 10000; display: flex;
            align-items: center; justify-content: center;
        `;
        
        // Create modal dialog
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white; padding: 20px; border-radius: 8px; max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3); text-align: center;
        `;
        
        modal.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #333;">${title}</h3>
            <p style="margin: 0 0 20px 0; color: #666;">${message}</p>
            <div>
                <button id="confirmYes" style="background: #dc3545; color: white; border: none; padding: 8px 16px; margin: 0 5px; border-radius: 4px; cursor: pointer;">Yes, Reset</button>
                <button id="confirmNo" style="background: #6c757d; color: white; border: none; padding: 8px 16px; margin: 0 5px; border-radius: 4px; cursor: pointer;">Cancel</button>
            </div>
        `;
        
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);
        
        // Add event listeners
        document.getElementById('confirmYes').addEventListener('click', () => {
            document.body.removeChild(backdrop);
            resolve(true);
        });
        
        document.getElementById('confirmNo').addEventListener('click', () => {
            document.body.removeChild(backdrop);
            resolve(false);
        });
        
        // Close on backdrop click
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                document.body.removeChild(backdrop);
                resolve(false);
            }
        });
    });
}

// Show status message
function showStatus(message, type) {
    const statusEl = document.getElementById('saveStatus');
    statusEl.textContent = message;
    statusEl.className = `save-status ${type}`;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 3000);
}

// Format time for display
function formatTime(ms) {
    const minutes = Math.round(ms / (1000 * 60));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    return `${hours}h ${remMin}m`;
}
