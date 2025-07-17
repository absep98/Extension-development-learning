// aiInsights.js - AI-Powered Productivity Analysis

// Categories for domain classification
const DOMAIN_CATEGORIES = {
    productivity: [
        'github.com', 'stackoverflow.com', 'gitlab.com', 'bitbucket.org',
        'notion.so', 'trello.com', 'asana.com', 'slack.com', 'teams.microsoft.com',
        'docs.google.com', 'sheets.google.com', 'drive.google.com',
        'figma.com', 'canva.com', 'adobe.com',
        // AI & Development Tools
        'chatgpt.com', 'openai.com', 'chat.openai.com', 'claude.ai', 'anthropic.com',
        'copilot.github.com', 'bard.google.com', 'gemini.google.com',
        // Code & Text Editors
        'codepen.io', 'replit.com', 'codesandbox.io', 'jsfiddle.net',
        // Design & Productivity
        'miro.com', 'lucidchart.com', 'draw.io', 'excalidraw.com',
        // Documentation & Learning
        'developer.mozilla.org', 'w3schools.com', 'geeksforgeeks.org', 'workat.tech', 'leetcode.com', 'kaggle.com'
    ],
    social: [
        'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
        'reddit.com', 'tiktok.com', 'snapchat.com', 'discord.com',
        'whatsapp.com', 'telegram.org', 'pinterest.com'
    ],
    entertainment: [
        'youtube.com', 'netflix.com', 'spotify.com', 'twitch.tv',
        'hulu.com', 'disneyplus.com', 'amazon.com/prime',
        'soundcloud.com', 'apple.com/music', 'pandora.com'
    ],
    news: [
        'cnn.com', 'bbc.com', 'nytimes.com', 'techcrunch.com',
        'reddit.com/r/news', 'news.google.com', 'reuters.com',
        'theverge.com', 'arstechnica.com', 'medium.com'
    ],
    education: [
        'coursera.org', 'udemy.com', 'khanacademy.org', 'edx.org',
        'codecademy.com', 'freecodecamp.org', 'pluralsight.com',
        'skillshare.com', 'udacity.com', 'lynda.com'
    ]
};

// Categorize a domain using both default and custom categories
function categorizeDomain(domain) {
    // Clean the domain - remove www, https, etc.
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
    
    return new Promise((resolve) => {
        // Get custom categories from storage
        chrome.storage.local.get(['customDomainCategories'], (data) => {
            const customCategories = data.customDomainCategories || {};
            
            // First check custom categories (user preferences take priority)
            for (const [category, domains] of Object.entries(customCategories)) {
                if (domains.some(d => cleanDomain.includes(d) || d.includes(cleanDomain))) {
                    resolve(category);
                    return;
                }
            }
            
            // Then check default categories
            for (const [category, domains] of Object.entries(DOMAIN_CATEGORIES)) {
                if (domains.some(d => cleanDomain.includes(d) || d.includes(cleanDomain))) {
                    resolve(category);
                    return;
                }
            }
            
            resolve('other');
        });
    });
}

// Synchronous version for when we already have the custom categories
function categorizeDomainSync(domain, customCategories = {}) {
    // Clean the domain - remove www, https, etc.
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
    
    // First check custom categories (user preferences take priority)
    for (const [category, domains] of Object.entries(customCategories)) {
        if (domains.some(d => cleanDomain.includes(d) || d.includes(cleanDomain))) {
            return category;
        }
    }
    
    // Then check default categories
    for (const [category, domains] of Object.entries(DOMAIN_CATEGORIES)) {
        if (domains.some(d => cleanDomain.includes(d) || d.includes(cleanDomain))) {
            return category;
        }
    }
    
    return 'other';
}

