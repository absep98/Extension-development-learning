// testData.js - Work with real browsing data organized by time periods

export function analyzeRealBrowsingData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['focusStats', 'focusHistory'], (data) => {
            const focusStats = data.focusStats || {};
            const focusHistory = data.focusHistory || {};
            
            console.log('📊 Analyzing real browsing data...');
            console.log('Total domains tracked:', Object.keys(focusStats).length);
            console.log('Total time recorded:', Object.values(focusStats).reduce((a, b) => a + b, 0));
            
            // Organize data by time periods
            const analysis = organizeDataByTimePeriods(focusStats, focusHistory);
            resolve(analysis);
        });
    });
}

function organizeDataByTimePeriods(focusStats, focusHistory) {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // Initialize time period containers
    const timePeriods = {
        today: { start: getStartOfDay(now), domains: {}, totalTime: 0 },
        yesterday: { start: getStartOfDay(now - oneDayMs), domains: {}, totalTime: 0 },
        thisWeek: { start: getStartOfWeek(now), domains: {}, totalTime: 0 },
        lastWeek: { start: getStartOfWeek(now - 7 * oneDayMs), domains: {}, totalTime: 0 },
        last7Days: { start: now - 7 * oneDayMs, domains: {}, totalTime: 0 },
        last30Days: { start: now - 30 * oneDayMs, domains: {}, totalTime: 0 }
    };
    
    // Process focus history to organize by time periods
    for (const [domain, sessions] of Object.entries(focusHistory)) {
        for (const session of sessions) {
            const sessionTime = session.timestamp;
            
            // Check which time periods this session belongs to
            if (sessionTime >= timePeriods.today.start && sessionTime < timePeriods.today.start + oneDayMs) {
                addToTimePeriod(timePeriods.today, domain, session.duration);
            }
            
            if (sessionTime >= timePeriods.yesterday.start && sessionTime < timePeriods.yesterday.start + oneDayMs) {
                addToTimePeriod(timePeriods.yesterday, domain, session.duration);
            }
            
            if (sessionTime >= timePeriods.thisWeek.start) {
                addToTimePeriod(timePeriods.thisWeek, domain, session.duration);
            }
            
            if (sessionTime >= timePeriods.lastWeek.start && sessionTime < timePeriods.thisWeek.start) {
                addToTimePeriod(timePeriods.lastWeek, domain, session.duration);
            }
            
            if (sessionTime >= timePeriods.last7Days.start) {
                addToTimePeriod(timePeriods.last7Days, domain, session.duration);
            }
            
            if (sessionTime >= timePeriods.last30Days.start) {
                addToTimePeriod(timePeriods.last30Days, domain, session.duration);
            }
        }
    }
    
    // Add daily breakdown for the last 7 days
    const dailyBreakdown = generateDailyBreakdown(focusHistory, 7);
    
    return {
        timePeriods,
        dailyBreakdown,
        allTimeStats: focusStats,
        totalTrackedTime: Object.values(focusStats).reduce((a, b) => a + b, 0),
        totalDomains: Object.keys(focusStats).length,
        firstRecordedSession: getFirstSessionTime(focusHistory),
        lastRecordedSession: getLastSessionTime(focusHistory)
    };
}

function addToTimePeriod(period, domain, duration) {
    if (!period.domains[domain]) {
        period.domains[domain] = 0;
    }
    period.domains[domain] += duration;
    period.totalTime += duration;
}

function generateDailyBreakdown(focusHistory, numDays) {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const dailyData = [];
    
    for (let i = 0; i < numDays; i++) {
        const dayStart = getStartOfDay(now - (i * oneDayMs));
        const dayEnd = dayStart + oneDayMs;
        const dayData = {
            date: new Date(dayStart).toDateString(),
            timestamp: dayStart,
            domains: {},
            totalTime: 0,
            sessionCount: 0
        };
        
        // Collect all sessions for this day
        for (const [domain, sessions] of Object.entries(focusHistory)) {
            for (const session of sessions) {
                if (session.timestamp >= dayStart && session.timestamp < dayEnd) {
                    if (!dayData.domains[domain]) {
                        dayData.domains[domain] = 0;
                    }
                    dayData.domains[domain] += session.duration;
                    dayData.totalTime += session.duration;
                    dayData.sessionCount++;
                }
            }
        }
        
        dailyData.push(dayData);
    }
    
    return dailyData.reverse(); // Most recent first
}

