import React, { useState, useEffect } from 'react';
import { PiggyBank, Plus, Sliders, AlertTriangle, CheckCircle, Trash2, X } from 'lucide-react';
import { BudgetItem, CategoryOptions } from '../types.ts';
import { formatCurrency } from '../utils/formatters.ts';

interface BudgetsViewProps {
  categories: CategoryOptions;
  onRefreshSummary: () => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({ categories, onRefreshSummary }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState('Overall');
  const [targetAmount, setTargetAmount] = useState('');

  const loadBudgets = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/budgets?month=${selectedMonth}`);
      const json = await res.json();
      if (json.success && json.data) {
        setBudgets(json.data.budgets || []);
        setTotalSpent(json.data.total_spent || 0);
      }
    } catch (err) {
      console.error('Failed to load budgets', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, [selectedMonth]);

  const overallBudget = budgets.find((b) => b.is_overall);
  const categoryBudgets = budgets.filter((b) => !b.is_overall);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(targetAmount);
    if (isNaN(num) || num <= 0) return;

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          category: targetCategory,
          amount: num,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setTargetAmount('');
        loadBudgets();
        onRefreshSummary();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBudget = async (id: number) => {
    if (!confirm('Are you sure you want to remove this budget limit?')) return;
    try {
      const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        loadBudgets();
        onRefreshSummary();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Month Selector & Action Bar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Budget Month:
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-sm font-mono text-white focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setTargetCategory('Overall');
              setTargetAmount(overallBudget ? overallBudget.budget_amount.toString() : '');
              setIsModalOpen(true);
            }}
            className="px-3 py-2 rounded-xl border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Set Overall Budget</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetCategory(categories.expense[0]?.name || 'Food & Dining');
              setTargetAmount('');
              setIsModalOpen(true);
            }}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category Limit</span>
          </button>
        </div>
      </div>

      {/* Overall Budget Overview Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Monthly Spending Cap ({selectedMonth})
            </span>
            <div className="text-3xl font-extrabold text-white font-mono mt-1">
              {overallBudget ? formatCurrency(overallBudget.budget_amount) : 'No Cap Established'}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Current Spent
            </span>
            <div className="text-3xl font-extrabold text-rose-400 font-mono mt-1">
              {formatCurrency(totalSpent)}
            </div>
          </div>
        </div>

        {overallBudget && (
          <>
            <div className="mt-4 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  overallBudget.status === 'exceeded'
                    ? 'bg-rose-500'
                    : overallBudget.status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(overallBudget.percentage, 100)}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">
                {overallBudget.percentage.toFixed(1)}% Used
              </span>
              <span>
                Remaining Budget:{' '}
                <strong className="text-white font-mono font-bold">
                  {formatCurrency(overallBudget.remaining)}
                </strong>
              </span>
            </div>

            {overallBudget.status === 'exceeded' && (
              <div className="mt-4 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Budget Exceeded! You have spent {formatCurrency(overallBudget.spent_amount - overallBudget.budget_amount)} over your planned threshold.
                </span>
              </div>
            )}

            {overallBudget.status === 'warning' && (
              <div className="mt-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Warning: You have reached {overallBudget.percentage.toFixed(1)}% of your monthly spending cap.
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Category Budgets Grid */}
      <div>
        <h3 className="text-base font-bold text-white mb-4">Category Budgets</h3>
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading budgets...</div>
        ) : categoryBudgets.length === 0 ? (
          <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900 text-center">
            <p className="text-xs text-slate-400">
              No category limits configured for {selectedMonth}. Add limits for Food, Shopping, or Travel to manage department spending.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryBudgets.map((b) => {
              const isExceeded = b.status === 'exceeded';
              const isWarning = b.status === 'warning';

              return (
                <div key={b.id} className="p-4 rounded-2xl border border-slate-800 bg-slate-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-indigo-400 border border-slate-700">
                      {b.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteBudget(b.id)}
                      className="p-1 rounded-md text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete category budget"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500">Budget Limit</span>
                      <div className="text-sm font-bold font-mono text-white mt-0.5">
                        {formatCurrency(b.budget_amount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500">Actual Spent</span>
                      <div className={`text-sm font-bold font-mono mt-0.5 ${isExceeded ? 'text-rose-400' : 'text-white'}`}>
                        {formatCurrency(b.spent_amount)}
                      </div>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(b.percentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className={isExceeded ? 'text-rose-400 font-bold' : isWarning ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                      {b.percentage.toFixed(1)}% Used
                    </span>
                    <span className="text-slate-400">
                      Left: <strong className="text-white font-mono">{formatCurrency(b.remaining)}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Set Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Set Budget Limit</h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="Overall">Overall Monthly Spending</option>
                  {categories.expense.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Budget Amount (₹)
                </label>
                <input
                  type="number"
                  step="100"
                  min="1"
                  required
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm font-mono text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-sm"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