// Analyze browsing patterns with enhanced daily breakdown and custom categories
async function analyzeBrowsingData(focusStats, focusHistory) {
    // Get custom categories first
    const customCategories = await new Promise((resolve) => {
        chrome.storage.local.get(['customDomainCategories'], (data) => {
            resolve(data.customDomainCategories || {});
        });
    });

    const analysis = {
        totalTime: 0,
        categories: {},
        topDomains: [],
        weeklyTrends: {},
        hourlyPatterns: {},
        dailyBreakdown: {},
        insights: []
    };

    // Calculate total time and categorize using custom categories
    for (const [domain, totalMs] of Object.entries(focusStats)) {
        analysis.totalTime += totalMs;
        const category = categorizeDomainSync(domain, customCategories);
        
        if (!analysis.categories[category]) {
            analysis.categories[category] = { time: 0, domains: [] };
        }
        analysis.categories[category].time += totalMs;
        analysis.categories[category].domains.push({ domain, time: totalMs });
    }

    // Sort top domains
    analysis.topDomains = Object.entries(focusStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([domain, time]) => ({ 
            domain, 
            time, 
            category: categorizeDomainSync(domain, customCategories) 
        }));

    // Analyze weekly trends and daily patterns
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * oneDayMs;
    const twoWeeksAgo = now - 14 * oneDayMs;
    
    let thisWeekTotal = 0;
    let lastWeekTotal = 0;

    // Enhanced daily breakdown for last 7 days
    for (let i = 0; i < 7; i++) {
        const dayStart = now - (i * oneDayMs);
        const dayStartOfDay = new Date(dayStart);
        dayStartOfDay.setHours(0, 0, 0, 0);
        const dayKey = dayStartOfDay.toDateString();
        
        analysis.dailyBreakdown[dayKey] = {
            date: dayKey,
            totalTime: 0,
            categories: {},
            topDomain: null,
            sessionCount: 0
        };
    }

    for (const [domain, sessions] of Object.entries(focusHistory)) {
        for (const session of sessions) {
            const sessionDate = new Date(session.timestamp);
            sessionDate.setHours(0, 0, 0, 0);
            const dayKey = sessionDate.toDateString();
            
            // Weekly trends
            if (session.timestamp >= weekAgo) {
                thisWeekTotal += session.duration;
            } else if (session.timestamp >= twoWeeksAgo) {
                lastWeekTotal += session.duration;
            }
            
            // Hourly patterns
            const hour = new Date(session.timestamp).getHours();
            if (!analysis.hourlyPatterns[hour]) {
                analysis.hourlyPatterns[hour] = 0;
            }
            analysis.hourlyPatterns[hour] += session.duration;
            
            // Daily breakdown
            if (analysis.dailyBreakdown[dayKey]) {
                analysis.dailyBreakdown[dayKey].totalTime += session.duration;
                analysis.dailyBreakdown[dayKey].sessionCount++;
                
                const category = categorizeDomainSync(domain, customCategories);
                if (!analysis.dailyBreakdown[dayKey].categories[category]) {
                    analysis.dailyBreakdown[dayKey].categories[category] = 0;
                }
                analysis.dailyBreakdown[dayKey].categories[category] += session.duration;
                
                // Track top domain for the day
                if (!analysis.dailyBreakdown[dayKey].topDomain || 
                    analysis.dailyBreakdown[dayKey].topDomain.time < session.duration) {
                    analysis.dailyBreakdown[dayKey].topDomain = { domain, time: session.duration };
                }
            }
        }
    }

    analysis.weeklyTrends = { thisWeek: thisWeekTotal, lastWeek: lastWeekTotal };

    return analysis;
}

// Generate AI insights using OpenAI-like analysis
async function generateProductivityInsights(analysis) {
    const insights = [];
    
    // Calculate category percentages
    const categoryPercentages = {};
    for (const [category, data] of Object.entries(analysis.categories)) {
        categoryPercentages[category] = ((data.time / analysis.totalTime) * 100).toFixed(1);
    }

    // Most productive hours with proper chronological sorting for display
    const productiveHours = Object.entries(analysis.hourlyPatterns)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => {
            const h = parseInt(hour);
            const period = h >= 12 ? 'PM' : 'AM';
            const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            return { hour: h, display: `${displayHour} ${period}` };
        });

    // Sort the top hours chronologically for better display
    const sortedForDisplay = productiveHours
        .slice(0, 2)
        .sort((a, b) => a.hour - b.hour)  // Sort by actual hour number
        .map(h => h.display);

    // Weekly trend analysis
    const weeklyChange = analysis.weeklyTrends.lastWeek > 0 
        ? (((analysis.weeklyTrends.thisWeek - analysis.weeklyTrends.lastWeek) / analysis.weeklyTrends.lastWeek) * 100).toFixed(1)
        : 0;

    // Generate insights
    if (categoryPercentages.productivity > 0) {
        insights.push(`📈 You spent ${categoryPercentages.productivity}% of your time on productivity tools this week`);
    }

    if (sortedForDisplay.length > 0) {
        insights.push(`⏰ You're most active during ${sortedForDisplay.join(' and ')}`);
    }

    if (Math.abs(weeklyChange) > 5) {
        const direction = weeklyChange > 0 ? 'increased' : 'decreased';
        insights.push(`📊 Your browsing time has ${direction} by ${Math.abs(weeklyChange)}% from last week`);
    }

    if (categoryPercentages.social > 30) {
        insights.push(`⚠️ Social media usage is ${categoryPercentages.social}% - consider setting focus limits`);
    }

    if (categoryPercentages.entertainment > 40) {
        insights.push(`🎯 Entertainment takes up ${categoryPercentages.entertainment}% of your time - great for work-life balance!`);
    }

    // Top domain insight
    if (analysis.topDomains[0]) {
        const topDomain = analysis.topDomains[0];
        const timeSpent = formatDuration(topDomain.time);
        insights.push(`🏆 Your most visited site is ${topDomain.domain} (${timeSpent})`);
    }

    // Productivity recommendations
    const recommendations = [];
    
    if (categoryPercentages.productivity < 20) {
        recommendations.push("💡 Try dedicating specific hours to productivity tools");
    }
    
    if (categoryPercentages.social > 25) {
        recommendations.push("💡 Consider using focus mode during work hours to limit social media");
    }
    
    if (sortedForDisplay.length > 0) {
        recommendations.push(`💡 Schedule important tasks during your peak hours: ${sortedForDisplay[0]}`);
    }

    return {
        insights,
        recommendations,
        categoryBreakdown: categoryPercentages,
        weeklyTrend: weeklyChange,
        topDomains: analysis.topDomains.slice(0, 3)
    };
}