function getStartOfDay(timestamp) {
    const date = new Date(timestamp);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getStartOfWeek(timestamp) {
    const date = new Date(timestamp);
    const day = date.getDay();
    const diff = date.getDate() - day; // Sunday as start of week
    return new Date(date.setDate(diff)).setHours(0, 0, 0, 0);
}

function getFirstSessionTime(focusHistory) {
    let earliest = Date.now();
    for (const sessions of Object.values(focusHistory)) {
        for (const session of sessions) {
            if (session.timestamp < earliest) {
                earliest = session.timestamp;
            }
        }
    }
    return earliest;
}

function getLastSessionTime(focusHistory) {
    let latest = 0;
    for (const sessions of Object.values(focusHistory)) {
        for (const session of sessions) {
            if (session.timestamp > latest) {
                latest = session.timestamp;
            }
        }
    }
    return latest;
}

// Function to display real data analysis
export async function displayRealDataAnalysis() {
    const analysis = await analyzeRealBrowsingData();
    
    console.log('📊 REAL BROWSING DATA ANALYSIS:');
    console.log('================================');
    console.log(`📈 Total tracked time: ${formatDuration(analysis.totalTrackedTime)}`);
    console.log(`🌐 Total domains: ${analysis.totalDomains}`);
    console.log(`📅 Tracking since: ${new Date(analysis.firstRecordedSession).toLocaleDateString()}`);
    console.log(`🕒 Last activity: ${new Date(analysis.lastRecordedSession).toLocaleString()}`);
    
    console.log('\n⏰ TIME PERIOD BREAKDOWN:');
    console.log(`Today: ${formatDuration(analysis.timePeriods.today.totalTime)}`);
    console.log(`Yesterday: ${formatDuration(analysis.timePeriods.yesterday.totalTime)}`);
    console.log(`This week: ${formatDuration(analysis.timePeriods.thisWeek.totalTime)}`);
    console.log(`Last week: ${formatDuration(analysis.timePeriods.lastWeek.totalTime)}`);
    
    console.log('\n📊 DAILY BREAKDOWN (Last 7 days):');
    analysis.dailyBreakdown.forEach(day => {
        const topDomain = Object.entries(day.domains)
            .sort(([,a], [,b]) => b - a)[0];
        console.log(`${day.date}: ${formatDuration(day.totalTime)} (${day.sessionCount} sessions)${topDomain ? ` - Top: ${topDomain[0]}` : ''}`);
    });
    
    return analysis;
}

function formatDuration(ms) {
    const totalSeconds = Math.round(ms / 1000);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    return hours > 0 ? `${hours}h ${remMin}m` : `${minutes}m`;
}

// Generate sample data only if no real data exists
export function generateMinimalSampleIfNeeded() {
    chrome.storage.local.get(['focusStats', 'focusHistory'], (data) => {
        const focusStats = data.focusStats || {};
        const focusHistory = data.focusHistory || {};
        
        // Check if we have meaningful data
        const totalTime = Object.values(focusStats).reduce((a, b) => a + b, 0);
        const totalSessions = Object.values(focusHistory).reduce((acc, sessions) => acc + sessions.length, 0);
        
        if (totalTime < 60000 || totalSessions < 5) { // Less than 1 minute or 5 sessions
            console.log('⚠️ Insufficient real data. Adding minimal sample for demonstration...');
            addMinimalSampleData();
        } else {
            console.log('✅ Sufficient real data available for AI insights');
            displayRealDataAnalysis();
        }
    });
}

function addMinimalSampleData() {
    const now = Date.now();
    const recentSampleStats = {
        'github.com': 1800000,  // 30 minutes
        'google.com': 600000,   // 10 minutes
        'youtube.com': 900000   // 15 minutes
    };
    
    const recentSampleHistory = {};
    Object.entries(recentSampleStats).forEach(([domain, totalTime]) => {
        recentSampleHistory[domain] = [
            { timestamp: now - 3600000, duration: totalTime * 0.6 }, // 1 hour ago
            { timestamp: now - 1800000, duration: totalTime * 0.4 }  // 30 minutes ago
        ];
    });
    
    chrome.storage.local.get(['focusStats', 'focusHistory'], (existing) => {
        const mergedStats = { ...existing.focusStats, ...recentSampleStats };
        const mergedHistory = { ...existing.focusHistory, ...recentSampleHistory };
        
        chrome.storage.local.set({
            focusStats: mergedStats,
            focusHistory: mergedHistory
        }, () => {
            console.log('✅ Minimal sample data added to supplement real data');
        });
    });
}
