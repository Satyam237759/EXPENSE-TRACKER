/**
 * SmartSpend - Budgets Management Module
 * Monthly budget tracker, progress bars, warning flags (>=80%, >100%), and CRUD.
 */

async function loadBudgets() {
    const monthPicker = document.getElementById('budgetMonthPicker');
    const month = monthPicker ? monthPicker.value : new Date().toISOString().substring(0, 7);

    try {
        const res = await fetch(`/api/budgets?month=${month}`);
        const json = await res.json();
        if (!json.success) return;

        const data = json.data;
        const grid = document.getElementById('categoryBudgetsGrid');

        // Check if overall budget exists
        const overall = data.budgets.find(b => b.is_overall);
        const overallCard = document.getElementById('overallBudgetCard');
        const warnBanner = document.getElementById('overallWarningBanner');

        if (overall) {
            document.getElementById('overallBudgetAmount').textContent = formatCurrency(overall.budget_amount);
            document.getElementById('overallSpentAmount').textContent = formatCurrency(overall.spent_amount);
            document.getElementById('overallPercentText').textContent = overall.percentage.toFixed(1) + '% Used';
            document.getElementById('overallRemainingText').textContent = formatCurrency(overall.remaining);

            const bar = document.getElementById('overallProgressBar');
            bar.style.width = Math.min(overall.percentage, 100) + '%';
            bar.className = 'progress-bar ' + (overall.status === 'exceeded' ? 'exceeded' : overall.status === 'warning' ? 'warning' : '');

            if (overall.status === 'exceeded') {
                warnBanner.innerHTML = `<div class="alert alert-danger mb-0"><i class="fa-solid fa-triangle-exclamation"></i> <strong>Budget Exceeded!</strong> You have spent ₹${Number(overall.spent_amount - overall.budget_amount).toLocaleString('en-IN', {minimumFractionDigits: 2})} over your planned limit.</div>`;
            } else if (overall.status === 'warning') {
                warnBanner.innerHTML = `<div class="alert alert-warning mb-0"><i class="fa-solid fa-circle-exclamation"></i> <strong>Warning:</strong> You have reached ${overall.percentage.toFixed(1)}% of your monthly spending cap!</div>`;
            } else {
                warnBanner.innerHTML = '';
            }
        } else {
            document.getElementById('overallBudgetAmount').textContent = 'Not Set';
            document.getElementById('overallSpentAmount').textContent = formatCurrency(data.total_spent);
            document.getElementById('overallPercentText').textContent = 'No monthly limit set';
            document.getElementById('overallRemainingText').textContent = 'N/A';
            document.getElementById('overallProgressBar').style.width = '0%';
            warnBanner.innerHTML = '<p class="text-xs text-muted mb-0">Tip: Click "Set Overall Budget" to establish a monthly spending threshold.</p>';
        }

        // Render category budgets
        const categoryBudgets = data.budgets.filter(b => !b.is_overall);
        if (categoryBudgets.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-5 text-muted card p-4">No category limits set for this month. Set budgets for Food, Rent, or Shopping to prevent overspending!</div>';
            return;
        }

        grid.innerHTML = categoryBudgets.map(b => {
            const isExceeded = b.status === 'exceeded';
            const isWarning = b.status === 'warning';

            return `
                <div class="budget-card">
                    <div>
                        <div class="flex-between">
                            <span class="badge badge-category font-bold">${escapeHtml(b.category)}</span>
                            <button class="btn btn-outline btn-xs text-danger" onclick="deleteBudget(${b.id})" title="Remove budget limit">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                        <div class="flex-between mt-3">
                            <div>
                                <span class="text-xs text-muted">Limit</span>
                                <div class="font-bold font-mono text-sm">${formatCurrency(b.budget_amount)}</div>
                            </div>
                            <div class="text-right">
                                <span class="text-xs text-muted">Spent</span>
                                <div class="font-bold font-mono text-sm ${isExceeded ? 'text-danger' : 'text-white'}">
                                    ${formatCurrency(b.spent_amount)}
                                </div>
                            </div>
                        </div>

                        <div class="progress-bar-wrapper mt-3">
                            <div class="progress-bar ${isExceeded ? 'exceeded' : isWarning ? 'warning' : ''}" style="width: ${Math.min(b.percentage, 100)}%;"></div>
                        </div>

                        <div class="flex-between mt-2 text-xs">
                            <span class="${isExceeded ? 'text-danger font-bold' : isWarning ? 'text-warning font-bold' : 'text-muted'}">
                                ${b.percentage.toFixed(1)}% Used
                            </span>
                            <span class="text-muted">
                                Left: <strong class="text-white font-mono">${formatCurrency(b.remaining)}</strong>
                            </span>
                        </div>
                    </div>

                    ${isExceeded ? `
                        <div class="mt-3 p-2 rounded bg-danger-bg text-danger text-xs font-semibold flex items-center gap-1.5">
                            <i class="fa-solid fa-triangle-exclamation"></i> Exceeded by ${formatCurrency(b.spent_amount - b.budget_amount)}
                        </div>
                    ` : isWarning ? `
                        <div class="mt-3 p-2 rounded bg-warning-bg text-warning text-xs font-semibold flex items-center gap-1.5">
                            <i class="fa-solid fa-circle-exclamation"></i> 80% Threshold reached
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Failed to load budgets', err);
    }
}

function openBudgetModal(defaultCategory = '') {
    const modal = document.getElementById('budgetModal');
    const catSelect = document.getElementById('budgetCategory');

    // Populate categories
    catSelect.innerHTML = '<option value="Overall">Overall Monthly Spending</option>';
    if (globalCategories.expense) {
        globalCategories.expense.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            opt.textContent = c.name;
            catSelect.appendChild(opt);
        });
    }

    if (defaultCategory) catSelect.value = defaultCategory;
    document.getElementById('budgetAmount').value = '';
    modal.classList.add('active');
}

function closeBudgetModal() {
    document.getElementById('budgetModal').classList.remove('active');
}

async function handleBudgetSubmit(e) {
    e.preventDefault();
    const month = document.getElementById('budgetMonthPicker').value || new Date().toISOString().substring(0, 7);
    const category = document.getElementById('budgetCategory').value;
    const amount = parseFloat(document.getElementById('budgetAmount').value);

    if (isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid positive budget amount', 'danger');
        return;
    }

    try {
        const res = await fetch('/api/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month, category, amount })
        });
        const json = await res.json();
        if (json.success) {
            showToast(json.message, 'success');
            closeBudgetModal();
            loadBudgets();
        } else {
            showToast(json.error || 'Failed to set budget', 'danger');
        }
    } catch (err) {
        showToast('Network error while setting budget', 'danger');
    }
}

async function deleteBudget(id) {
    if (!confirm('Are you sure you want to remove this budget limit?')) return;
    try {
        const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showToast('Budget removed', 'success');
            loadBudgets();
        }
    } catch (err) {
        showToast('Failed to delete budget', 'danger');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const picker = document.getElementById('budgetMonthPicker');
    if (picker) {
        const now = new Date();
        picker.value = now.toISOString().substring(0, 7);
    }
    loadBudgets();
});
