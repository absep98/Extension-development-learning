const barColors = [
  'rgba(255, 99, 132, 0.6)',
  'rgba(54, 162, 235, 0.6)',
  'rgba(255, 206, 86, 0.6)',
  'rgba(75, 192, 192, 0.6)',
  'rgba(153, 102, 255, 0.6)',
  'rgba(255, 159, 64, 0.6)',
  'rgba(199, 199, 199, 0.6)'
];

let barChart = null;
let pieChart = null;
let weeklyChart = null;

function formatDuration(ms) {
    const totalSeconds = Math.round(ms / 1000);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    return hours > 0 ? `${hours}h ${remMin}m` : `${minutes}m`;
}

function renderAnalyticsCharts() {
    chrome.runtime.sendMessage({ type: "flushFocusTime" }, () => {
        chrome.storage.local.get(["focusStats", "focusHistory"], ({ focusStats = {}, focusHistory = {} }) => {
            console.log("Current focus stats:", focusStats);

            const labels = Object.keys(focusStats);
            const values = Object.values(focusStats);
            const formattedValues = values.map(formatDuration);

            // Handle empty state
            if (labels.length === 0) {
                document.getElementById("domainChart").style.display = "none";
                document.getElementById("topSitesChart").style.display = "none";
                document.getElementById("weeklyTopSitesChart").style.display = "none";

                let emptyMessage = document.getElementById("emptyMessage");
                if (!emptyMessage) {
                    emptyMessage = document.createElement("div");
                    emptyMessage.id = "emptyMessage";
                    emptyMessage.style.textAlign = "center";
                    emptyMessage.style.color = "#666";
                    emptyMessage.style.fontSize = "16px";
                    emptyMessage.style.marginTop = "50px";
                    emptyMessage.textContent = "No browsing data yet. Start browsing to see analytics!";
                    document.body.appendChild(emptyMessage);
                }

                return;
            } else {
                // Show charts, hide empty message
                const emptyMessage = document.getElementById("emptyMessage");
                if (emptyMessage) emptyMessage.remove();

                document.getElementById("domainChart").style.display = "block";
                document.getElementById("topSitesChart").style.display = "block";
                document.getElementById("weeklyTopSitesChart").style.display = "block";
            }

            // Cleanup
            if (barChart) barChart.destroy();
            if (pieChart) pieChart.destroy();
            if (weeklyChart) weeklyChart.destroy();

            // ---- Bar Chart ----
            const barCtx = document.getElementById("domainChart").getContext("2d");
            console.log("Creating bar chart with data:", { labels, values, formattedValues });
            barChart = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Time Spent per Domain',
                        data: values,
                        backgroundColor: labels.map((_, i) => barColors[i % barColors.length])
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Time Spent (ms)' }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const index = context.dataIndex;
                                    return ` ${formattedValues[index]}`;
                                }
                            }
                        }
                    }
                }
            });

            // ---- Pie Chart ----
            const sorted = labels
                .map((domain, i) => ({ domain, time: values[i] }))
                .sort((a, b) => b.time - a.time)
                .slice(0, 5);

            const pieLabels = sorted.map(d => d.domain);
            const pieData = sorted.map(d => d.time);

            const pieCtx = document.getElementById("topSitesChart").getContext("2d");
            pieChart = new Chart(pieCtx, {
                type: 'pie',
                data: {
                    labels: pieLabels,
                    datasets: [{
                        data: pieData,
                        backgroundColor: barColors.slice(0, pieLabels.length)
                    }]
                },
                options: {
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: (context) => formatDuration(context.raw)
                            }
                        }
                    }
                }
            });

            // ---- Weekly Pie Chart ----
            const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const weeklyTotals = {};

            console.log("Focus history data:", focusHistory);

            for (const [domain, entries] of Object.entries(focusHistory)) {
                for (const { timestamp, duration } of entries) {
                    if (timestamp >= weekAgo) {
                        weeklyTotals[domain] = (weeklyTotals[domain] || 0) + duration;
                    }
                }
            }

            console.log("Weekly totals:", weeklyTotals);

            const sortedWeekly = Object.entries(weeklyTotals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            const weeklyLabels = sortedWeekly.map(([domain]) => domain);
            const weeklyData = sortedWeekly.map(([, duration]) => duration);

            const weeklyCtx = document.getElementById("weeklyTopSitesChart").getContext("2d");
            
            // Only create weekly chart if there's data
            if (weeklyLabels.length > 0) {
                weeklyChart = new Chart(weeklyCtx, {
                    type: 'pie',
                    data: {
                        labels: weeklyLabels,
                        datasets: [{
                            data: weeklyData,
                            backgroundColor: barColors.slice(0, weeklyLabels.length)
                        }]
                    },
                    options: {
                        plugins: {
                            legend: { position: 'bottom' },
                            tooltip: {
                                callbacks: {
                                    label: (context) => formatDuration(context.raw)
                                }
                            }
                        }
                    }
                });
            } else {
                // Show "No weekly data" message
                weeklyCtx.fillStyle = '#666';
                weeklyCtx.font = '16px Inter';
                weeklyCtx.textAlign = 'center';
                weeklyCtx.fillText('No data for past 7 days', weeklyCtx.canvas.width / 2, weeklyCtx.canvas.height / 2);
            }
        });
    });
}

// Initial render
renderAnalyticsCharts();

// Refresh data every 5 seconds
setInterval(renderAnalyticsCharts, 5000);

// Reset Button
document.addEventListener("DOMContentLoaded", () => {
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            chrome.storage.local.remove(["focusStats", "focusHistory"], () => {
                if (barChart) barChart.destroy();
                if (pieChart) pieChart.destroy();
                if (weeklyChart) weeklyChart.destroy();
                alert("Analytics reset!");
            });
        });
    }
});
