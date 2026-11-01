import React, { useState, useEffect } from 'react';
import { X, Calendar, Tag, FileText, Check, AlertCircle, CreditCard, IndianRupee } from 'lucide-react';
import { Transaction, CategoryOptions } from '../types.ts';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    amount: number;
    category: string;
    date: string;
    type: 'income' | 'expense';
    payment_method: string;
    notes?: string;
  }) => Promise<boolean>;
  initialData?: Transaction | null;
  categoryOptions: CategoryOptions;
  defaultType?: 'income' | 'expense';
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  categoryOptions,
  defaultType = 'expense',
}) => {
  const isEditing = Boolean(initialData);

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [type, setType] = useState<'income' | 'expense'>(defaultType);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [date, setDate] = useState(getTodayString());
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setTitle(initialData.title);
      setAmount(initialData.amount.toString());
      setCategory(initialData.category);
      setPaymentMethod(initialData.payment_method || 'UPI');
      setDate(initialData.date);
      setNotes(initialData.notes || '');
    } else {
      setType(defaultType);
      setTitle('');
      setAmount('');
      setDate(getTodayString());
      setPaymentMethod('UPI');
      setNotes('');
      const list = defaultType === 'expense' ? categoryOptions.expense : categoryOptions.income;
      setCategory(list[0]?.name || (defaultType === 'expense' ? 'Food & Dining' : 'Salary'));
    }
    setErrors({});
  }, [initialData, isOpen, defaultType, categoryOptions]);

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    const list = newType === 'expense' ? categoryOptions.expense : categoryOptions.income;
    setCategory(list[0]?.name || '');
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length > 100) {
      newErrors.title = 'Title cannot exceed 100 characters';
    }

    const numAmount = parseFloat(amount);
    if (!amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Enter a valid positive amount greater than ₹0.00';
    }

    if (!category) {
      newErrors.category = 'Category is required';
    }

    if (!date.trim()) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const success = await onSave({
        title: title.trim(),
        amount: Math.round(parseFloat(amount) * 100) / 100,
        category,
        date: date.trim(),
        type,
        payment_method: paymentMethod,
        notes: notes.trim(),
      });
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentCategories = type === 'expense' ? categoryOptions.expense : categoryOptions.income;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div
        className="relative w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">
              {isEditing ? `Edit Transaction #${initialData?.id}` : `Record ${type === 'income' ? 'Income' : 'Expense'}`}
            </h3>
            <p className="text-xs text-slate-400">
              Directly persisted to SQLite database with parameterized security
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Segmented Type Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Transaction Type *
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/80 rounded-xl">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  type === 'expense' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Expense</span>
                {type === 'expense' && <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  type === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Income</span>
                {type === 'income' && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Title / Description *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder={type === 'expense' ? 'e.g. Supermarket Groceries, BESCOM Utility' : 'e.g. Monthly Tech Salary, Consulting'}
              maxLength={100}
              className={`w-full px-3.5 py-2 rounded-xl border text-sm text-white placeholder-slate-500 bg-slate-800 focus:outline-hidden focus:border-indigo-500 transition-all ${
                errors.title ? 'border-rose-500' : 'border-slate-700'
              }`}
            />
            {errors.title && (
              <p className="mt-1 flex items-center gap-1 text-xs text-rose-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Amount (₹) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => {
                    if (!e.target.value.includes('-')) {
                      setAmount(e.target.value);
                      if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                    }
                  }}
                  placeholder="0.00"
                  className={`w-full pl-9 pr-3.5 py-2 rounded-xl border text-sm font-mono font-bold text-white placeholder-slate-500 bg-slate-800 focus:outline-hidden focus:border-indigo-500 transition-all ${
                    errors.amount ? 'border-rose-500' : 'border-slate-700'
                  }`}
                />
              </div>
              {errors.amount && (
                <p className="mt-1 flex items-center gap-1 text-xs text-rose-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.amount}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Date *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (errors.date) setErrors((prev) => ({ ...prev, date: '' }));
                  }}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm font-mono text-white focus:outline-hidden focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Category & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Category *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Tag className="w-4 h-4" />
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:outline-hidden focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  {currentCategories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Payment Method
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:outline-hidden focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Notes (Optional)
            </label>
            <div className="relative">
              <div className="absolute top-2.5 left-3 text-slate-400 pointer-events-none">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add invoice ID, merchant details, or tags..."
                rows={2}
                maxLength={500}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-all resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-xs font-bold text-white shadow-md hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving to Database...' : isEditing ? 'Update Record' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
