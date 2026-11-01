/**
 * SmartSpend - Savings Goals Module
 * Dedicated wealth targets, progress tracking, and actual contribution deposits.
 */

async function loadSavingsGoals() {
    const grid = document.getElementById('savingsGoalsGrid');
    if (!grid) return;

    try {
        const res = await fetch('/api/savings-goals');
        const json = await res.json();
        if (!json.success) return;

        if (json.data.length === 0) {
            grid.innerHTML = '<div class="col-span-full card p-5 text-center text-muted">No savings goals created yet. Start tracking your targets (Emergency fund, Laptop, Vehicle, Vacation) today!</div>';
            return;
        }

        grid.innerHTML = json.data.map(g => {
            const isCompleted = g.is_completed;
            const progress = g.progress_percentage;

            return `
                <div class="goal-card">
                    <div>
                        <div class="flex-between">
                            <span class="badge badge-category font-bold">${escapeHtml(g.category || 'General')}</span>
                            <div class="flex items-center gap-1">
                                <button class="btn btn-outline btn-xs text-danger" onclick="deleteGoal(${g.id})" title="Delete goal">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>

                        <h4 class="text-base font-bold text-white mt-2">${escapeHtml(g.title)}</h4>
                        ${g.notes ? `<p class="text-xs text-muted mt-1">${escapeHtml(g.notes)}</p>` : ''}

                        <div class="flex-between mt-3">
                            <div>
                                <span class="text-xs text-muted">Saved so far</span>
                                <div class="font-bold font-mono text-success text-base">${formatCurrency(g.current_amount)}</div>
                            </div>
                            <div class="text-right">
                                <span class="text-xs text-muted">Target</span>
                                <div class="font-bold font-mono text-white text-base">${formatCurrency(g.target_amount)}</div>
                            </div>
                        </div>

                        <div class="progress-bar-wrapper mt-3">
                            <div class="progress-bar ${isCompleted ? 'bg-success' : ''}" style="width: ${progress}%;"></div>
                        </div>

                        <div class="flex-between mt-2 text-xs">
                            <span class="font-bold text-muted">${progress.toFixed(1)}% Completed</span>
                            <span class="text-muted">
                                ${isCompleted ? '<strong class="text-success"><i class="fa-solid fa-circle-check"></i> Target Reached!</strong>' : `Remaining: <strong class="text-white font-mono">${formatCurrency(g.remaining_amount)}</strong>`}
                            </span>
                        </div>

                        <div class="mt-2 text-xs text-muted flex-between">
                            <span>Target Date: ${formatDateDisplay(g.target_date)}</span>
                            <span>${g.days_left >= 0 ? `${g.days_left} days left` : 'Past deadline'}</span>
                        </div>
                    </div>

                    <div class="mt-4 pt-3 border-t border-subtle flex-between">
                        <span class="text-xs text-muted">${g.contributions.length} recorded deposits</span>
                        <button class="btn btn-outline btn-xs" onclick="openContributionModal(${g.id}, '${escapeHtml(g.title)}')">
                            <i class="fa-solid fa-plus"></i> Add Deposit
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Failed to load savings goals', err);
    }
}

function openNewGoalModal() {
    const today = new Date();
    today.setMonth(today.getMonth() + 6);
    document.getElementById('goalTargetDate').value = today.toISOString().split('T')[0];
    document.getElementById('newGoalModal').classList.add('active');
}

function closeNewGoalModal() {
    document.getElementById('newGoalModal').classList.remove('active');
}

async function handleNewGoalSubmit(e) {
    e.preventDefault();
    const payload = {
        title: document.getElementById('goalTitle').value.trim(),
        target_amount: parseFloat(document.getElementById('goalTargetAmount').value),
        target_date: document.getElementById('goalTargetDate').value,
        category: document.getElementById('goalCategory').value.trim() || 'General',
        initial_amount: parseFloat(document.getElementById('goalInitialAmount').value || 0),
        notes: document.getElementById('goalNotes').value.trim()
    };

    try {
        const res = await fetch('/api/savings-goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
            showToast('Savings goal created!', 'success');
            closeNewGoalModal();
            loadSavingsGoals();
        } else {
            showToast(json.error || 'Failed to create goal', 'danger');
        }
    } catch (err) {
        showToast('Network error saving goal', 'danger');
    }
}

function openContributionModal(goalId, title) {
    document.getElementById('contribGoalId').value = goalId;
    document.getElementById('contribGoalHeading').textContent = `Depositing into: ${title}`;
    document.getElementById('contribAmount').value = '';
    document.getElementById('contribDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('contribNotes').value = '';
    document.getElementById('contributionModal').classList.add('active');
}

function closeContributionModal() {
    document.getElementById('contributionModal').classList.remove('active');
}

async function handleContributionSubmit(e) {
    e.preventDefault();
    const goalId = document.getElementById('contribGoalId').value;
    const amount = parseFloat(document.getElementById('contribAmount').value);
    const date = document.getElementById('contribDate').value;
    const notes = document.getElementById('contribNotes').value.trim();

    try {
        const res = await fetch(`/api/savings-goals/${goalId}/contribute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, date, notes })
        });
        const json = await res.json();
        if (json.success) {
            showToast('Contribution recorded successfully!', 'success');
            closeContributionModal();
            loadSavingsGoals();
        } else {
            showToast(json.error || 'Failed to deposit', 'danger');
        }
    } catch (err) {
        showToast('Network error recording deposit', 'danger');
    }
}

async function deleteGoal(id) {
    if (!confirm('Are you sure you want to delete this savings goal?')) return;
    try {
        const res = await fetch(`/api/savings-goals/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showToast('Savings goal deleted', 'success');
            loadSavingsGoals();
        }
    } catch (err) {
        showToast('Failed to delete goal', 'danger');
    }
}

document.addEventListener('DOMContentLoaded', loadSavingsGoals);
