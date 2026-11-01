"""
SmartSpend - Database Operations & Business Logic
Comprehensive, parameterized database access layer supporting transactions,
budgets, savings goals, recurring auto-generation, analytics, and authentication.
"""

import sqlite3
import os
import sys
import json
from datetime import datetime, timedelta
import calendar

# Locate database
BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
DB_DIR = os.path.abspath(os.path.dirname(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
if DB_DIR not in sys.path:
    sys.path.insert(0, DB_DIR)

from db_setup import hash_password, verify_password, get_db

# -------------------- AUTHENTICATION --------------------

def authenticate_user(email: str, password: str):
    """Validate credentials and return user dict if valid."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
    user = cursor.fetchone()
    conn.close()

    if user and verify_password(user["password_hash"], password):
        return {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "currency": user["currency"] or "INR"
        }
    return None

def register_user(name: str, email: str, password: str, currency: str = "INR"):
    """Register a new user, hash password, and set up default categories."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
    if cursor.fetchone():
        conn.close()
        raise ValueError("An account with this email address already exists.")

    pwd_hash = hash_password(password)
    cursor.execute("""
        INSERT INTO users (name, email, password_hash, currency)
        VALUES (?, ?, ?, ?)
    """, (name.strip(), email.strip().lower(), pwd_hash, currency))
    user_id = cursor.lastrowid

    # Populate default categories for the new user
    default_expense_cats = [
        ("Food & Dining", "utensils", "#f59e0b"),
        ("Transportation", "car", "#0284c7"),
        ("Shopping", "shopping-bag", "#ec4899"),
        ("Bills & Utilities", "zap", "#10b981"),
        ("Education", "book-open", "#8b5cf6"),
        ("Health", "heart-pulse", "#f43f5e"),
        ("Entertainment", "film", "#a855f7"),
        ("Rent", "home", "#6366f1"),
        ("Travel", "plane", "#f97316"),
        ("Subscriptions", "rss", "#06b6d4"),
        ("Personal Care", "smile", "#14b8a6"),
        ("Other", "more-horizontal", "#64748b")
    ]
    for c_name, icon, color in default_expense_cats:
        cursor.execute("""
            INSERT INTO categories (user_id, name, type, icon, color)
            VALUES (?, ?, 'expense', ?, ?)
        """, (user_id, c_name, icon, color))

    default_income_cats = [
        ("Salary", "briefcase", "#10b981"),
        ("Freelance", "laptop", "#0d9488"),
        ("Business", "building", "#2563eb"),
        ("Investments", "trending-up", "#8b5cf6"),
        ("Gifts", "gift", "#d97706"),
        ("Rental Income", "key", "#4f46e5"),
        ("Other Income", "plus-circle", "#64748b")
    ]
    for c_name, icon, color in default_income_cats:
        cursor.execute("""
            INSERT INTO categories (user_id, name, type, icon, color)
            VALUES (?, ?, 'income', ?, ?)
        """, (user_id, c_name, icon, color))

    conn.commit()
    conn.close()

    return {
        "id": user_id,
        "name": name.strip(),
        "email": email.strip().lower(),
        "currency": currency
    }

def get_user_by_id(user_id: int):
    """Retrieve user details by ID."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, currency, created_at FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_user_profile(user_id: int, name: str, email: str, current_password: str = None, new_password: str = None):
    """Update user profile name, email, and optionally password."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise ValueError("User not found.")

    # Check email conflict
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?", (email.strip(), user_id))
    if cursor.fetchone():
        conn.close()
        raise ValueError("This email is already in use by another account.")

    if new_password:
        if not current_password or not verify_password(user["password_hash"], current_password):
            conn.close()
            raise ValueError("Current password verification failed.")
        pwd_hash = hash_password(new_password)
        cursor.execute("UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?",
                       (name.strip(), email.strip().lower(), pwd_hash, user_id))
    else:
        cursor.execute("UPDATE users SET name = ?, email = ? WHERE id = ?",
                       (name.strip(), email.strip().lower(), user_id))

    conn.commit()
    conn.close()
    return {"id": user_id, "name": name.strip(), "email": email.strip().lower()}

# -------------------- DASHBOARD & SUMMARY --------------------

def get_dashboard_summary(user_id: int):
    """
    Computes all live financial metrics for the logged-in user:
    - total_income, total_expenses, current_balance
    - monthly_savings, monthly_budget_usage
    - weekly_spending_trend (last 7 days)
    - savings_rate percentage
    - highest_spending_category
    - category doughnut breakdown
    - monthly income vs expense history
    - recent transactions
    """
    conn = get_db()
    cursor = conn.cursor()

    today = datetime.now()
    current_month_str = today.strftime("%Y-%m")

    # 1. Total All-Time Income & Expense
    cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'income'", (user_id,))
    total_income = round(float(cursor.fetchone()["total"]), 2)

    cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense'", (user_id,))
    total_expenses = round(float(cursor.fetchone()["total"]), 2)

    current_balance = round(total_income - total_expenses, 2)

    # 2. Current Month Income & Expense
    cursor.execute("""
        SELECT COALESCE(SUM(amount), 0) as total FROM transactions
        WHERE user_id = ? AND type = 'income' AND SUBSTR(date, 1, 7) = ?
    """, (user_id, current_month_str))
    month_income = round(float(cursor.fetchone()["total"]), 2)

    cursor.execute("""
        SELECT COALESCE(SUM(amount), 0) as total FROM transactions
        WHERE user_id = ? AND type = 'expense' AND SUBSTR(date, 1, 7) = ?
    """, (user_id, current_month_str))
    month_expense = round(float(cursor.fetchone()["total"]), 2)

    monthly_savings = round(month_income - month_expense, 2)
    savings_rate = round((monthly_savings / month_income * 100), 1) if month_income > 0 else 0.0

    # 3. Monthly Overall Budget Usage
    cursor.execute("""
        SELECT amount FROM budgets
        WHERE user_id = ? AND month = ? AND category = 'Overall'
    """, (user_id, current_month_str))
    budget_row = cursor.fetchone()
    overall_budget = float(budget_row["amount"]) if budget_row else 0.0

    budget_percent = round((month_expense / overall_budget * 100), 1) if overall_budget > 0 else 0.0
    budget_remaining = round(max(overall_budget - month_expense, 0.0), 2) if overall_budget > 0 else 0.0
    budget_status = "normal"
    if overall_budget > 0:
        if month_expense > overall_budget:
            budget_status = "exceeded"
        elif month_expense >= overall_budget * 0.8:
            budget_status = "warning"

    # 4. Weekly Spending Trend (Last 7 days, daily)
    weekly_trend = []
    for i in range(6, -1, -1):
        day_date = today - timedelta(days=i)
        day_str = day_date.strftime("%Y-%m-%d")
        day_label = day_date.strftime("%a (%d %b)")
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) as total
            FROM transactions
            WHERE user_id = ? AND type = 'expense' AND date = ?
        """, (user_id, day_str))
        amt = round(float(cursor.fetchone()["total"]), 2)
        weekly_trend.append({
            "date": day_str,
            "label": day_label,
            "amount": amt
        })

    # 5. Category-wise Spending (All-time or current month)
    cursor.execute("""
        SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM transactions
        WHERE user_id = ? AND type = 'expense'
        GROUP BY category
        ORDER BY total DESC
    """, (user_id,))
    expense_breakdown = []
    highest_spending_category = {"category": "None", "amount": 0.0}
    for row in cursor.fetchall():
        cat_total = round(float(row["total"]), 2)
        pct = round((cat_total / total_expenses * 100), 1) if total_expenses > 0 else 0.0
        expense_breakdown.append({
            "category": row["category"],
            "total": cat_total,
            "count": int(row["count"]),
            "percentage": pct
        })

    if expense_breakdown:
        highest_spending_category = {
            "category": expense_breakdown[0]["category"],
            "amount": expense_breakdown[0]["total"]
        }

    # 6. Income Category Breakdown
    cursor.execute("""
        SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM transactions
        WHERE user_id = ? AND type = 'income'
        GROUP BY category
        ORDER BY total DESC
    """, (user_id,))
    income_breakdown = []
    for row in cursor.fetchall():
        cat_total = round(float(row["total"]), 2)
        pct = round((cat_total / total_income * 100), 1) if total_income > 0 else 0.0
        income_breakdown.append({
            "category": row["category"],
            "total": cat_total,
            "count": int(row["count"]),
            "percentage": pct
        })

    # 7. Monthly Income vs Expense (Last 6 distinct months)
    cursor.execute("""
        SELECT
            SUBSTR(date, 1, 7) as month,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM transactions
        WHERE user_id = ?
        GROUP BY SUBSTR(date, 1, 7)
        ORDER BY month ASC
        LIMIT 6
    """, (user_id,))
    monthly_trends = []
    for row in cursor.fetchall():
        inc = round(float(row["income"] or 0), 2)
        exp = round(float(row["expense"] or 0), 2)
        monthly_trends.append({
            "month": row["month"],
            "income": inc,
            "expense": exp,
            "net": round(inc - exp, 2)
        })

    # 8. Recent 6 Transactions
    cursor.execute("""
        SELECT * FROM transactions
        WHERE user_id = ?
        ORDER BY date DESC, id DESC
        LIMIT 6
    """, (user_id,))
    recent_transactions = [dict(r) for r in cursor.fetchall()]

    # 9. Total transaction count
    cursor.execute("SELECT COUNT(*) as count FROM transactions WHERE user_id = ?", (user_id,))
    total_transactions_count = cursor.fetchone()["count"]

    conn.close()

    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "current_balance": current_balance,
        "monthly_savings": monthly_savings,
        "month_income": month_income,
        "month_expense": month_expense,
        "savings_rate": savings_rate,
        "total_transactions": total_transactions_count,
        "monthly_budget": {
            "overall_budget": overall_budget,
            "spent": month_expense,
            "percentage": budget_percent,
            "remaining": budget_remaining,
            "status": budget_status
        },
        "weekly_trend": weekly_trend,
        "highest_spending_category": highest_spending_category,
        "expense_breakdown": expense_breakdown,
        "income_breakdown": income_breakdown,
        "monthly_trends": monthly_trends,
        "recent_transactions": recent_transactions
    }

# -------------------- TRANSACTIONS CRUD --------------------

def get_transactions(user_id: int, search="", trans_type="", category="", payment_method="",
                     start_date="", end_date="", sort_by="date", sort_order="desc", limit=50, offset=0):
    """Retrieve filtered, paginated transactions for a user."""
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM transactions WHERE user_id = ?"
    params = [user_id]

    if search and search.strip():
        query += " AND (title LIKE ? OR notes LIKE ?)"
        t = f"%{search.strip()}%"
        params.extend([t, t])

    if trans_type and trans_type.lower() in ("income", "expense"):
        query += " AND type = ?"
        params.append(trans_type.lower())

    if category and category.strip() and category != "All":
        query += " AND category = ?"
        params.append(category.strip())

    if payment_method and payment_method.strip() and payment_method != "All":
        query += " AND payment_method = ?"
        params.append(payment_method.strip())

    if start_date:
        query += " AND date >= ?"
        params.append(start_date)

    if end_date:
        query += " AND date <= ?"
        params.append(end_date)

    # Count total matching rows
    count_query = query.replace("SELECT *", "SELECT COUNT(*) as count")
    cursor.execute(count_query, params)
    total_count = cursor.fetchone()["count"]

    # Sorting
    allowed_cols = {
        "date": "date",
        "amount": "amount",
        "title": "title",
        "category": "category",
        "type": "type",
        "payment_method": "payment_method",
        "id": "id"
    }
    col = allowed_cols.get(sort_by, "date")
    order = "DESC" if str(sort_order).lower() == "desc" else "ASC"
    query += f" ORDER BY {col} {order}, id {order}"

    if limit and limit > 0:
        query += " LIMIT ? OFFSET ?"
        params.extend([int(limit), int(offset)])

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return {"records": rows, "total": total_count}

def get_transaction_by_id(user_id: int, tx_id: int):
    """Fetch single transaction ensuring user ownership."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user_id))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def add_transaction(user_id: int, title: str, amount: float, trans_type: str,
                    category: str, date: str, payment_method: str = "UPI", notes: str = ""):
    """Add a new transaction using parameterized SQL."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO transactions (user_id, title, amount, type, category, date, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, title.strip(), float(amount), trans_type.lower(),
          category.strip(), date.strip(), (payment_method or "UPI").strip(), (notes or "").strip()))

    new_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT * FROM transactions WHERE id = ?", (new_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

def update_transaction(user_id: int, tx_id: int, title: str, amount: float,
                       trans_type: str, category: str, date: str, payment_method: str = "UPI", notes: str = ""):
    """Update existing transaction for a user."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE transactions
        SET title = ?, amount = ?, type = ?, category = ?, date = ?, payment_method = ?, notes = ?
        WHERE id = ? AND user_id = ?
    """, (title.strip(), float(amount), trans_type.lower(), category.strip(),
          date.strip(), (payment_method or "UPI").strip(), (notes or "").strip(), int(tx_id), user_id))

    conn.commit()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_transaction(user_id: int, tx_id: int):
    """Delete a transaction ensuring user ownership."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", (int(tx_id), user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

# -------------------- CATEGORIES --------------------

def get_categories(user_id: int):
    """Fetch categories for the user (both system and user-defined)."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM categories
        WHERE user_id = ? OR user_id IS NULL
        ORDER BY name ASC
    """, (user_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    result = {"expense": [], "income": []}
    for r in rows:
        if r["type"] == "expense":
            result["expense"].append(r)
        else:
            result["income"].append(r)
    return result

def add_category(user_id: int, name: str, cat_type: str, icon: str = "tag", color: str = "#6366f1"):
    """Create a new custom category for the user."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO categories (user_id, name, type, icon, color)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, name.strip(), cat_type.lower(), icon.strip(), color.strip()))
    new_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT * FROM categories WHERE id = ?", (new_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

def delete_category(user_id: int, cat_id: int):
    """Delete a custom category."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM categories WHERE id = ? AND user_id = ?", (int(cat_id), user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

# -------------------- BUDGET MANAGEMENT --------------------

def get_budgets(user_id: int, month: str = None):
    """
    Retrieve budgets for a given month (YYYY-MM).
    Calculates actual spent amount, percentage used, remaining budget, and status (normal, warning, exceeded).
    """
    if not month:
        month = datetime.now().strftime("%Y-%m")

    conn = get_db()
    cursor = conn.cursor()

    # Get configured budgets for the month
    cursor.execute("""
        SELECT * FROM budgets
        WHERE user_id = ? AND month = ?
        ORDER BY category ASC
    """, (user_id, month))
    budget_rows = cursor.fetchall()

    # Calculate actual spending per category in that month
    cursor.execute("""
        SELECT category, COALESCE(SUM(amount), 0) as spent
        FROM transactions
        WHERE user_id = ? AND type = 'expense' AND SUBSTR(date, 1, 7) = ?
        GROUP BY category
    """, (user_id, month))
    spent_map = {r["category"]: float(r["spent"]) for r in cursor.fetchall()}

    # Calculate total monthly expense for overall budget
    cursor.execute("""
        SELECT COALESCE(SUM(amount), 0) as total_spent
        FROM transactions
        WHERE user_id = ? AND type = 'expense' AND SUBSTR(date, 1, 7) = ?
    """, (user_id, month))
    total_spent_in_month = float(cursor.fetchone()["total_spent"])

    results = []
    overall_budget_found = False

    for b in budget_rows:
        cat = b["category"]
        budget_amt = float(b["amount"])

        if cat == "Overall":
            overall_budget_found = True
            spent_amt = total_spent_in_month
        else:
            spent_amt = spent_map.get(cat, 0.0)

        percent = round((spent_amt / budget_amt * 100), 1) if budget_amt > 0 else 0.0
        remaining = round(max(budget_amt - spent_amt, 0.0), 2)

        status = "normal"
        if percent > 100:
            status = "exceeded"
        elif percent >= 80:
            status = "warning"

        results.append({
            "id": b["id"],
            "month": b["month"],
            "category": cat,
            "budget_amount": budget_amt,
            "spent_amount": spent_amt,
            "percentage": percent,
            "remaining": remaining,
            "status": status,
            "is_overall": (cat == "Overall")
        })

    conn.close()
    return {"month": month, "budgets": results, "total_spent": total_spent_in_month}

def set_budget(user_id: int, month: str, category: str, amount: float):
    """Create or update a budget for user, month, and category."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO budgets (user_id, month, category, amount)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, month, category) DO UPDATE SET amount = excluded.amount
    """, (user_id, month.strip(), category.strip(), float(amount)))

    conn.commit()
    conn.close()
    return True

def delete_budget(user_id: int, budget_id: int):
    """Delete a budget item."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM budgets WHERE id = ? AND user_id = ?", (int(budget_id), user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

# -------------------- SAVINGS GOALS & CONTRIBUTIONS --------------------

def get_savings_goals(user_id: int):
    """Retrieve all savings goals with actual contribution tracking and progress."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM savings_goals
        WHERE user_id = ?
        ORDER BY target_date ASC
    """, (user_id,))
    goals = cursor.fetchall()

    today = datetime.now().date()
    result = []

    for g in goals:
        g_id = g["id"]
        target = float(g["target_amount"])
        current = float(g["current_amount"])
        progress = round((current / target * 100), 1) if target > 0 else 0.0
        remaining = round(max(target - current, 0.0), 2)

        # Days remaining
        target_date_obj = datetime.strptime(g["target_date"], "%Y-%m-%d").date()
        days_left = (target_date_obj - today).days

        # Get contributions history
        cursor.execute("""
            SELECT * FROM savings_contributions
            WHERE goal_id = ? AND user_id = ?
            ORDER BY date DESC, id DESC
        """, (g_id, user_id))
        contributions = [dict(c) for c in cursor.fetchall()]

        result.append({
            "id": g["id"],
            "title": g["title"],
            "target_amount": target,
            "current_amount": current,
            "target_date": g["target_date"],
            "category": g["category"],
            "notes": g["notes"],
            "progress_percentage": min(progress, 100.0),
            "remaining_amount": remaining,
            "days_left": days_left,
            "is_completed": current >= target,
            "contributions": contributions
        })

    conn.close()
    return result

def add_savings_goal(user_id: int, title: str, target_amount: float, target_date: str,
                     category: str = "General", notes: str = "", initial_amount: float = 0.0):
    """Create a new savings goal."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO savings_goals (user_id, title, target_amount, current_amount, target_date, category, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (user_id, title.strip(), float(target_amount), float(initial_amount),
          target_date.strip(), category.strip(), (notes or "").strip()))
    goal_id = cursor.lastrowid

    if initial_amount > 0:
        cursor.execute("""
            INSERT INTO savings_contributions (goal_id, user_id, amount, date, notes)
            VALUES (?, ?, ?, ?, ?)
        """, (goal_id, user_id, float(initial_amount), datetime.now().strftime("%Y-%m-%d"), "Initial starting balance"))

    conn.commit()
    conn.close()
    return goal_id

