/**
 * SmartSpend - Global Client Application Script
 * Provides currency formatters, date formatters, global transaction modal,
 * toasts, and sidebar toggling.
 */

let globalCategories = { expense: [], income: [] };
let currentModalType = 'expense';

// Indian Rupee currency formatter
function formatCurrency(amount) {
    const num = Number(amount) || 0;
    return '₹' + num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format ISO date (YYYY-MM-DD) to Indian Standard Display (DD-MM-YYYY)
function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
    } catch (e) {
        return dateStr;
    }
}

// Toast notification helper
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Escape HTML for safety against XSS
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Sidebar Drawer Toggle for Mobile
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('sidebarOpenBtn');
    const closeBtn = document.getElementById('sidebarCloseBtn');

    if (openBtn && sidebar) {
        openBtn.addEventListener('click', () => sidebar.classList.add('active'));
    }
    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', () => sidebar.classList.remove('active'));
    }

    // Load Categories on startup
    loadGlobalCategories();
});

async function loadGlobalCategories() {
    try {
        const res = await fetch('/api/categories');
        const json = await res.json();
        if (json.success && json.data) {
            globalCategories = json.data;
            populateModalCategories();
        }
    } catch (err) {
        console.error('Failed to load categories', err);
    }
}

// Global Transaction Modal Controller
function openTransactionModal(type = 'expense', existingData = null) {
    currentModalType = type;
    setTxModalType(type);

    const modal = document.getElementById('globalTransactionModal');
    const form = document.getElementById('globalTransactionForm');
    const heading = document.getElementById('modalTxHeading');
    const idInput = document.getElementById('txId');
    const titleInput = document.getElementById('txTitle');
    const amountInput = document.getElementById('txAmount');
    const dateInput = document.getElementById('txDate');
    const paymentInput = document.getElementById('txPaymentMethod');
    const notesInput = document.getElementById('txNotes');

    if (existingData) {
        heading.textContent = 'Edit Transaction #' + existingData.id;
        idInput.value = existingData.id;
        titleInput.value = existingData.title;
        amountInput.value = existingData.amount;
        dateInput.value = existingData.date;
        paymentInput.value = existingData.payment_method || 'UPI';
        notesInput.value = existingData.notes || '';
        setTxModalType(existingData.type);
        setTimeout(() => {
            const catSelect = document.getElementById('txCategory');
            if (catSelect) catSelect.value = existingData.category;
        }, 50);
    } else {
        heading.textContent = type === 'income' ? 'Record Income' : 'Record Expense';
        idInput.value = '';
        form.reset();
        setTxModalType(type);
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }

    modal.classList.add('active');
}

function closeTransactionModal() {
    const modal = document.getElementById('globalTransactionModal');
    if (modal) modal.classList.remove('active');
}

function setTxModalType(type) {
    currentModalType = type;
    const btnExpense = document.getElementById('btnTypeExpense');
    const btnIncome = document.getElementById('btnTypeIncome');
    if (btnExpense) btnExpense.classList.toggle('active', type === 'expense');
    if (btnIncome) btnIncome.classList.toggle('active', type === 'income');
    populateModalCategories();
}

function populateModalCategories() {
    const select = document.getElementById('txCategory');
    if (!select) return;
    select.innerHTML = '';
    const list = currentModalType === 'expense' ? globalCategories.expense : globalCategories.income;
    list.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        select.appendChild(opt);
    });
}

async function handleGlobalTxSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('txId').value;
    const payload = {
        title: document.getElementById('txTitle').value.trim(),
        amount: parseFloat(document.getElementById('txAmount').value),
        type: currentModalType,
        category: document.getElementById('txCategory').value,
        date: document.getElementById('txDate').value,
        payment_method: document.getElementById('txPaymentMethod').value,
        notes: document.getElementById('txNotes').value.trim()
    };

    if (!payload.title || isNaN(payload.amount) || payload.amount <= 0 || !payload.date || !payload.category) {
        showToast('Please fill all required fields with valid values', 'danger');
        return;
    }

    try {
        const url = id ? `/api/transactions/${id}` : '/api/transactions';
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();

        if (json.success) {
            showToast(id ? 'Transaction updated successfully!' : 'Transaction recorded!', 'success');
            closeTransactionModal();

            // Notify active page scripts to refresh data
            if (typeof loadDashboardData === 'function') loadDashboardData();
            if (typeof loadTransactions === 'function') loadTransactions();
            if (typeof loadBudgets === 'function') loadBudgets();
            if (typeof loadAnalytics === 'function') loadAnalytics();
        } else {
            showToast(json.error || 'Failed to save transaction', 'danger');
        }
    } catch (err) {
        showToast('Network error while saving record', 'danger');
    }
}

function exportCSV() {
    window.location.href = '/api/export/csv';
}
