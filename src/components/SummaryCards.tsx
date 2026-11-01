import React from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  PiggyBank,
} from 'lucide-react';
import { DashboardSummary } from '../types.ts';
import { formatCurrency } from '../utils/formatters.ts';

interface SummaryCardsProps {
  summary: DashboardSummary;
  isLoading?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, isLoading = false }) => {
  const isPositive = summary.current_balance >= 0;
  const b = summary.monthly_budget;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Balance Card - Purple/Indigo Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 p-5 text-white shadow-lg shadow-indigo-950/50 border border-indigo-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-indigo-200">
              Total Balance
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md">
              <Wallet className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono tabular-nums">
              {isLoading ? '...' : formatCurrency(summary.current_balance)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-indigo-100">
              {isPositive ? (
                <>
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-300" />
                  <span className="text-emerald-200 font-semibold">{summary.savings_rate.toFixed(1)}%</span>
                  <span>savings rate</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3.5 w-3.5 text-rose-300" />
                  <span className="text-rose-200 font-semibold">Net Deficit</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 2. Total Income Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-400">
              Total Income
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400 font-mono tabular-nums">
              {isLoading ? '...' : formatCurrency(summary.total_income)}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              <span className="text-slate-300 font-mono font-medium">
                {formatCurrency(summary.month_income)}
              </span>{' '}
              this month
            </div>
          </div>
        </div>

        {/* 3. Total Expenses Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-400">
              Total Expenses
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-400 font-mono tabular-nums">
              {isLoading ? '...' : formatCurrency(summary.total_expenses)}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              <span className="text-slate-300 font-mono font-medium">
                {formatCurrency(summary.month_expense)}
              </span>{' '}
              this month
            </div>
          </div>
        </div>

        {/* 4. Monthly Budget Usage Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-400">
              Monthly Budget
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono tabular-nums">
              {isLoading ? '...' : b.overall_budget > 0 ? `${b.percentage.toFixed(1)}%` : 'Not Set'}
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  b.status === 'exceeded'
                    ? 'bg-rose-500'
                    : b.status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(b.percentage, 100)}%` }}
              />
            </div>

            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
              <span>Remaining:</span>
              <span className="font-mono text-slate-200 font-semibold">
                {formatCurrency(b.remaining)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Insight Bar */}
      <div className="px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/70 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-rose-400" />
          <span className="text-slate-400">Highest Spending Category:</span>
          <strong className="text-white">
            {summary.highest_spending_category.category} ({formatCurrency(summary.highest_spending_category.amount)})
          </strong>
        </div>

        <div className="flex items-center gap-2">
          <PiggyBank className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400">Monthly Net Savings:</span>
          <strong className="text-emerald-400 font-mono">
            {formatCurrency(summary.monthly_savings)}
          </strong>
        </div>
      </div>
    </div>
  );
};
