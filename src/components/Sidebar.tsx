import React from 'react';
import {
  PieChart,
  Receipt,
  HandCoins,
  PiggyBank,
  Target,
  Repeat,
  BarChart3,
  UserCheck,
  Plus,
  Minus,
  Wallet,
  X,
  IndianRupee,
  LogOut,
} from 'lucide-react';
import { User } from '../types.ts';

export type NavTab =
  | 'dashboard'
  | 'transactions'
  | 'income'
  | 'budgets'
  | 'savings'
  | 'recurring'
  | 'analytics'
  | 'profile';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenAddModal: (type: 'expense' | 'income') => void;
  currentUser: User | null;
  totalTransactionsCount: number;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  currentUser,
  totalTransactionsCount,
  isMobileOpen,
  setIsMobileOpen,
  onLogout,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: PieChart },
    { id: 'transactions' as NavTab, label: 'Transactions', icon: Receipt, badge: totalTransactionsCount },
    { id: 'income' as NavTab, label: 'Income Hub', icon: HandCoins },
    { id: 'budgets' as NavTab, label: 'Budgets', icon: PiggyBank },
    { id: 'savings' as NavTab, label: 'Savings Goals', icon: Target },
    { id: 'recurring' as NavTab, label: 'Recurring Rules', icon: Repeat },
    { id: 'analytics' as NavTab, label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'profile' as NavTab, label: 'Account Profile', icon: UserCheck },
  ];

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex flex-col h-full">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 shadow-lg shadow-indigo-500/25 text-white">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-white leading-none">
                  SmartSpend
                </h1>
                <p className="text-[11px] font-semibold text-indigo-400 mt-1 flex items-center gap-1">
                  <span>Pro Expense Tracker</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenAddModal('expense');
                setIsMobileOpen(false);
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-600/90 text-white hover:bg-rose-600 text-xs font-bold transition-all shadow-sm"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Expense</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenAddModal('income');
                setIsMobileOpen(false);
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600/90 text-white hover:bg-emerald-600 text-xs font-bold transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Income</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-5 space-y-1 flex-1 overflow-y-auto pr-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Menu
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 font-bold border-l-2 border-indigo-500 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-indigo-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Currency Indicator & User Badge */}
          <div className="mt-auto pt-3 border-t border-slate-800 space-y-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1 font-medium">
                <IndianRupee className="w-3.5 h-3.5 text-indigo-400" />
                Currency
              </span>
              <span className="font-bold text-white font-mono">INR (₹)</span>
            </div>

            {currentUser && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-800/40">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {currentUser.email}
                    </div>
                  </div>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    title="Log Out"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    aria-label="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
