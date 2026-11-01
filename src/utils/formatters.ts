/**
 * SmartSpend - Formatter Utilities
 * Indian Rupee (₹) currency formatting, DD-MM-YYYY date formatting, and category colors.
 */

export function formatCurrency(amount: number): string {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Convert YYYY-MM-DD to DD-MM-YYYY
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

// Format friendly date like "28 Oct 2026"
export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  // Expense Categories
  'Rent': { bg: 'bg-indigo-500/15', text: 'text-indigo-400', hex: '#6366f1' },
  'Food & Dining': { bg: 'bg-amber-500/15', text: 'text-amber-400', hex: '#f59e0b' },
  'Transportation': { bg: 'bg-sky-500/15', text: 'text-sky-400', hex: '#0284c7' },
  'Bills & Utilities': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', hex: '#10b981' },
  'Shopping': { bg: 'bg-pink-500/15', text: 'text-pink-400', hex: '#ec4899' },
  'Health': { bg: 'bg-rose-500/15', text: 'text-rose-400', hex: '#f43f5e' },
  'Entertainment': { bg: 'bg-purple-500/15', text: 'text-purple-400', hex: '#a855f7' },
  'Education': { bg: 'bg-violet-500/15', text: 'text-violet-400', hex: '#8b5cf6' },
  'Travel': { bg: 'bg-orange-500/15', text: 'text-orange-400', hex: '#f97316' },
  'Subscriptions': { bg: 'bg-cyan-500/15', text: 'text-cyan-400', hex: '#06b6d4' },
  'Personal Care': { bg: 'bg-teal-500/15', text: 'text-teal-400', hex: '#14b8a6' },
  'Other': { bg: 'bg-slate-500/15', text: 'text-slate-400', hex: '#64748b' },

  // Income Categories
  'Salary': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', hex: '#10b981' },
  'Freelance': { bg: 'bg-teal-500/15', text: 'text-teal-400', hex: '#0d9488' },
  'Business': { bg: 'bg-blue-500/15', text: 'text-blue-400', hex: '#2563eb' },
  'Investments': { bg: 'bg-purple-500/15', text: 'text-purple-400', hex: '#8b5cf6' },
  'Gifts': { bg: 'bg-amber-500/15', text: 'text-amber-400', hex: '#d97706' },
  'Rental Income': { bg: 'bg-indigo-500/15', text: 'text-indigo-400', hex: '#4f46e5' },
  'Other Income': { bg: 'bg-slate-500/15', text: 'text-slate-400', hex: '#64748b' },
};

export function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category] || {
    bg: 'bg-slate-500/15',
    text: 'text-slate-300',
    hex: '#64748b',
  };
}
