chrome.storage.local.get("tabAnalytics", ({ tabAnalytics = [] }) => {
    const domainTimeMap = {};

    tabAnalytics.forEach(entry => {
        if (!entry.url || entry.url.startsWith("chrome://") || !entry.openedAt) return;


        try {
            const domain = new URL(entry.url).hostname;
            const openedAt = entry.openedAt || 0;
            const closedAt = entry.closedAt || Date.now();  // fallback: still open
            const duration = closedAt - openedAt;

            if (!domainTimeMap[domain]) {
                domainTimeMap[domain] = 0;
            }

            domainTimeMap[domain] += duration;
        } catch (e) {
            console.warn("Invalid URL or entry", entry);
        }
    });

    const labels = Object.keys(domainTimeMap);
    const values = Object.values(domainTimeMap).map(ms => Math.round(ms / 1000)); // seconds

    const ctx = document.getElementById("domainChart").getContext("2d");
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Time Spent per Domain (seconds)',
                data: values,
                backgroundColor: 'rgba(255, 99, 132, 0.6)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Seconds'
                    }
                }
            }
        }
    });
});
