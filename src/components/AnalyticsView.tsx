import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatters.ts';

interface AnalyticsData {
  start_date: string;
  end_date: string;
  total_income: number;
  total_expense: number;
  net_savings: number;
  savings_rate: number;
  daily_average_spending: number;
  highest_spending_month: { month: string; amount: number };
  lowest_spending_month: { month: string; amount: number };
  category_breakdown: Array<{ category: string; total: number; count: number; percentage: number }>;
  payment_methods: Array<{ method: string; total: number; count: number }>;
}

export const AnalyticsView: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const q = new URLSearchParams();
      if (startDate) q.set('start_date', startDate);
      if (endDate) q.set('end_date', endDate);

      const res = await fetch(`/api/analytics?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [startDate, endDate]);

  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleExportCSV = () => {
    const q = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    window.location.href = `/api/export/csv?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Date Filter Bar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-bold text-slate-400 uppercase tracking-wider">Presets:</span>
          <button
            type="button"
            onClick={() => setPreset(30)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
          >
            Last 30 Days
          </button>
          <button
            type="button"
            onClick={() => setPreset(90)}
            className="px-2.5 py-1.5 rounded-lg border border-indigo-600 bg-indigo-600/20 text-indigo-300 font-bold"
          >
            Last 90 Days
          </button>
          <button
            type="button"
            onClick={() => setPreset(365)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
          >
            This Year
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white font-mono"
          />
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Daily Average Spending
            </span>
            <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
              {formatCurrency(data.daily_average_spending)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Per day in selected window</p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Net Capital Retained
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
              {formatCurrency(data.net_savings)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{data.savings_rate.toFixed(1)}% savings rate</p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Peak Spending Month
            </span>
            <div className="text-2xl font-bold font-mono text-white mt-2">
              {formatCurrency(data.highest_spending_month.amount)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Month: {data.highest_spending_month.month}
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Lowest Spending Month
            </span>
            <div className="text-2xl font-bold font-mono text-indigo-400 mt-2">
              {formatCurrency(data.lowest_spending_month.amount)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Month: {data.lowest_spending_month.month}
            </p>
          </div>
        </div>
      )}

      {/* Category Breakdown Table */}
      {data && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">Period Category Attribution</h4>
            <span className="text-xs text-slate-400 font-mono">
              Total Spent: {formatCurrency(data.total_expense)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Volume Count</th>
                  <th className="py-3 px-4">Share %</th>
                  <th className="py-3 px-4 text-right">Attributed Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.category_breakdown.map((c) => (
                  <tr key={c.category} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{c.category}</td>
                    <td className="py-3 px-4 text-slate-400">{c.count} records</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 max-w-xs">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${c.percentage}%` }}
                          />
                        </div>
                        <span className="font-mono text-slate-300 w-10 text-right">{c.percentage}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {formatCurrency(c.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Methods Share */}
      {data && data.payment_methods.length > 0 && (
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900">
          <h4 className="text-sm font-bold text-white mb-3">Payment Method Breakdown</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.payment_methods.map((p) => (
              <div key={p.method} className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 text-center">
                <div className="text-xs font-semibold text-slate-300">{p.method}</div>
                <div className="text-sm font-mono font-bold text-emerald-400 mt-1">
                  {formatCurrency(p.total)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{p.count} transactions</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
