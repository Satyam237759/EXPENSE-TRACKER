/**
 * SmartSpend - Dashboard Module
 * Manages KPI summary calculations, Chart.js financial charts, and recent activity.
 */

let monthlyChartInstance = null;
let donutChartInstance = null;
let weeklyChartInstance = null;

async function loadDashboardData() {
    try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        if (!json.success || !json.data) return;

        const d = json.data;

        // 1. Update KPI Values
        document.getElementById('statBalance').textContent = formatCurrency(d.current_balance);
        document.getElementById('statIncome').textContent = formatCurrency(d.total_income);
        document.getElementById('statExpense').textContent = formatCurrency(d.total_expenses);
        document.getElementById('statMonthIncome').textContent = formatCurrency(d.month_income);
        document.getElementById('statMonthExpense').textContent = formatCurrency(d.month_expense);
        document.getElementById('statSavingsRate').textContent = d.savings_rate.toFixed(1) + '%';
        document.getElementById('statMonthlySavings').textContent = formatCurrency(d.monthly_savings);
        document.getElementById('statTopCategory').textContent = d.highest_spending_category.category + ' (' + formatCurrency(d.highest_spending_category.amount) + ')';

        // Budget usage
        const b = d.monthly_budget;
        document.getElementById('statBudgetUsed').textContent = b.overall_budget > 0 ? b.percentage.toFixed(1) + '%' : 'Not Set';
        document.getElementById('statBudgetRemaining').textContent = formatCurrency(b.remaining);
        
        const prog = document.getElementById('budgetProgressBar');
        if (prog) {
            prog.style.width = Math.min(b.percentage, 100) + '%';
            prog.className = 'progress-bar ' + (b.status === 'exceeded' ? 'exceeded' : b.status === 'warning' ? 'warning' : '');
        }

        // 2. Render Charts
        renderMonthlyTrendChart(d.monthly_trends);
        renderCategoryDonutChart(d.expense_breakdown);
        renderWeeklySpendChart(d.weekly_trend);

        // 3. Render Recent Transactions
        renderRecentTransactions(d.recent_transactions);
    } catch (err) {
        console.error('Error loading dashboard data', err);
    }
}

function renderMonthlyTrendChart(trends) {
    const ctx = document.getElementById('monthlyTrendChart');
    if (!ctx) return;

    const labels = trends.map(t => t.month);
    const incomeData = trends.map(t => t.income);
    const expenseData = trends.map(t => t.expense);

    if (monthlyChartInstance) monthlyChartInstance.destroy();

    monthlyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income (₹)',
                    data: incomeData,
                    backgroundColor: '#10b981',
                    borderRadius: 6
                },
                {
                    label: 'Expense (₹)',
                    data: expenseData,
                    backgroundColor: '#f43f5e',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ₹${Number(ctx.raw).toLocaleString('en-IN', {minimumFractionDigits: 2})}`
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

function renderCategoryDonutChart(categories) {
    const ctx = document.getElementById('categoryDonutChart');
    if (!ctx) return;

    if (categories.length === 0) {
        ctx.parentElement.innerHTML = '<div class="text-center py-5 text-muted">No expense categories to chart yet</div>';
        return;
    }

    const labels = categories.map(c => c.category);
    const data = categories.map(c => c.total);
    const colors = [
        '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316',
        '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'
    ];

    if (donutChartInstance) donutChartInstance.destroy();

    donutChartInstance = new Chart(ctx, {
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
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } }
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

function renderWeeklySpendChart(weeklyTrend) {
    const ctx = document.getElementById('weeklySpendChart');
    if (!ctx) return;

    const labels = weeklyTrend.map(w => w.label);
    const data = weeklyTrend.map(w => w.amount);

    if (weeklyChartInstance) weeklyChartInstance.destroy();

    weeklyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Spent (₹)',
                data: data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#8b5cf6',
                pointRadius: 4
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
                    ticks: { color: '#94a3b8', font: { size: 10 } }
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

function renderRecentTransactions(transactions) {
    const container = document.getElementById('recentTxList');
    if (!container) return;

    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-muted">No transactions recorded yet.</div>';
        return;
    }

    container.innerHTML = transactions.map(t => {
        const isIncome = t.type === 'income';
        return `
            <div class="recent-tx-item flex-between p-3 border-b border-subtle">
                <div class="flex items-center gap-3">
                    <div class="stat-icon-box ${isIncome ? 'bg-income' : 'bg-expense'}">
                        <i class="fa-solid ${isIncome ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                    </div>
                    <div>
                        <div class="font-bold text-sm text-white">${escapeHtml(t.title)}</div>
                        <div class="text-xs text-muted">
                            <span>${escapeHtml(t.category)}</span> &middot;
                            <span>${formatDateDisplay(t.date)}</span> &middot;
                            <span>${escapeHtml(t.payment_method || 'UPI')}</span>
                        </div>
                    </div>
                </div>
                <div class="font-mono font-bold text-sm ${isIncome ? 'text-success' : 'text-danger'}">
                    ${isIncome ? '+' : '-'} ${formatCurrency(t.amount)}
                </div>
            </div>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', loadDashboardData);
