/**
 * SmartSpend - Transactions Management Module
 * Filter, search, paginate, edit, and delete transactions.
 */

let currentFilters = {
    search: '',
    type: '',
    category: '',
    payment_method: '',
    start_date: '',
    end_date: '',
    sort_by: 'date',
    sort_order: 'desc'
};

let page = 1;
const limit = 15;
let totalRecords = 0;
let pendingDeleteId = null;

async function loadTransactions() {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;

    try {
        const offset = (page - 1) * limit;
        const q = new URLSearchParams({
            search: currentFilters.search,
            type: currentFilters.type,
            category: currentFilters.category,
            payment_method: currentFilters.payment_method,
            start_date: currentFilters.start_date,
            end_date: currentFilters.end_date,
            sort_by: currentFilters.sort_by,
            sort_order: currentFilters.sort_order,
            limit: limit,
            offset: offset
        });

        const res = await fetch(`/api/transactions?${q.toString()}`);
        const json = await res.json();

        if (!json.success) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">${json.error || 'Failed to load records'}</td></tr>`;
            return;
        }

        totalRecords = json.total;
        updatePaginationInfo();

        if (json.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted">No transactions match your search filter criteria.</td></tr>';
            return;
        }

        tbody.innerHTML = json.data.map(tx => {
            const isIncome = tx.type === 'income';
            return `
                <tr>
                    <td class="font-mono text-muted">${formatDateDisplay(tx.date)}</td>
                    <td>
                        <strong class="text-white">${escapeHtml(tx.title)}</strong>
                        ${tx.notes ? `<div class="text-xs text-muted mt-1">${escapeHtml(tx.notes)}</div>` : ''}
                    </td>
                    <td><span class="badge badge-category">${escapeHtml(tx.category)}</span></td>
                    <td><span class="text-xs text-muted font-medium">${escapeHtml(tx.payment_method || 'UPI')}</span></td>
                    <td>
                        <span class="badge ${isIncome ? 'badge-success' : 'badge-danger'}">
                            ${tx.type.toUpperCase()}
                        </span>
                    </td>
                    <td class="text-right font-mono font-bold ${isIncome ? 'text-success' : 'text-danger'}">
                        ${isIncome ? '+' : '-'} ${formatCurrency(tx.amount)}
                    </td>
                    <td class="text-center">
                        <div class="flex items-center justify-center gap-1">
                            <button class="btn btn-outline btn-xs" onclick='editTransaction(${JSON.stringify(tx).replace(/'/g, "&apos;")})' title="Edit">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn btn-outline btn-xs text-danger" onclick="openDeleteModal(${tx.id}, '${escapeHtml(tx.title)}', ${tx.amount})" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-danger">Error loading data.</td></tr>';
    }
}

function updatePaginationInfo() {
    const info = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('btnPrevPage');
    const nextBtn = document.getElementById('btnNextPage');
    const indicator = document.getElementById('pageIndicator');

    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const start = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(page * limit, totalRecords);

    if (info) info.textContent = `Showing ${start} to ${end} of ${totalRecords} transactions`;
    if (indicator) indicator.textContent = `Page ${page} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = (page <= 1);
    if (nextBtn) nextBtn.disabled = (page >= totalPages);
}

function prevPage() {
    if (page > 1) {
        page--;
        loadTransactions();
    }
}

function nextPage() {
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    if (page < totalPages) {
        page++;
        loadTransactions();
    }
}

function changeSort(col) {
    if (currentFilters.sort_by === col) {
        currentFilters.sort_order = currentFilters.sort_order === 'asc' ? 'desc' : 'asc';
    } else {
        currentFilters.sort_by = col;
        currentFilters.sort_order = 'desc';
    }
    page = 1;
    loadTransactions();
}

function resetFilters() {
    document.getElementById('filterSearch').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterPayment').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';

    currentFilters = {
        search: '',
        type: '',
        category: '',
        payment_method: '',
        start_date: '',
        end_date: '',
        sort_by: 'date',
        sort_order: 'desc'
    };
    page = 1;
    loadTransactions();
}

// Edit transaction
function editTransaction(tx) {
    openTransactionModal(tx.type, tx);
}

// Delete confirmation modal
function openDeleteModal(id, title, amount) {
    pendingDeleteId = id;
    const box = document.getElementById('deletePreviewBox');
    if (box) {
        box.innerHTML = `<strong>${title}</strong> &middot; <span class="font-mono">${formatCurrency(amount)}</span>`;
    }
    document.getElementById('deleteConfirmModal').classList.add('active');
}

function closeDeleteModal() {
    pendingDeleteId = null;
    document.getElementById('deleteConfirmModal').classList.remove('active');
}

async function executeDelete() {
    if (!pendingDeleteId) return;
    try {
        const res = await fetch(`/api/transactions/${pendingDeleteId}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showToast('Transaction deleted from SQLite database', 'success');
            closeDeleteModal();
            loadTransactions();
        } else {
            showToast(json.error || 'Failed to delete record', 'danger');
        }
    } catch (err) {
        showToast('Network error while deleting', 'danger');
    }
}

function exportFilteredCSV() {
    const q = new URLSearchParams({
        type: currentFilters.type,
        category: currentFilters.category,
        start_date: currentFilters.start_date,
        end_date: currentFilters.end_date
    });
    window.location.href = `/api/export/csv?${q.toString()}`;
}

// Init listeners
document.addEventListener('DOMContentLoaded', () => {
    // Populate filter categories
    const select = document.getElementById('filterCategory');
    if (select) {
        fetch('/api/categories')
            .then(r => r.json())
            .then(json => {
                if (json.success) {
                    const all = [...json.data.expense, ...json.data.income];
                    all.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.name;
                        opt.textContent = c.name;
                        select.appendChild(opt);
                    });
                }
            });
    }

    // Attach search and filter event listeners
    const sInput = document.getElementById('filterSearch');
    if (sInput) {
        sInput.addEventListener('input', (e) => {
            currentFilters.search = e.target.value.trim();
            page = 1;
            loadTransactions();
        });
    }

    const tSelect = document.getElementById('filterType');
    if (tSelect) {
        tSelect.addEventListener('change', (e) => {
            currentFilters.type = e.target.value;
            page = 1;
            loadTransactions();
        });
    }

    const cSelect = document.getElementById('filterCategory');
    if (cSelect) {
        cSelect.addEventListener('change', (e) => {
            currentFilters.category = e.target.value;
            page = 1;
            loadTransactions();
        });
    }

    const pSelect = document.getElementById('filterPayment');
    if (pSelect) {
        pSelect.addEventListener('change', (e) => {
            currentFilters.payment_method = e.target.value;
            page = 1;
            loadTransactions();
        });
    }

    const startInput = document.getElementById('filterStartDate');
    const endInput = document.getElementById('filterEndDate');
    if (startInput && endInput) {
        const handleDateChange = () => {
            currentFilters.start_date = startInput.value;
            currentFilters.end_date = endInput.value;
            page = 1;
            loadTransactions();
        };
        startInput.addEventListener('change', handleDateChange);
        endInput.addEventListener('change', handleDateChange);
    }

    loadTransactions();
});
