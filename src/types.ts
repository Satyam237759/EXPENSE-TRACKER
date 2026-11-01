export interface User {
  id: number;
  name: string;
  email: string;
  currency?: string;
  created_at?: string;
}

export interface Transaction {
  id: number;
  user_id?: number;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  payment_method?: string;
  notes?: string;
  created_at?: string;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface WeeklyTrendItem {
  date: string;
  label: string;
  amount: number;
}

export interface DashboardSummary {
  total_income: number;
  total_expenses: number;
  current_balance: number;
  monthly_savings: number;
  month_income: number;
  month_expense: number;
  savings_rate: number;
  total_transactions: number;
  monthly_budget: {
    overall_budget: number;
    spent: number;
    percentage: number;
    remaining: number;
    status: 'normal' | 'warning' | 'exceeded';
  };
  weekly_trend: WeeklyTrendItem[];
  highest_spending_category: {
    category: string;
    amount: number;
  };
  expense_breakdown: CategoryBreakdown[];
  income_breakdown: CategoryBreakdown[];
  monthly_trends: MonthlyTrend[];
  recent_transactions: Transaction[];
}

export interface BudgetItem {
  id: number;
  month: string;
  category: string;
  budget_amount: number;
  spent_amount: number;
  percentage: number;
  remaining: number;
  status: 'normal' | 'warning' | 'exceeded';
  is_overall: boolean;
}

export interface SavingsContribution {
  id: number;
  goal_id: number;
  user_id: number;
  amount: number;
  date: string;
  notes?: string;
  created_at?: string;
}

export interface SavingsGoal {
  id: number;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: string;
  notes?: string;
  progress_percentage: number;
  remaining_amount: number;
  days_left: number;
  is_completed: boolean;
  contributions: SavingsContribution[];
}

export interface RecurringTransaction {
  id: number;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  payment_method: string;
  next_due_date: string;
  last_processed_date?: string;
  is_active: number;
  notes?: string;
}

export interface CategoryItem {
  id: number;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
}

export interface CategoryOptions {
  expense: CategoryItem[];
  income: CategoryItem[];
}

export interface FilterState {
  search: string;
  type: string;
  category: string;
  payment_method: string;
  startDate: string;
  endDate: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