// Format duration helper
function formatDuration(ms) {
    const totalSeconds = Math.round(ms / 1000);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    return hours > 0 ? `${hours}h ${remMin}m` : `${minutes}m`;
}

// Main function to get AI insights using real browsing data with custom categories
export async function getAIProductivityInsights() {
    return new Promise(async (resolve) => {
        chrome.storage.local.get(['focusStats', 'focusHistory'], async (data) => {
            const focusStats = data.focusStats || {};
            const focusHistory = data.focusHistory || {};
            
            console.log('Analyzing real browsing data for AI insights with custom categories...');
            
            if (Object.keys(focusStats).length === 0) {
                resolve({
                    insights: ['📊 Start browsing to see personalized insights!'],
                    recommendations: ['💡 Use the extension for a few days to get meaningful analytics'],
                    categoryBreakdown: {},
                    weeklyTrend: 0,
                    topDomains: [],
                    dailyStats: {},
                    dataQuality: 'insufficient'
                });
                return;
            }

            const analysis = await analyzeBrowsingData(focusStats, focusHistory);
            const aiInsights = await generateProductivityInsights(analysis);
            
            // Add data quality assessment with fallback
            let dataQuality;
            try {
                dataQuality = assessDataQuality(focusStats, focusHistory);
            } catch (error) {
                console.error('Error assessing data quality:', error);
                dataQuality = 'limited';
            }
            
            console.log('Data quality assessment:', dataQuality);
            
            aiInsights.dataQuality = dataQuality || 'limited'; // Fallback to 'limited'
            aiInsights.dailyStats = analysis.dailyBreakdown;
            
            console.log('Generated AI insights from real data with custom categories:', aiInsights);
            resolve(aiInsights);
        });
    });
}

// Assess the quality and richness of available data
function assessDataQuality(focusStats, focusHistory) {
    const totalTime = Object.values(focusStats).reduce((a, b) => a + b, 0);
    const totalDomains = Object.keys(focusStats).length;
    
    // Safe calculation of total sessions
    let totalSessions = 0;
    if (focusHistory && typeof focusHistory === 'object') {
        totalSessions = Object.values(focusHistory).reduce((acc, sessions) => {
            return acc + (Array.isArray(sessions) ? sessions.length : 0);
        }, 0);
    }
    
    console.log('Data quality metrics:', { totalTime, totalDomains, totalSessions });
    
    // Calculate data age safely
    let oldestSession = Date.now();
    let newestSession = 0;
    let hasValidSessions = false;
    
    if (focusHistory && typeof focusHistory === 'object') {
        for (const sessions of Object.values(focusHistory)) {
            if (Array.isArray(sessions)) {
                for (const session of sessions) {
                    if (session && typeof session.timestamp === 'number') {
                        hasValidSessions = true;
                        if (session.timestamp < oldestSession) oldestSession = session.timestamp;
                        if (session.timestamp > newestSession) newestSession = session.timestamp;
                    }
                }
            }
        }
    }
    
    const dataSpanDays = hasValidSessions ? (newestSession - oldestSession) / (24 * 60 * 60 * 1000) : 0;
    console.log('Data span days:', dataSpanDays, 'hasValidSessions:', hasValidSessions);
    
    let quality;
    if (totalTime < 300000 || totalDomains < 3 || dataSpanDays < 1) {
        quality = 'limited'; // Less than 5 minutes, 3 domains, or 1 day
    } else if (totalTime < 3600000 || totalDomains < 8 || dataSpanDays < 3) {
        quality = 'moderate'; // Less than 1 hour, 8 domains, or 3 days
    } else {
        quality = 'rich'; // Substantial data available
    }
    
    console.log('Assessed quality:', quality);
    return quality;
}

// Export helper functions
export { categorizeDomain, categorizeDomainSync, formatDuration };
