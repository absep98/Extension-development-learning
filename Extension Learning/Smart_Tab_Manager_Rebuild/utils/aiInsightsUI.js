// aiInsightsUI.js - UI Component for AI Insights

import { getAIProductivityInsights } from './aiInsights.js';

export function initializeAIInsightsUI() {
    const aiInsightsHeader = document.getElementById("aiInsightsHeader");
    const aiInsightsSection = document.getElementById("aiInsightsSection");
    const refreshInsightsBtn = document.getElementById("refreshInsightsBtn");
    const insightsContainer = document.getElementById("insightsContainer");
    const recommendationsContainer = document.getElementById("recommendationsContainer");
    const categoryBreakdownContainer = document.getElementById("categoryBreakdownContainer");

    let isInsightsVisible = false;

    // Toggle collapse/expand
    aiInsightsHeader.addEventListener("click", () => {
        isInsightsVisible = !isInsightsVisible;
        aiInsightsSection.style.display = isInsightsVisible ? "block" : "none";
        aiInsightsHeader.textContent = isInsightsVisible 
            ? "🧠 AI Insights ⯆" 
            : "🧠 AI Insights ⯈";
        
        if (isInsightsVisible) {
            loadAIInsights();
        }
    });

    // Refresh insights button
    refreshInsightsBtn.addEventListener("click", () => {
        loadAIInsights();
    });

    // Load AI insights
    async function loadAIInsights() {
        try {
            // Show loading state
            insightsContainer.innerHTML = '<div class="loading">🤖 Analyzing your data...</div>';
            recommendationsContainer.innerHTML = '';
            categoryBreakdownContainer.innerHTML = '';

            const insights = await getAIProductivityInsights();
            
            // Display insights
            renderInsights(insights.insights);
            renderRecommendations(insights.recommendations);
            renderCategoryBreakdown(insights.categoryBreakdown, insights.weeklyTrend);
            renderTopDomains(insights.topDomains);
            renderDataQuality(insights.dataQuality, insights.dailyStats);

        } catch (error) {
            console.error('Error loading AI insights:', error);
            insightsContainer.innerHTML = '<div class="error">❌ Error loading insights</div>';
        }
    }

    function renderInsights(insights) {
        insightsContainer.innerHTML = `
            <h4>📊 Key Insights</h4>
            <div class="insights-list">
                ${insights.map(insight => `
                    <div class="insight-item">
                        <span class="insight-text">${insight}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderRecommendations(recommendations) {
        if (recommendations.length === 0) return;
        
        recommendationsContainer.innerHTML = `
            <h4>💡 Recommendations</h4>
            <div class="recommendations-list">
                ${recommendations.map(rec => `
                    <div class="recommendation-item">
                        <span class="recommendation-text">${rec}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderCategoryBreakdown(categories, weeklyTrend) {
        const categoryEntries = Object.entries(categories)
            .filter(([, percentage]) => percentage > 0)
            .sort(([, a], [, b]) => b - a);

        if (categoryEntries.length === 0) return;

        const trendIcon = weeklyTrend > 0 ? '📈' : weeklyTrend < 0 ? '📉' : '➡️';
        const trendText = weeklyTrend !== 0 
            ? `<div class="weekly-trend">${trendIcon} ${Math.abs(weeklyTrend)}% vs last week</div>`
            : '';

        categoryBreakdownContainer.innerHTML = `
            <h4>📋 Category Breakdown</h4>
            ${trendText}
            <div class="category-breakdown">
                ${categoryEntries.map(([category, percentage]) => {
                    const categoryIcon = getCategoryIcon(category);
                    return `
                        <div class="category-item">
                            <span class="category-name">${categoryIcon} ${capitalizeFirst(category)}</span>
                            <div class="category-bar">
                                <div class="category-fill" style="width: ${percentage}%"></div>
                            </div>
                            <span class="category-percentage">${percentage}%</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderTopDomains(topDomains) {
        if (topDomains.length === 0) return;

        const topDomainsHTML = `
            <h4>🏆 Top Websites</h4>
            <div class="top-domains">
                ${topDomains.map((domain, index) => {
                    const medal = ['🥇', '🥈', '🥉'][index] || '🏅';
                    return `
                        <div class="top-domain-item">
                            <span class="domain-rank">${medal}</span>
                            <span class="domain-name">${domain.domain}</span>
                            <span class="domain-time">${formatDuration(domain.time)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        categoryBreakdownContainer.innerHTML += topDomainsHTML;
    }

    function renderDataQuality(dataQuality, dailyStats) {
        const qualityIcons = {
            'insufficient': '⚠️',
            'limited': '📊',
            'moderate': '📈',
            'rich': '🎯'
        };
        
        const qualityMessages = {
            'insufficient': 'Browse more to get better insights',
            'limited': 'Getting started - need more data',
            'moderate': 'Good data quality',
            'rich': 'Excellent data for insights'
        };

        // Handle undefined dataQuality
        const safeDataQuality = dataQuality || 'insufficient';
        const icon = qualityIcons[safeDataQuality] || '❓';
        const message = qualityMessages[safeDataQuality] || 'Unknown data quality';

        const qualityHTML = `
            <div class="data-quality">
                <h4>📋 Data Quality</h4>
                <div class="quality-indicator">
                    ${icon} ${message}
                </div>
            </div>
        `;

        // Show daily stats if available
        let dailyStatsHTML = '';
        if (dailyStats && Object.keys(dailyStats).length > 0) {
            const recentDays = Object.values(dailyStats).slice(-3); // Last 3 days
            if (recentDays.some(day => day.totalTime > 0)) {
                dailyStatsHTML = `
                    <h4>📅 Recent Activity</h4>
                    <div class="recent-activity">
                        ${recentDays.map(day => `
                            <div class="daily-stat">
                                <span class="day-name">${new Date(day.date).toLocaleDateString('en', {weekday: 'short'})}</span>
                                <span class="day-time">${formatDuration(day.totalTime)}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }

        categoryBreakdownContainer.innerHTML += qualityHTML + dailyStatsHTML;
    }

    function getCategoryIcon(category) {
        const icons = {
            productivity: '💼',
            social: '👥',
            entertainment: '🎬',
            news: '📰',
            education: '📚',
            other: '🌐'
        };
        return icons[category] || '🌐';
    }

    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function formatDuration(ms) {
        const totalSeconds = Math.round(ms / 1000);
        if (totalSeconds < 60) return `${totalSeconds}s`;
        const minutes = Math.floor(totalSeconds / 60);
        const hours = Math.floor(minutes / 60);
        const remMin = minutes % 60;
        return hours > 0 ? `${hours}h ${remMin}m` : `${minutes}m`;
    }
}

// Add CSS styles for the AI insights
export function addAIInsightsStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .ai-insights-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            padding: 15px;
            margin: 10px 0;
            color: white;
        }

        .ai-insights-header {
            cursor: pointer;
            font-weight: bold;
            padding: 8px 0;
            border-radius: 8px;
            transition: all 0.3s ease;
        }

        .ai-insights-header:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .loading, .error {
            text-align: center;
            padding: 20px;
            font-style: italic;
        }

        .insights-list, .recommendations-list {
            margin: 10px 0;
        }

        .insight-item, .recommendation-item {
            background: rgba(255, 255, 255, 0.1);
            padding: 8px 12px;
            margin: 5px 0;
            border-radius: 8px;
            border-left: 3px solid #4CAF50;
        }

        .category-breakdown {
            margin: 10px 0;
        }

        .category-item {
            display: flex;
            align-items: center;
            margin: 8px 0;
            gap: 10px;
        }

        .category-name {
            min-width: 120px;
            font-size: 13px;
        }

        .category-bar {
            flex: 1;
            height: 8px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            overflow: hidden;
        }

        .category-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #81C784);
            transition: width 0.3s ease;
        }

        .category-percentage {
            min-width: 40px;
            text-align: right;
            font-weight: bold;
        }

        .weekly-trend {
            text-align: center;
            margin: 10px 0;
            padding: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            font-weight: bold;
        }

        .top-domains {
            margin: 10px 0;
        }

        .top-domain-item {
            display: flex;
            align-items: center;
            padding: 6px 8px;
            margin: 4px 0;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            gap: 10px;
        }

        .domain-rank {
            font-size: 16px;
        }

        .domain-name {
            flex: 1;
            font-size: 13px;
        }

        .domain-time {
            font-weight: bold;
            font-size: 12px;
        }

        #refreshInsightsBtn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            margin-top: 10px;
            transition: background 0.3s ease;
        }

        #refreshInsightsBtn:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .data-quality {
            margin: 15px 0;
            padding: 10px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 8px;
        }

        .quality-indicator {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
        }

        .recent-activity {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin: 10px 0;
        }

        .daily-stat {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            flex: 1;
        }

        .day-name {
            font-size: 12px;
            opacity: 0.9;
        }

        .day-time {
            font-weight: bold;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
}
