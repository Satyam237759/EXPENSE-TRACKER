import React, { useState, useEffect } from 'react';
import { Repeat, Plus, Zap, Trash2, X, Calendar, Check } from 'lucide-react';
import { RecurringTransaction, CategoryOptions } from '../types.ts';
import { formatCurrency, formatDate } from '../utils/formatters.ts';

interface RecurringViewProps {
  categories: CategoryOptions;
  onRefreshSummary: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const RecurringView: React.FC<RecurringViewProps> = ({
  categories,
  onRefreshSummary,
  showToast,
}) => {
  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [nextDueDate, setNextDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const loadRecurring = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/recurring');
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data);
      }
    } catch (err) {
      console.error('Failed to load recurring items', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecurring();
  }, []);

  const handleProcessDue = async () => {
    try {
      setIsProcessing(true);
      const res = await fetch('/api/recurring/process', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, 'success');
        loadRecurring();
        onRefreshSummary();
      }
    } catch (err) {
      showToast('Error processing recurring items', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!title.trim() || isNaN(num) || num <= 0 || !category) return;

    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          amount: num,
          type,
          category,
          frequency,
          payment_method: paymentMethod,
          next_due_date: nextDueDate,
          notes: notes.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Recurring automation created', 'success');
        setIsModalOpen(false);
        setTitle('');
        setAmount('');
        setNotes('');
        loadRecurring();
      }
    } catch (err) {
      showToast('Error saving recurring rule', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this recurring rule?')) return;
    try {
      const res = await fetch(`/api/recurring/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Recurring rule deleted', 'success');
        loadRecurring();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const currentCategories = type === 'expense' ? categories.expense : categories.income;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">Recurring Financial Automations</h3>
          <p className="text-xs text-slate-400">
            Automate monthly salary payouts, rent, bills, and subscriptions with duplicate protection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleProcessDue}
            disabled={isProcessing}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Processing...' : 'Process Due Now'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCategory(currentCategories[0]?.name || 'Rent');
              setIsModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Automation</span>
          </button>
        </div>
      </div>

      {/* Rules Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading recurring rules...</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No recurring rules established yet. Set up your monthly rent or salary!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Next Due Date</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {items.map((item) => {
                  const isIncome = item.type === 'income';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {item.title}
                        {item.notes && <div className="text-[11px] text-slate-500 mt-0.5">{item.notes}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isIncome ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{item.category}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-300 capitalize">{item.frequency}</td>
                      <td className="py-3.5 px-4 text-slate-400">{item.payment_method}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{formatDate(item.next_due_date)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={isIncome ? 'text-emerald-400' : 'text-rose-400'}>
                          {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Recurring Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Add Recurring Automation</h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRecurring} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setType('expense');
                    setCategory(categories.expense[0]?.name || 'Rent');
                  }}
                  className={`py-1.5 text-xs font-bold rounded-lg ${
                    type === 'expense' ? 'bg-rose-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('income');
                    setCategory(categories.income[0]?.name || 'Salary');
                  }}
                  className={`py-1.5 text-xs font-bold rounded-lg ${
                    type === 'income' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Income
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Monthly Salary, House Rent, Netflix"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="25000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm font-mono text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Frequency *
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    {currentCategories.map((c) => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Next Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm font-mono text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="UPI">UPI (Auto-Pay)</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Cash">Cash</option>
                </select>
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
                  Save Automation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
