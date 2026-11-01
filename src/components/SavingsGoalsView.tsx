import React, { useState, useEffect } from 'react';
import { Target, Plus, CheckCircle2, Trash2, X, PiggyBank, Calendar } from 'lucide-react';
import { SavingsGoal } from '../types.ts';
import { formatCurrency, formatDate } from '../utils/formatters.ts';

interface SavingsGoalsViewProps {
  onRefreshSummary: () => void;
}

export const SavingsGoalsView: React.FC<SavingsGoalsViewProps> = ({ onRefreshSummary }) => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Goal Modal
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });
  const [category, setCategory] = useState('General');
  const [initialAmount, setInitialAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Contribution Modal
  const [activeContributionGoal, setActiveContributionGoal] = useState<SavingsGoal | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribDate, setContribDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [contribNotes, setContribNotes] = useState('');

  const loadGoals = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/savings-goals');
      const json = await res.json();
      if (json.success && json.data) {
        setGoals(json.data);
      }
    } catch (err) {
      console.error('Failed to load goals', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const tAmount = parseFloat(targetAmount);
    if (!title.trim() || isNaN(tAmount) || tAmount <= 0) return;

    try {
      const res = await fetch('/api/savings-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          target_amount: tAmount,
          target_date: targetDate,
          category: category.trim(),
          initial_amount: parseFloat(initialAmount || '0'),
          notes: notes.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsNewGoalOpen(false);
        setTitle('');
        setTargetAmount('');
        setInitialAmount('');
        setNotes('');
        loadGoals();
        onRefreshSummary();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContributionGoal) return;
    const amt = parseFloat(contribAmount);
    if (isNaN(amt) || amt <= 0) return;

    try {
      const res = await fetch(`/api/savings-goals/${activeContributionGoal.id}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          date: contribDate,
          notes: contribNotes.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActiveContributionGoal(null);
        setContribAmount('');
        setContribNotes('');
        loadGoals();
        onRefreshSummary();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (!confirm('Are you sure you want to delete this savings goal?')) return;
    try {
      const res = await fetch(`/api/savings-goals/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        loadGoals();
        onRefreshSummary();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">Savings Goals & Milestones</h3>
          <p className="text-xs text-slate-400">
            Track recorded deposit contributions toward your long-term wealth targets
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsNewGoalOpen(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* Goals Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-500 text-xs">Loading savings goals...</div>
      ) : goals.length === 0 ? (
        <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900 text-center">
          <p className="text-xs text-slate-400">
            No savings goals established yet. Start planning for an emergency fund, vehicle, tech setup, or dream vacation!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((g) => {
            const isCompleted = g.is_completed;
            const progress = g.progress_percentage;

            return (
              <div
                key={g.id}
                className="p-5 rounded-2xl border border-slate-800 bg-slate-900 flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-indigo-400 border border-slate-700">
                      {g.category || 'General'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(g.id)}
                      className="p-1 rounded-md text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-base font-bold text-white mt-2.5">{g.title}</h4>
                  {g.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{g.notes}</p>}

                  <div className="flex items-center justify-between mt-4 text-xs">
                    <div>
                      <span className="text-slate-500">Saved Deposit</span>
                      <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                        {formatCurrency(g.current_amount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500">Target</span>
                      <div className="text-base font-bold font-mono text-white mt-0.5">
                        {formatCurrency(g.target_amount)}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">{progress.toFixed(1)}% Saved</span>
                    <span>
                      {isCompleted ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed!
                        </span>
                      ) : (
                        <>
                          Remaining:{' '}
                          <strong className="text-white font-mono">{formatCurrency(g.remaining_amount)}</strong>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Deadline: {formatDate(g.target_date)}</span>
                    <span>{g.days_left >= 0 ? `${g.days_left} days left` : 'Past deadline'}</span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">{g.contributions.length} recorded deposits</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveContributionGoal(g);
                      setContribAmount('');
                      setContribNotes('');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 text-xs font-semibold text-indigo-300 hover:text-white transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Deposit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create New Goal Modal */}
      {isNewGoalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Create Savings Goal</h4>
              <button
                type="button"
                onClick={() => setIsNewGoalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. MacBook Pro M3, Emergency Fund"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Target (₹) *
                  </label>
                  <input
                    type="number"
                    step="100"
                    min="1"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="100000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm font-mono text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Target Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm font-mono text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Electronics, Security"
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Initial Deposit (₹)
                  </label>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm font-mono text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Notes / Strategy
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Monthly savings milestone plan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:outline-hidden focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewGoalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-sm"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Contribution Modal */}
      {activeContributionGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Add Deposit</h4>
              <button
                type="button"
                onClick={() => setActiveContributionGoal(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Depositing towards: <strong className="text-white">{activeContributionGoal.title}</strong>
            </p>

            <form onSubmit={handleRecordContribution} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Deposit Amount (₹) *
                </label>
                <input
                  type="number"
                  step="10"
                  min="1"
                  required
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm font-mono text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Deposit Date *
                </label>
                <input
                  type="date"
                  required
                  value={contribDate}
                  onChange={(e) => setContribDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm font-mono text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={contribNotes}
                  onChange={(e) => setContribNotes(e.target.value)}
                  placeholder="e.g. Freelance project bonus deposit"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveContributionGoal(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-sm"
                >
                  Save Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
