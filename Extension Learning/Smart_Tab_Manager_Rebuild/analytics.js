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
        chrome.storage.local.get("focusStats", ({ focusStats = {} }) => {
            const labels = Object.keys(focusStats);
            const values = Object.values(focusStats);
            const formattedValues = values.map(formatDuration);

            // Destroy existing charts before redrawing
            if (barChart) barChart.destroy();
            if (pieChart) pieChart.destroy();

            // ---- Bar Chart ----
            const barCtx = document.getElementById("domainChart").getContext("2d");
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
        });
    });
}

// Initial render
renderAnalyticsCharts();

// Refresh data every 5 seconds
setInterval(renderAnalyticsCharts, 5000);
