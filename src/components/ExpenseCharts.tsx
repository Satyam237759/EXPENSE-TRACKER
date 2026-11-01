import React, { useState } from 'react';
import { PieChart as PieChartIcon, BarChart3, LineChart, Info } from 'lucide-react';
import { CategoryBreakdown, MonthlyTrend, WeeklyTrendItem } from '../types.ts';
import { formatCurrency, getCategoryStyle } from '../utils/formatters.ts';

interface ExpenseChartsProps {
  expenseBreakdown: CategoryBreakdown[];
  incomeBreakdown: CategoryBreakdown[];
  monthlyTrends: MonthlyTrend[];
  weeklyTrend: WeeklyTrendItem[];
  totalExpenses: number;
  totalIncome: number;
}

export const ExpenseCharts: React.FC<ExpenseChartsProps> = ({
  expenseBreakdown,
  incomeBreakdown,
  monthlyTrends,
  weeklyTrend,
  totalExpenses,
  totalIncome,
}) => {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const currentBreakdown = activeTab === 'expense' ? expenseBreakdown : incomeBreakdown;
  const currentTotal = activeTab === 'expense' ? totalExpenses : totalIncome;

  // Donut SVG Calculations
  const size = 220;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedPercent = 0;
  const fallbackColors = [
    '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
  ];

  return (
    <div className="space-y-6">
      {/* Upper Grid: Monthly Income vs Expense + Category Doughnut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown Doughnut Chart */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
                  <PieChartIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {activeTab === 'expense' ? 'Expense Distribution' : 'Income Breakdown'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Category share & percentages</p>
                </div>
              </div>

              <div className="flex items-center bg-slate-800 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('expense');
                    setHoveredCategory(null);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    activeTab === 'expense' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Expenses
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('income');
                    setHoveredCategory(null);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    activeTab === 'income' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Income
                </button>
              </div>
            </div>

            {currentBreakdown.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No transactions recorded for this view.
              </div>
            ) : (
              <div className="mt-4 flex flex-col sm:flex-row items-center gap-6">
                {/* SVG Donut */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <svg width={size} height={size} className="transform -rotate-90">
                    <circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="transparent"
                      stroke="#1e293b"
                      strokeWidth={strokeWidth}
                    />

                    {currentBreakdown.map((item, index) => {
                      const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                      accumulatedPercent += item.percentage;

                      const color = getCategoryStyle(item.category).hex || fallbackColors[index % fallbackColors.length];
                      const isHovered = hoveredCategory === item.category;

                      return (
                        <circle
                          key={item.category}
                          cx={center}
                          cy={center}
                          r={radius}
                          fill="transparent"
                          stroke={color}
                          strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-200 cursor-pointer"
                          onMouseEnter={() => setHoveredCategory(item.category)}
                          onMouseLeave={() => setHoveredCategory(null)}
                        />
                      );
                    })}
                  </svg>

                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
                    {hoveredCategory ? (
                      (() => {
                        const item = currentBreakdown.find((c) => c.category === hoveredCategory);
                        return item ? (
                          <>
                            <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[110px]">
                              {item.category}
                            </span>
                            <span className="text-base font-bold text-white font-mono tabular-nums">
                              {formatCurrency(item.total)}
                            </span>
                            <span className="text-xs font-bold text-indigo-400">
                              {item.percentage}%
                            </span>
                          </>
                        ) : null;
                      })()
                    ) : (
                      <>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Total
                        </span>
                        <span className="text-sm font-bold text-white font-mono tabular-nums">
                          {formatCurrency(currentTotal)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {currentBreakdown.length} items
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Category Legend list */}
                <div className="flex-1 w-full space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {currentBreakdown.map((item, index) => {
                    const style = getCategoryStyle(item.category);
                    const color = style.hex || fallbackColors[index % fallbackColors.length];
                    const isHovered = hoveredCategory === item.category;

                    return (
                      <div
                        key={item.category}
                        onMouseEnter={() => setHoveredCategory(item.category)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          isHovered
                            ? 'border-indigo-500 bg-indigo-950/40 text-white'
                            : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="font-semibold text-slate-200 truncate">{item.category}</span>
                          </div>
                          <span className="font-mono text-slate-300 font-semibold">{item.percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Income vs Expense Bars */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Monthly Cash Flow Trend</h3>
                  <p className="text-[11px] text-slate-400">Income vs Expenditure comparisons</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Income
                </span>
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Expense
                </span>
              </div>
            </div>

            {monthlyTrends.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No monthly history recorded yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {monthlyTrends.map((trend) => {
                  const maxVal = Math.max(trend.income, trend.expense, 1);
                  const incPct = (trend.income / maxVal) * 100;
                  const expPct = (trend.expense / maxVal) * 100;
                  const isNetPositive = trend.net >= 0;

                  return (
                    <div key={trend.month} className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40">
                      <div className="flex items-center justify-between text-xs font-semibold mb-2">
                        <span className="font-mono text-slate-300">{trend.month}</span>
                        <span className={`font-mono ${isNetPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          Net: {isNetPositive ? '+' : ''}{formatCurrency(trend.net)}
                        </span>
                      </div>

                      {/* Bar Rows */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="w-14 text-slate-400">Income</span>
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${incPct}%` }} />
                          </div>
                          <span className="font-mono text-emerald-400 font-semibold w-24 text-right">
                            {formatCurrency(trend.income)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="w-14 text-slate-400">Expense</span>
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 rounded-full transition-all duration-300" style={{ width: `${expPct}%` }} />
                          </div>
                          <span className="font-mono text-rose-400 font-semibold w-24 text-right">
                            {formatCurrency(trend.expense)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lower Row: Weekly Spending Trend */}
      {weeklyTrend && weeklyTrend.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                <LineChart className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Weekly Spending Activity</h3>
                <p className="text-[11px] text-slate-400">Daily expenses over the last 7 days</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2">
            {weeklyTrend.map((day) => (
              <div key={day.date} className="p-2.5 rounded-xl border border-slate-800/80 bg-slate-950/40 text-center">
                <div className="text-[11px] text-slate-400 font-medium">{day.label.split(' ')[0]}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{day.date.substring(5)}</div>
                <div className="mt-2 text-xs font-mono font-bold text-indigo-400">
                  {formatCurrency(day.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
