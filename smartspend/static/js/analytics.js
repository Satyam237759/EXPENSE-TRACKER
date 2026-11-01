/**
 * SmartSpend - Analytics & Reports Module
 * Financial trend analysis, daily averages, payment method breakdowns, and CSV reports.
 */

let analyticsBarInstance = null;
let analyticsPaymentInstance = null;

function setAnalyticsPreset(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    document.getElementById('analyticsStart').value = start.toISOString().split('T')[0];
    document.getElementById('analyticsEnd').value = end.toISOString().split('T')[0];

    document.querySelectorAll('.btn-outline').forEach(b => b.classList.remove('active'));
    if (days === 90) {
        const b = document.getElementById('btnPreset90');
        if (b) b.classList.add('active');
    }
    loadAnalytics();
}

async function loadAnalytics() {
    const start = document.getElementById('analyticsStart').value;
    const end = document.getElementById('analyticsEnd').value;

    try {
        const q = new URLSearchParams();
        if (start) q.set('start_date', start);
        if (end) q.set('end_date', end);

        const res = await fetch(`/api/analytics?${q.toString()}`);
        const json = await res.json();
        if (!json.success || !json.data) return;

        const d = json.data;

        // KPI cards
        document.getElementById('anDailyAvg').textContent = formatCurrency(d.daily_average_spending);
        document.getElementById('anNetSavings').textContent = formatCurrency(d.net_savings);
        document.getElementById('anSavingsRate').textContent = `${d.savings_rate.toFixed(1)}% savings rate`;
        
        document.getElementById('anHighMonth').textContent = formatCurrency(d.highest_spending_month.amount);
        document.getElementById('anHighMonthLabel').textContent = `Peak Month: ${d.highest_spending_month.month}`;

        document.getElementById('anLowMonth').textContent = formatCurrency(d.lowest_spending_month.amount);
        document.getElementById('anLowMonthLabel').textContent = `Lowest Month: ${d.lowest_spending_month.month}`;

        // Charts
        renderAnalyticsBar(d.total_income, d.total_expense, d.net_savings);
        renderPaymentMethods(d.payment_methods);

        // Category breakdown table
        const tbody = document.getElementById('anCategoryTableBody');
        if (tbody) {
            if (d.category_breakdown.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No expenses recorded in this timeframe.</td></tr>';
            } else {
                tbody.innerHTML = d.category_breakdown.map(c => `
                    <tr>
                        <td><strong>${escapeHtml(c.category)}</strong></td>
                        <td>${c.count} records</td>
                        <td>
                            <div class="flex items-center gap-2">
                                <div class="progress-bar-wrapper flex-1" style="height: 6px;">
                                    <div class="progress-bar" style="width: ${c.percentage}%;"></div>
                                </div>
                                <span class="font-mono text-xs w-10">${c.percentage}%</span>
                            </div>
                        </td>
                        <td class="text-right font-mono font-bold text-white">${formatCurrency(c.total)}</td>
                    </tr>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Failed to load analytics', err);
    }
}

function renderAnalyticsBar(income, expense, net) {
    const ctx = document.getElementById('analyticsBarChart');
    if (!ctx) return;

    if (analyticsBarInstance) analyticsBarInstance.destroy();

    analyticsBarInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Total Revenue', 'Total Expenditures', 'Net Capital Retained'],
            datasets: [{
                label: 'Amount (₹)',
                data: [income, expense, net],
                backgroundColor: ['#10b981', '#f43f5e', '#6366f1'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ₹${Number(ctx.raw).toLocaleString('en-IN', {minimumFractionDigits: 2})}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        callback: (v) => '₹' + Number(v).toLocaleString('en-IN')
                    }
                }
            }
        }
    });
}

function renderPaymentMethods(paymentMethods) {
    const ctx = document.getElementById('analyticsPaymentChart');
    if (!ctx) return;

    if (!paymentMethods || paymentMethods.length === 0) {
        ctx.parentElement.innerHTML = '<div class="text-center py-5 text-muted">No payment data recorded</div>';
        return;
    }

    const labels = paymentMethods.map(p => p.method);
    const data = paymentMethods.map(p => p.total);
    const colors = ['#6366f1', '#10b981', '#ec4899', '#f59e0b', '#06b6d4'];

    if (analyticsPaymentInstance) analyticsPaymentInstance.destroy();

    analyticsPaymentInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#111726'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { size: 11 } }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ₹${Number(ctx.raw).toLocaleString('en-IN', {minimumFractionDigits: 2})}`
                    }
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setAnalyticsPreset(90);
});
