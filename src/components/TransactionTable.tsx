import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Download,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  X,
  RotateCcw,
  Receipt,
  CreditCard,
} from 'lucide-react';
import { Transaction, FilterState, CategoryOptions } from '../types.ts';
import { formatCurrency, formatDate, getCategoryStyle } from '../utils/formatters.ts';

interface TransactionTableProps {
  transactions: Transaction[];
  totalDatabaseCount: number;
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onOpenAddModal: (type?: 'income' | 'expense') => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
  categoryOptions: CategoryOptions;
  isLoading: boolean;
  defaultTypeFilter?: string;
  tableTitle?: string;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  totalDatabaseCount,
  filters,
  onFilterChange,
  onResetFilters,
  onOpenAddModal,
  onEditTransaction,
  onDeleteTransaction,
  categoryOptions,
  isLoading,
  defaultTypeFilter,
  tableTitle = 'Transaction History',
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [datePreset, setDatePreset] = useState<'all' | 'this_month' | 'last_30_days' | 'custom'>('all');

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.type ||
    filters.category ||
    filters.payment_method ||
    filters.startDate ||
    filters.endDate ||
    filters.sortBy !== 'date' ||
    filters.sortOrder !== 'desc'
  );

  const handleDatePreset = (preset: 'all' | 'this_month' | 'last_30_days' | 'custom') => {
    setDatePreset(preset);
    const today = new Date();
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'all') {
      onFilterChange({ startDate: '', endDate: '' });
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      onFilterChange({ startDate: formatYMD(firstDay), endDate: formatYMD(lastDay) });
    } else if (preset === 'last_30_days') {
      const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      onFilterChange({ startDate: formatYMD(past), endDate: formatYMD(today) });
    }
    setCurrentPage(1);
  };

  const totalItems = transactions.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalItems / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    if (pageSize === -1) return transactions;
    const startIndex = (currentPage - 1) * pageSize;
    return transactions.slice(startIndex, startIndex + pageSize);
  }, [transactions, currentPage, pageSize]);

  const allCategories = useMemo(() => {
    const list = Array.from(
      new Set([
        ...categoryOptions.expense.map((c) => c.name),
        ...categoryOptions.income.map((c) => c.name),
        ...transactions.map((t) => t.category),
      ])
    );
    return list.sort();
  }, [categoryOptions, transactions]);

  const handleSort = (column: string) => {
    if (filters.sortBy === column) {
      onFilterChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      onFilterChange({ sortBy: column, sortOrder: 'desc' });
    }
    setCurrentPage(1);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm overflow-hidden">
      {/* Table Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">{tableTitle}</h3>
              <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                {totalItems} {totalItems === 1 ? 'record' : 'records'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Filtered in real-time from SQLite (<code className="text-indigo-400">smartspend.db</code>)
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <a
              href="/api/export/csv"
              download="smartspend_transactions.csv"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export CSV</span>
            </a>

            <button
              type="button"
              onClick={() => onOpenAddModal(defaultTypeFilter === 'income' ? 'income' : 'expense')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-xs font-bold text-white shadow-md hover:from-indigo-500 hover:to-purple-500 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{defaultTypeFilter === 'income' ? 'Record Income' : 'Add Transaction'}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
          {/* Keyword Search */}
          <div className="md:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => {
                onFilterChange({ search: e.target.value });
                setCurrentPage(1);
              }}
              placeholder="Search title, merchant, or notes..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-all"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => {
                  onFilterChange({ search: '' });
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Buttons */}
          <div className="md:col-span-3 flex items-center bg-slate-800 p-1 rounded-xl">
            {(['', 'expense', 'income'] as const).map((t) => (
              <button
                key={t || 'all'}
                type="button"
                onClick={() => {
                  onFilterChange({ type: t });
                  setCurrentPage(1);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                  filters.type === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === '' ? 'All Types' : t}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-3">
            <select
              value={filters.category}
              onChange={(e) => {
                onFilterChange({ category: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs text-white focus:outline-hidden focus:border-indigo-500 transition-all"
            >
              <option value="">All Categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Selector */}
          <div className="md:col-span-2">
            <select
              value={filters.payment_method}
              onChange={(e) => {
                onFilterChange({ payment_method: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs text-white focus:outline-hidden focus:border-indigo-500 transition-all"
            >
              <option value="">All Payments</option>
              <option value="UPI">UPI</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Cash">Cash</option>
            </select>
          </div>
        </div>

        {/* Date Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-bold text-slate-400">Date Presets:</span>
            <button
              type="button"
              onClick={() => handleDatePreset('all')}
              className={`px-2 py-1 rounded-lg text-xs font-medium ${
                datePreset === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('this_month')}
              className={`px-2 py-1 rounded-lg text-xs font-medium ${
                datePreset === 'this_month' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('last_30_days')}
              className={`px-2 py-1 rounded-lg text-xs font-medium ${
                datePreset === 'last_30_days' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">From:</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                setDatePreset('custom');
                onFilterChange({ startDate: e.target.value });
              }}
              className="px-2 py-1 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono text-xs"
            />
            <span className="text-slate-500">To:</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                setDatePreset('custom');
                onFilterChange({ endDate: e.target.value });
              }}
              className="px-2 py-1 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono text-xs"
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  onResetFilters();
                  setDatePreset('all');
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 transition-colors font-medium flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500 text-xs">
          Loading records from SQLite database...
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-16 px-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
            <Receipt className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-sm font-bold text-white">No transactions found</h4>
          <p className="mt-1 text-xs text-slate-400">
            {totalDatabaseCount === 0
              ? 'Your SQLite database is currently clear. Record an income or expense to begin!'
              : 'No records matched your applied search filters. Try clearing your filters.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('date')}>
                    <div className="flex items-center gap-1">
                      <span>Date (DD-MM-YYYY)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('title')}>
                    <div className="flex items-center gap-1">
                      <span>Title & Description</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('category')}>
                    <div className="flex items-center gap-1">
                      <span>Category</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right cursor-pointer hover:text-white" onClick={() => handleSort('amount')}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Amount (₹)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedTransactions.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const catStyle = getCategoryStyle(tx.category);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-white truncate">{tx.title}</div>
                        {tx.notes && <div className="text-[11px] text-slate-500 truncate mt-0.5">{tx.notes}</div>}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${catStyle.bg} ${catStyle.text}`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-medium">
                        {tx.payment_method || 'UPI'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isIncome ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold tabular-nums">
                        <span className={isIncome ? 'text-emerald-400' : 'text-rose-400'}>
                          {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-400 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-slate-800">
            {paginatedTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const catStyle = getCategoryStyle(tx.category);

              return (
                <div key={tx.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm text-white">{tx.title}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{formatDate(tx.date)}</div>
                    </div>
                    <div className={`text-sm font-bold font-mono ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${catStyle.bg} ${catStyle.text}`}>
                        {tx.category}
                      </span>
                      <span className="text-[11px] text-slate-500">{tx.payment_method || 'UPI'}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditTransaction(tx)}
                        className="px-2 py-1 rounded text-xs text-indigo-400 bg-indigo-500/10"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx)}
                        className="px-2 py-1 rounded text-xs text-rose-400 bg-rose-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Footer */}
          <div className="px-5 py-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-700 bg-slate-800 text-white font-medium focus:outline-hidden"
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={-1}>All</option>
              </select>
              <span>
                Showing {pageSize === -1 ? totalItems : Math.min(totalItems, (currentPage - 1) * pageSize + 1)} to{' '}
                {pageSize === -1 ? totalItems : Math.min(totalItems, currentPage * pageSize)} of {totalItems}
              </span>
            </div>

            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-2 font-mono">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
