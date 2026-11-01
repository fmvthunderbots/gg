/* ==========================================================================
   TITANIUM FINANCE - FINANCIAL CHARTS & VISUAL ANALYTICS
   ========================================================================== */

let cashflowChartInstance = null;
let categoryChartInstance = null;

function refreshCharts() {
    if (typeof Chart === "undefined") {
        console.warn("Chart.js henüz yüklenmedi, bekleniyor...");
        return;
    }

    renderCashflowChart();
    renderCategoryChart();
}

// 1. Monthly Cashflow Bar & Line Chart (Gelir vs Gider vs Net Tasarruf)
function renderCashflowChart() {
    const ctx = document.getElementById("cashflowChart");
    if (!ctx) return;

    const labels = currentData.rows.map(r => r.month);
    const incomeData = currentData.rows.map(r => (Number(r.inc1) || 0) + (Number(r.inc2) || 0));
    const expenseData = currentData.rows.map(r => {
        let sum = 0;
        r.exps.forEach(e => sum += (Number(e) || 0));
        return sum;
    });
    const netData = incomeData.map((inc, i) => inc - expenseData[i]);

    if (cashflowChartInstance) {
        cashflowChartInstance.destroy();
    }

    cashflowChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Toplam Gelir (₺)',
                    data: incomeData,
                    backgroundColor: 'rgba(16, 185, 129, 0.75)',
                    borderColor: '#10b981',
                    borderWidth: 1.5,
                    borderRadius: 6,
                    order: 2
                },
                {
                    label: 'Toplam Gider (₺)',
                    data: expenseData,
                    backgroundColor: 'rgba(244, 63, 94, 0.75)',
                    borderColor: '#f43f5e',
                    borderWidth: 1.5,
                    borderRadius: 6,
                    order: 3
                },
                {
                    label: 'Net Kalan (₺)',
                    data: netData,
                    type: 'line',
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.35,
                    pointBackgroundColor: '#38bdf8',
                    pointRadius: 4,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#cbd5e1',
                        font: { family: 'Plus Jakarta Sans', size: 12, weight: 600 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.toLocaleString('tr-TR')} ₺`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans' } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.06)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'JetBrains Mono' },
                        callback: function(value) {
                            return value >= 1000 ? (value / 1000) + 'k ₺' : value + ' ₺';
                        }
                    }
                }
            }
        }
    });
}

// 2. Expense Breakdown by Credit Card & Category (Doughnut Chart)
function renderCategoryChart() {
    const ctx = document.getElementById("categoryChart");
    if (!ctx) return;

    const headers = currentData.expenseHeaders;
    const totals = new Array(headers.length).fill(0);

    currentData.rows.forEach(r => {
        r.exps.forEach((exp, idx) => {
            totals[idx] += (Number(exp) || 0);
        });
    });

    // Filter out categories with 0 total
    const filteredLabels = [];
    const filteredData = [];
    const colorPalette = [
        '#38bdf8', '#818cf8', '#c084fc', '#f472b6',
        '#fb7185', '#fb923c', '#facc15', '#4ade80',
        '#2dd4bf', '#a78bfa', '#34d399', '#60a5fa'
    ];

    headers.forEach((h, i) => {
        if (totals[i] > 0) {
            filteredLabels.push(h);
            filteredData.push(totals[i]);
        }
    });

    if (filteredLabels.length === 0) {
        filteredLabels.push("Veri Yok");
        filteredData.push(1);
    }

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: filteredLabels,
            datasets: [{
                data: filteredData,
                backgroundColor: colorPalette.slice(0, filteredLabels.length),
                borderWidth: 2,
                borderColor: '#151a23'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#cbd5e1',
                        font: { family: 'Plus Jakarta Sans', size: 11 },
                        padding: 10,
                        boxWidth: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            return `${context.label}: ${val.toLocaleString('tr-TR')} ₺`;
                        }
                    }
                }
            },
            cutout: '68%'
        }
    });
}
