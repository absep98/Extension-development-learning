// grouping.js

export function groupTabsByDomain(tabs) {
    const grouped = {};
    tabs.forEach((tab) => {
        try {
            const urlObj = new URL(tab.url);
            const domain = urlObj.hostname;
            if (!grouped[domain]) {
                grouped[domain] = [];
            }
            grouped[domain].push(tab);
        } catch (e) {
            // Handle invalid URLs (e.g. chrome://, about:blank)
            if (!grouped["Unknown"]) grouped["Unknown"] = [];
            grouped["Unknown"].push(tab);
        }
    });
    return grouped;
}