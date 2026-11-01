/**
 * SmartSpend - Professional Expense Tracker Web Application
 * Master application orchestrating dashboard, transactions, budgets, savings goals,
 * recurring rules, analytical reports, and user profile.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Menu, Plus, Minus, Download, IndianRupee, LogOut } from 'lucide-react';
import {
  Transaction,
  DashboardSummary,
  CategoryOptions,
  FilterState,
  ToastMessage,
  User,
} from './types.ts';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { SummaryCards } from './components/SummaryCards.tsx';
import { ExpenseCharts } from './components/ExpenseCharts.tsx';
import { TransactionTable } from './components/TransactionTable.tsx';
import { TransactionModal } from './components/TransactionModal.tsx';
import { DeleteConfirmModal } from './components/DeleteConfirmModal.tsx';
import { BudgetsView } from './components/BudgetsView.tsx';
import { SavingsGoalsView } from './components/SavingsGoalsView.tsx';
import { RecurringView } from './components/RecurringView.tsx';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { AuthView } from './components/AuthView.tsx';
import { ToastContainer } from './components/Toast.tsx';
import { formatCurrency } from './utils/formatters.ts';
import {
  getStoredToken,
  setupFetchInterceptor,
  checkAuth,
  logoutUser,
} from './utils/api.ts';

const DEFAULT_SUMMARY: DashboardSummary = {
  total_income: 0,
  total_expenses: 0,
  current_balance: 0,
  monthly_savings: 0,
  month_income: 0,
  month_expense: 0,
  savings_rate: 0,
  total_transactions: 0,
  monthly_budget: {
    overall_budget: 0,
    spent: 0,
    percentage: 0,
    remaining: 0,
    status: 'normal',
  },
  weekly_trend: [],
  highest_spending_category: { category: 'None', amount: 0 },
  expense_breakdown: [],
  income_breakdown: [],
  monthly_trends: [],
  recent_transactions: [],
};

const DEFAULT_CATEGORIES: CategoryOptions = {
  expense: [
    { id: 1, name: 'Food & Dining', type: 'expense' },
    { id: 2, name: 'Rent', type: 'expense' },
    { id: 3, name: 'Transportation', type: 'expense' },
    { id: 4, name: 'Bills & Utilities', type: 'expense' },
    { id: 5, name: 'Shopping', type: 'expense' },
    { id: 6, name: 'Health', type: 'expense' },
    { id: 7, name: 'Entertainment', type: 'expense' },
    { id: 8, name: 'Subscriptions', type: 'expense' },
    { id: 9, name: 'Education', type: 'expense' },
    { id: 10, name: 'Travel', type: 'expense' },
    { id: 11, name: 'Other', type: 'expense' },
  ],
  income: [
    { id: 12, name: 'Salary', type: 'income' },
    { id: 13, name: 'Freelance', type: 'income' },
    { id: 14, name: 'Business', type: 'income' },
    { id: 15, name: 'Investments', type: 'income' },
    { id: 16, name: 'Gifts', type: 'income' },
    { id: 17, name: 'Rental Income', type: 'income' },
    { id: 18, name: 'Other Income', type: 'income' },
  ],
};

const DEFAULT_FILTERS: FilterState = {
  search: '',
  type: '',
  category: '',
  payment_method: '',
  startDate: '',
  endDate: '',
  sortBy: 'date',
  sortOrder: 'desc',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Data States
  const [summary, setSummary] = useState<DashboardSummary>(DEFAULT_SUMMARY);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoryOptions>(DEFAULT_CATEGORIES);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Loaders
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<'income' | 'expense'>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. Fetch Dashboard Summary
  const fetchSummary = useCallback(async () => {
    try {
      setIsLoadingSummary(true);
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success && json.data) {
        setSummary(json.data);
      }
    } catch (err: any) {
      console.error('Failed to load summary:', err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  // 2. Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      const json = await res.json();
      if (json.success && json.data) {
        setCategories(json.data);
      }
    } catch (err: any) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  // 3. Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoadingTransactions(true);
      const q = new URLSearchParams();
      if (filters.search) q.set('search', filters.search);

      // Force type if on income tab
      const effectiveType = activeTab === 'income' ? 'income' : filters.type;
      if (effectiveType) q.set('type', effectiveType);

      if (filters.category) q.set('category', filters.category);
      if (filters.payment_method) q.set('payment_method', filters.payment_method);
      if (filters.startDate) q.set('start_date', filters.startDate);
      if (filters.endDate) q.set('end_date', filters.endDate);
      if (filters.sortBy) q.set('sort_by', filters.sortBy);
      if (filters.sortOrder) q.set('sort_order', filters.sortOrder);
      q.set('limit', '100');

      const res = await fetch(`/api/transactions?${q.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTransactions(json.data);
      }
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
      addToast('Error fetching transactions from database', 'error');
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [filters, activeTab, addToast]);

  // Install fetch interceptor and check authentication on mount
  useEffect(() => {
    setupFetchInterceptor(() => {
      setCurrentUser(null);
      addToast('Session expired. Please log in again.', 'info');
    });

    const initAuth = async () => {
      try {
        const res = await checkAuth();
        if (res.authenticated && res.user) {
          setCurrentUser(res.user);
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    };

    initAuth();
  }, [addToast]);

  // Reload financial ledger whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      fetchSummary();
      fetchCategories();
      fetchTransactions();
    }
  }, [currentUser, fetchSummary, fetchCategories, fetchTransactions]);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setSummary(DEFAULT_SUMMARY);
    setTransactions([]);
    addToast('You have been signed out safely.', 'info');
  };

  const handleOpenAddModal = (type: 'expense' | 'income' = 'expense') => {
    setEditingTransaction(null);
    setModalDefaultType(type);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (data: {
    title: string;
    amount: number;
    category: string;
    date: string;
    type: 'income' | 'expense';
    payment_method: string;
    notes?: string;
  }): Promise<boolean> => {
    try {
      const isEdit = Boolean(editingTransaction);
      const url = isEdit ? `/api/transactions/${editingTransaction!.id}` : '/api/transactions';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save transaction');
      }

      addToast(
        isEdit
          ? `Updated "${data.title}" successfully`
          : `Added ${data.type} of ${formatCurrency(data.amount)}`,
        'success'
      );

      await Promise.all([fetchSummary(), fetchTransactions()]);
      return true;
    } catch (err: any) {
      addToast(err.message || 'Operation failed', 'error');
      return false;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTransaction) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/transactions/${deletingTransaction.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete');
      }

      addToast(`Deleted "${deletingTransaction.title}" from SQLite database`, 'success');
      setDeletingTransaction(null);
      await Promise.all([fetchSummary(), fetchTransactions()]);
    } catch (err: any) {
      addToast(err.message || 'Failed to delete', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Authentication Loading State
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Verifying SmartSpend session...</p>
      </div>
    );
  }

  // Auth Gate: Render Login / Register view if user is not authenticated
  if (!currentUser) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <AuthView
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            addToast(`Welcome back, ${user.name}!`, 'success');
          }}
        />
      </>
    );
  }

  const exportCsvUrl = `/api/export/csv?token=${encodeURIComponent(getStoredToken() || '')}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Modern Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={handleOpenAddModal}
        currentUser={currentUser}
        totalTransactionsCount={summary.total_transactions}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-slate-900/85 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span>SmartSpend</span>
                <span>/</span>
                <span className="text-indigo-400 font-semibold capitalize">
                  {activeTab === 'income'
                    ? 'Income Hub'
                    : activeTab === 'savings'
                    ? 'Savings Goals'
                    : activeTab === 'recurring'
                    ? 'Recurring Rules'
                    : activeTab}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                {activeTab === 'dashboard' && 'Financial Overview'}
                {activeTab === 'transactions' && 'Transaction Management'}
                {activeTab === 'income' && 'Income Stream & Revenue'}
                {activeTab === 'budgets' && 'Monthly Budget Control'}
                {activeTab === 'savings' && 'Savings Goals & Wealth Target'}
                {activeTab === 'recurring' && 'Recurring Financial Automations'}
                {activeTab === 'analytics' && 'Analytics & Reports'}
                {activeTab === 'profile' && 'Account & Security Settings'}
              </h2>
            </div>
          </div>

          {/* Action Zone */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 text-xs font-bold text-indigo-400 font-mono">
              <IndianRupee className="w-3.5 h-3.5" />
              <span>INR (₹)</span>
            </div>

            <a
              href={exportCsvUrl}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              title="Download CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </a>

            <button
              type="button"
              onClick={() => handleOpenAddModal('expense')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add</span> Expense
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddModal('income')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add</span> Income
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-rose-500/15 text-xs font-bold text-slate-300 hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Viewport Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <SummaryCards summary={summary} isLoading={isLoadingSummary} />
              <ExpenseCharts
                expenseBreakdown={summary.expense_breakdown}
                incomeBreakdown={summary.income_breakdown}
                monthlyTrends={summary.monthly_trends}
                weeklyTrend={summary.weekly_trend}
                totalExpenses={summary.total_expenses}
                totalIncome={summary.total_income}
              />
              <TransactionTable
                transactions={transactions}
                totalDatabaseCount={summary.total_transactions}
                filters={filters}
                onFilterChange={(u) => setFilters((prev) => ({ ...prev, ...u }))}
                onResetFilters={() => setFilters(DEFAULT_FILTERS)}
                onOpenAddModal={handleOpenAddModal}
                onEditTransaction={(tx) => {
                  setEditingTransaction(tx);
                  setIsModalOpen(true);
                }}
                onDeleteTransaction={(tx) => setDeletingTransaction(tx)}
                categoryOptions={categories}
                isLoading={isLoadingTransactions}
                tableTitle="Recent Transactions & Ledger"
              />
            </div>
          )}

          {/* TAB 2: TRANSACTIONS ONLY */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <SummaryCards summary={summary} isLoading={isLoadingSummary} />
              <TransactionTable
                transactions={transactions}
                totalDatabaseCount={summary.total_transactions}
                filters={filters}
                onFilterChange={(u) => setFilters((prev) => ({ ...prev, ...u }))}
                onResetFilters={() => setFilters(DEFAULT_FILTERS)}
                onOpenAddModal={handleOpenAddModal}
                onEditTransaction={(tx) => {
                  setEditingTransaction(tx);
                  setIsModalOpen(true);
                }}
                onDeleteTransaction={(tx) => setDeletingTransaction(tx)}
                categoryOptions={categories}
                isLoading={isLoadingTransactions}
                tableTitle="All Transactions"
              />
            </div>
          )}

          {/* TAB 3: INCOME HUB */}
          {activeTab === 'income' && (
            <div className="space-y-6">
              <SummaryCards summary={summary} isLoading={isLoadingSummary} />
              <TransactionTable
                transactions={transactions.filter((t) => t.type === 'income')}
                totalDatabaseCount={summary.income_breakdown.reduce((sum, i) => sum + i.count, 0)}
                filters={{ ...filters, type: 'income' }}
                onFilterChange={(u) => setFilters((prev) => ({ ...prev, ...u }))}
                onResetFilters={() => setFilters(DEFAULT_FILTERS)}
                onOpenAddModal={() => handleOpenAddModal('income')}
                onEditTransaction={(tx) => {
                  setEditingTransaction(tx);
                  setIsModalOpen(true);
                }}
                onDeleteTransaction={(tx) => setDeletingTransaction(tx)}
                categoryOptions={categories}
                isLoading={isLoadingTransactions}
                defaultTypeFilter="income"
                tableTitle="Income History & Stream Audits"
              />
            </div>
          )}

          {/* TAB 4: BUDGETS */}
          {activeTab === 'budgets' && (
            <BudgetsView categories={categories} onRefreshSummary={fetchSummary} />
          )}

          {/* TAB 5: SAVINGS GOALS */}
          {activeTab === 'savings' && (
            <SavingsGoalsView onRefreshSummary={fetchSummary} />
          )}

          {/* TAB 6: RECURRING RULES */}
          {activeTab === 'recurring' && (
            <RecurringView
              categories={categories}
              onRefreshSummary={fetchSummary}
              showToast={addToast}
            />
          )}

          {/* TAB 7: ANALYTICS & REPORTS */}
          {activeTab === 'analytics' && <AnalyticsView />}

          {/* TAB 8: PROFILE & SYSTEM */}
          {activeTab === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              onUpdateUser={(name, email) => setCurrentUser((u) => (u ? { ...u, name, email } : null))}
              showToast={addToast}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* Global Add / Edit Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        initialData={editingTransaction}
        categoryOptions={categories}
        defaultType={modalDefaultType}
      />

      {/* Global Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingTransaction)}
        transaction={deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