def add_savings_contribution(user_id: int, goal_id: int, amount: float, date: str, notes: str = ""):
    """Record a contribution towards a goal and increment goal current_amount."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM savings_goals WHERE id = ? AND user_id = ?", (goal_id, user_id))
    goal = cursor.fetchone()
    if not goal:
        conn.close()
        raise ValueError("Savings goal not found.")

    num_amount = float(amount)
    if num_amount <= 0:
        conn.close()
        raise ValueError("Contribution amount must be greater than zero.")

    cursor.execute("""
        INSERT INTO savings_contributions (goal_id, user_id, amount, date, notes)
        VALUES (?, ?, ?, ?, ?)
    """, (goal_id, user_id, num_amount, date.strip(), (notes or "").strip()))

    new_current = float(goal["current_amount"]) + num_amount
    cursor.execute("UPDATE savings_goals SET current_amount = ? WHERE id = ?", (new_current, goal_id))

    conn.commit()
    conn.close()
    return {"goal_id": goal_id, "new_current_amount": new_current}

def delete_savings_goal(user_id: int, goal_id: int):
    """Delete a savings goal and its associated contributions."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM savings_goals WHERE id = ? AND user_id = ?", (int(goal_id), user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

# -------------------- RECURRING TRANSACTIONS --------------------

def get_recurring_transactions(user_id: int):
    """Retrieve all recurring transactions for a user."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM recurring_transactions
        WHERE user_id = ?
        ORDER BY next_due_date ASC
    """, (user_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def add_recurring_transaction(user_id: int, title: str, amount: float, trans_type: str,
                              category: str, frequency: str, payment_method: str, next_due_date: str, notes: str = ""):
    """Create a recurring rule."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO recurring_transactions (user_id, title, amount, type, category, frequency, payment_method, next_due_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, title.strip(), float(amount), trans_type.lower(), category.strip(),
          frequency.lower(), (payment_method or "UPI").strip(), next_due_date.strip(), (notes or "").strip()))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id

def process_due_recurring_transactions(user_id: int):
    """
    Checks recurring transactions where next_due_date <= today and is_active = 1.
    Generates actual transaction, updates last_processed_date, and advances next_due_date.
    Prevents duplicate generation by checking last_processed_date.
    """
    conn = get_db()
    cursor = conn.cursor()

    today_str = datetime.now().strftime("%Y-%m-%d")

    cursor.execute("""
        SELECT * FROM recurring_transactions
        WHERE user_id = ? AND is_active = 1 AND next_due_date <= ?
    """, (user_id, today_str))
    due_items = cursor.fetchall()

    processed_count = 0

    for item in due_items:
        # Prevent same-day duplicate execution
        if item["last_processed_date"] == today_str:
            continue

        # Insert as actual transaction
        cursor.execute("""
            INSERT INTO transactions (user_id, title, amount, type, category, date, payment_method, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, f"[Auto] {item['title']}", item["amount"], item["type"], item["category"],
              today_str, item["payment_method"], f"Recurring auto-processed ({item['frequency']}): {item['notes']}"))

        # Calculate next due date
        current_due = datetime.strptime(item["next_due_date"], "%Y-%m-%d")
        freq = item["frequency"]
        if freq == "daily":
            next_due = current_due + timedelta(days=1)
        elif freq == "weekly":
            next_due = current_due + timedelta(days=7)
        elif freq == "yearly":
            next_due = current_due.replace(year=current_due.year + 1)
        else: # monthly
            # Add one month handling days in month
            month = current_due.month + 1
            year = current_due.year
            if month > 12:
                month = 1
                year += 1
            max_days = calendar.monthrange(year, month)[1]
            day = min(current_due.day, max_days)
            next_due = current_due.replace(year=year, month=month, day=day)

        cursor.execute("""
            UPDATE recurring_transactions
            SET last_processed_date = ?, next_due_date = ?
            WHERE id = ?
        """, (today_str, next_due.strftime("%Y-%m-%d"), item["id"]))
        processed_count += 1

    conn.commit()
    conn.close()
    return processed_count

def delete_recurring_transaction(user_id: int, rec_id: int):
    """Delete a recurring transaction."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM recurring_transactions WHERE id = ? AND user_id = ?", (int(rec_id), user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

# -------------------- REPORTS & ANALYTICS --------------------

def get_analytics_report(user_id: int, start_date: str = None, end_date: str = None):
    """Comprehensive analytics including daily average, category breakdown, highest/lowest months."""
    conn = get_db()
    cursor = conn.cursor()

    today = datetime.now()
    if not start_date:
        start_date = (today - timedelta(days=90)).strftime("%Y-%m-%d")
    if not end_date:
        end_date = today.strftime("%Y-%m-%d")

    cursor.execute("""
        SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
            COUNT(*) as total_count
        FROM transactions
        WHERE user_id = ? AND date >= ? AND date <= ?
    """, (user_id, start_date, end_date))
    overview = cursor.fetchone()

    total_inc = float(overview["total_income"])
    total_exp = float(overview["total_expense"])
    net = round(total_inc - total_exp, 2)

    # Calculate days in range for daily average spending
    d_start = datetime.strptime(start_date, "%Y-%m-%d")
    d_end = datetime.strptime(end_date, "%Y-%m-%d")
    days_count = max((d_end - d_start).days + 1, 1)
    daily_average_spending = round(total_exp / days_count, 2)

    # Monthly breakdown across all time for highest/lowest spending months
    cursor.execute("""
        SELECT SUBSTR(date, 1, 7) as month, SUM(amount) as total
        FROM transactions
        WHERE user_id = ? AND type = 'expense'
        GROUP BY SUBSTR(date, 1, 7)
        ORDER BY total DESC
    """, (user_id,))
    month_expenses = cursor.fetchall()

    highest_month = {"month": month_expenses[0]["month"], "amount": float(month_expenses[0]["total"])} if month_expenses else {"month": "N/A", "amount": 0}
    lowest_month = {"month": month_expenses[-1]["month"], "amount": float(month_expenses[-1]["total"])} if month_expenses else {"month": "N/A", "amount": 0}

    # Category breakdown for period
    cursor.execute("""
        SELECT category, SUM(amount) as total, COUNT(*) as count
        FROM transactions
        WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
        GROUP BY category
        ORDER BY total DESC
    """, (user_id, start_date, end_date))
    categories_breakdown = []
    for r in cursor.fetchall():
        amt = float(r["total"])
        pct = round((amt / total_exp * 100), 1) if total_exp > 0 else 0.0
        categories_breakdown.append({
            "category": r["category"],
            "total": amt,
            "count": r["count"],
            "percentage": pct
        })

    # Payment methods breakdown
    cursor.execute("""
        SELECT payment_method, SUM(amount) as total, COUNT(*) as count
        FROM transactions
        WHERE user_id = ? AND date >= ? AND date <= ?
        GROUP BY payment_method
        ORDER BY total DESC
    """, (user_id, start_date, end_date))
    payment_methods = [{"method": r["payment_method"] or "Other", "total": float(r["total"]), "count": r["count"]} for r in cursor.fetchall()]

    conn.close()

    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_income": total_inc,
        "total_expense": total_exp,
        "net_savings": net,
        "savings_rate": round((net / total_inc * 100), 1) if total_inc > 0 else 0.0,
        "daily_average_spending": daily_average_spending,
        "highest_spending_month": highest_month,
        "lowest_spending_month": lowest_month,
        "category_breakdown": categories_breakdown,
        "payment_methods": payment_methods
    }

# -------------------- CLI BRIDGE FOR NODE / EXTERNAL CALLS --------------------

if __name__ == "__main__":
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        try:
            if cmd == "auth":
                args = json.loads(sys.argv[2])
                res = authenticate_user(args.get("email", ""), args.get("password", ""))
                print(json.dumps({"status": "success", "data": res}))
            elif cmd == "register":
                args = json.loads(sys.argv[2])
                res = register_user(args["name"], args["email"], args["password"], args.get("currency", "INR"))
                print(json.dumps({"status": "success", "data": res}))
            elif cmd == "get_user":
                u_id = int(sys.argv[2])
                res = get_user_by_id(u_id)
                print(json.dumps({"status": "success", "data": res}))
            elif cmd == "dashboard":
                u_id = int(sys.argv[2])
                res = get_dashboard_summary(u_id)
                print(json.dumps({"status": "success", "data": res}))
            elif cmd == "get_transactions":
                u_id = int(sys.argv[2])
                args = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
                res = get_transactions(
                    user_id=u_id,
                    search=args.get("search", ""),
                    trans_type=args.get("type", ""),
                    category=args.get("category", ""),
                    payment_method=args.get("payment_method", ""),
                    start_date=args.get("start_date", ""),
                    end_date=args.get("end_date", ""),
                    sort_by=args.get("sort_by", "date"),
                    sort_order=args.get("sort_order", "desc"),
                    limit=args.get("limit", 50),
                    offset=args.get("offset", 0)
                )
                print(json.dumps({"status": "success", "data": res}))
            elif cmd == "add_transaction":
                u_id = int(sys.argv[2])
                args = json.loads(sys.argv[3])
                res = add_transaction(
                    user_id=u_id,
                    title=args["title"],
                    amount=args["amount"],
                    trans_type=args["type"],
                    category=args["category"],
                    date=args["date"],
                    payment_method=args.get("payment_method", "UPI"),
                    notes=args.get("notes", "")
                )
                print(json.dumps({"status": "success", "data": res}))
            elif cmd == "update_transaction":
                u_id = int(sys.argv[2])
                tx_id = int(sys.argv[3])
                args = json.loads(sys.argv[4])
                res = update_transaction(
                    user_id=u_id,
                    tx_id=tx_id,
                    title=args["title"],
                    amount=args["amount"],
                    trans_type=args["type"],
                    category=args["category"],
                    date=args["date"],
                    payment_method=args.get("payment_method", "UPI"),
                    notes=args.get("notes", "")
                )
                print(json.dumps({"status": "success", "data": res}))
            elif cmd == "delete_transaction":
                u_id = int(sys.argv[2])
                tx_id = int(sys.argv[3])
                res = delete_transaction(u_id, tx_id)
                print(json.dumps({"status": "success", "deleted": res}))
            elif cmd == "get_categories":
                u_id = int(sys.argv[2])
                res = get_categories(u_id)
                print(json.dumps({"status": "success", "data": res}))
            elif cmd == "add_category":
                u_id = int(sys.argv[2])
                args = json.loads(sys.argv[3])
                res = add_category(u_id, args["name"], args["type"], args.get("icon", "tag"), args.get("color", "#6366f1"))
                print(json.dumps({"status": "success", "data": res}))
            elif cmd == "get_budgets":
                u_id = int(sys.argv[2])
                month = sys.argv[3] if len(sys.argv) > 3 else None
                res = get_budgets(u_id, month)
                print(json.dumps({"status": "success", "data": res}))
            elif cmd == "set_budget":
                u_id = int(sys.argv[2])
                args = json.loads(sys.argv[3])
                res = set_budget(u_id, args["month"], args["category"], args["amount"])
                print(json.dumps({"status": "success", "data": res}))
            elif cmd == "delete_budget":
                u_id = int(sys.argv[2])
                b_id = int(sys.argv[3])
                res = delete_budget(u_id, b_id)
                print(json.dumps({"status": "success", "deleted": res}))
            elif cmd == "get_savings_goals":
                u_id = int(sys.argv[2])
                res = get_savings_goals(u_id)
                print(json.dumps({"status": "success", "data": res}))
            elif cmd == "add_savings_goal":
                u_id = int(sys.argv[2])
                args = json.loads(sys.argv[3])
                res = add_savings_goal(u_id, args["title"], args["target_amount"], args["target_date"], args.get("category", "General"), args.get("notes", ""), args.get("initial_amount", 0))
                print(json.dumps({"status": "success", "goal_id": res}))
            elif cmd == "add_savings_contribution":
                u_id = int(sys.argv[2])
                args = json.loads(sys.argv[3])
                res = add_savings_contribution(u_id, args["goal_id"], args["amount"], args["date"], args.get("notes", ""))
                print(json.dumps({"status": "success", "data": res}))
            elif cmd == "delete_savings_goal":
                u_id = int(sys.argv[2])
                g_id = int(sys.argv[3])
                res = delete_savings_goal(u_id, g_id)
                print(json.dumps({"status": "success", "deleted": res}))
            elif cmd == "get_recurring":
                u_id = int(sys.argv[2])
                res = get_recurring_transactions(u_id)
                print(json.dumps({"status": "success", "data": res}))
            elif cmd == "add_recurring":
                u_id = int(sys.argv[2])
                args = json.loads(sys.argv[3])
                res = add_recurring_transaction(u_id, args["title"], args["amount"], args["type"], args["category"], args["frequency"], args.get("payment_method", "UPI"), args["next_due_date"], args.get("notes", ""))
                print(json.dumps({"status": "success", "recurring_id": res}))
            elif cmd == "process_recurring":
                u_id = int(sys.argv[2])
                count = process_due_recurring_transactions(u_id)
                print(json.dumps({"status": "success", "processed_count": count}))
            elif cmd == "delete_recurring":
                u_id = int(sys.argv[2])
                r_id = int(sys.argv[3])
                res = delete_recurring_transaction(u_id, r_id)
                print(json.dumps({"status": "success", "deleted": res}))
            elif cmd == "analytics":
                u_id = int(sys.argv[2])
                start = sys.argv[3] if len(sys.argv) > 3 else None
                end = sys.argv[4] if len(sys.argv) > 4 else None
                res = get_analytics_report(u_id, start, end)
                print(json.dumps({"status": "success", "data": res}))
            elif cmd == "update_profile":
                u_id = int(sys.argv[2])
                args = json.loads(sys.argv[3])
                res = update_user_profile(u_id, args["name"], args["email"], args.get("current_password"), args.get("new_password"))
                print(json.dumps({"status": "success", "data": res}))
            else:
                print(json.dumps({"status": "error", "message": f"Unknown command: {cmd}"}))
        except Exception as e:
            print(json.dumps({"status": "error", "message": str(e)}))
