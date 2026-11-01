"""
Expense Tracker Database Module
Handles SQLite connection, schema creation, and parameterized database operations.
"""

import sqlite3
import os
import sys
import json
from datetime import datetime

# Path to SQLite database file
DB_DIR = os.path.dirname(os.path.abspath(__file__))
# Store in parent directory so it's easily visible and shared with server.ts
DB_PATH = os.path.join(os.path.dirname(DB_DIR), "expenses.db")

def get_db_connection():
    """Create a database connection with Row factory for dict-like access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Enable WAL mode for better concurrency and foreign keys
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    """Initialize database schema and tables."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create transactions table with strict constraints
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        notes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # Create indexes for fast filtering and sorting
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);")
    
    conn.commit()
    
    # Check if empty; if so, populate initial realistic sample transactions for demo
    cursor.execute("SELECT COUNT(*) as count FROM transactions")
    count = cursor.fetchone()["count"]
    if count == 0:
        seed_initial_data(conn)
        
    conn.close()
    return True

def seed_initial_data(conn=None):
    """Seed helpful realistic transactions suitable for demonstration."""
    should_close = False
    if conn is None:
        conn = get_db_connection()
        should_close = True
        
    cursor = conn.cursor()
    
    today = datetime.now()
    year = today.year
    month = today.month
    
    # Helper to generate dates in current and previous month
    def make_date(days_ago):
        target = today.timestamp() - (days_ago * 86400)
        return datetime.fromtimestamp(target).strftime("%Y-%m-%d")
        
    sample_records = [
        ("Monthly Salary", 4500.00, "Salary", make_date(28), "income", "Primary job monthly payout"),
        ("Apartment Rent", 1250.00, "Housing", make_date(27), "expense", "Monthly apartment lease"),
        ("Grocery Market", 164.50, "Food & Dining", make_date(24), "expense", "Weekly vegetables, fruits and pantry"),
        ("Freelance Web Design", 850.00, "Freelance", make_date(20), "income", "Landing page redesign for client"),
        ("Electric & Water Utility", 112.30, "Utilities", make_date(18), "expense", "Power and municipal water bill"),
        ("Metro Monthly Pass", 75.00, "Transportation", make_date(15), "expense", "Public transit pass"),
        ("High-Speed Fiber Internet", 60.00, "Utilities", make_date(12), "expense", "Broadband monthly charge"),
        ("Health & Dental Checkup", 120.00, "Healthcare", make_date(10), "expense", "Routine dental hygiene session"),
        ("Tech Gadget Purchase", 249.99, "Electronics", make_date(8), "expense", "Noise-cancelling wireless headphones"),
        ("Supermarket Restock", 98.75, "Food & Dining", make_date(5), "expense", "Mid-week groceries & household supplies"),
        ("Consulting Stint", 400.00, "Investments", make_date(3), "income", "Technical advisory bonus"),
        ("Movie & Weekend Dinner", 68.40, "Entertainment", make_date(1), "expense", "Cinema tickets and dinner with friends")
    ]
    
    cursor.executemany("""
        INSERT INTO transactions (title, amount, category, date, type, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    """, sample_records)
    
    conn.commit()
    if should_close:
        conn.close()

def get_transactions(search="", trans_type="", category="", start_date="", end_date="", sort_by="date", sort_order="desc"):
    """
    Retrieve transactions with parameterized filters.
    Protects against SQL injection by using query parameters for all values.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM transactions WHERE 1=1"
    params = []
    
    if search and search.strip():
        query += " AND (title LIKE ? OR notes LIKE ?)"
        term = f"%{search.strip()}%"
        params.extend([term, term])
        
    if trans_type and trans_type.lower() in ("income", "expense"):
        query += " AND type = ?"
        params.append(trans_type.lower())
        
    if category and category.strip() and category != "All":
        query += " AND category = ?"
        params.append(category.strip())
        
    if start_date:
        query += " AND date >= ?"
        params.append(start_date)
        
    if end_date:
        query += " AND date <= ?"
        params.append(end_date)
        
    # Safe allowed sorting columns
    allowed_columns = {
        "date": "date",
        "amount": "amount",
        "title": "title",
        "category": "category",
        "type": "type",
        "id": "id"
    }
    sort_column = allowed_columns.get(sort_by, "date")
    order = "DESC" if str(sort_order).lower() == "desc" else "ASC"
    
    query += f" ORDER BY {sort_column} {order}, id {order}"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    result = [dict(row) for row in rows]
    conn.close()
    return result

def get_transaction_by_id(tx_id):
    """Fetch single transaction by primary key."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def add_transaction(title, amount, category, date, trans_type, notes=""):
    """Add a new transaction using parameterized SQL."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO transactions (title, amount, category, date, type, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (title.strip(), float(amount), category.strip(), date.strip(), trans_type.lower(), (notes or "").strip()))
    
    new_id = cursor.lastrowid
    conn.commit()
    
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (new_id,))
    new_record = dict(cursor.fetchone())
    conn.close()
    return new_record

def update_transaction(tx_id, title, amount, category, date, trans_type, notes=""):
    """Update existing transaction by id."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE transactions
        SET title = ?, amount = ?, category = ?, date = ?, type = ?, notes = ?
        WHERE id = ?
    """, (title.strip(), float(amount), category.strip(), date.strip(), trans_type.lower(), (notes or "").strip(), int(tx_id)))
    
    conn.commit()
    
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (int(tx_id),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_transaction(tx_id):
    """Delete a transaction by id."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE id = ?", (int(tx_id),))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def get_summary():
    """
    Compute dynamic aggregate metrics:
    - total_income
    - total_expenses
    - balance
    - total_transactions
    - category_breakdown (with percentages)
    - monthly_trends
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Total Income
    cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'")
    total_income = round(float(cursor.fetchone()["total"]), 2)
    
    # Total Expenses
    cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'")
    total_expenses = round(float(cursor.fetchone()["total"]), 2)
    
    # Current Balance
    current_balance = round(total_income - total_expenses, 2)
    
    # Total Transaction Count
    cursor.execute("SELECT COUNT(*) as count FROM transactions")
    total_transactions = int(cursor.fetchone()["count"])
    
    # Category Breakdown for Expenses
    cursor.execute("""
        SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM transactions
        WHERE type = 'expense'
        GROUP BY category
        ORDER BY total DESC
    """)
    expense_categories = []
    for row in cursor.fetchall():
        cat_total = round(float(row["total"]), 2)
        percentage = round((cat_total / total_expenses * 100), 1) if total_expenses > 0 else 0
        expense_categories.append({
            "category": row["category"],
            "total": cat_total,
            "count": int(row["count"]),
            "percentage": percentage
        })
        
    # Category Breakdown for Income
    cursor.execute("""
        SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM transactions
        WHERE type = 'income'
        GROUP BY category
        ORDER BY total DESC
    """)
    income_categories = []
    for row in cursor.fetchall():
        cat_total = round(float(row["total"]), 2)
        percentage = round((cat_total / total_income * 100), 1) if total_income > 0 else 0
        income_categories.append({
            "category": row["category"],
            "total": cat_total,
            "count": int(row["count"]),
            "percentage": percentage
        })
        
    # Monthly Trends (last 6 distinct months)
    cursor.execute("""
        SELECT 
            SUBSTR(date, 1, 7) as month,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM transactions
        GROUP BY SUBSTR(date, 1, 7)
        ORDER BY month ASC
    """)
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
        
    conn.close()
    
    # Savings Rate calculation
    savings_rate = round((current_balance / total_income * 100), 1) if total_income > 0 else 0
    
    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "current_balance": current_balance,
        "total_transactions": total_transactions,
        "savings_rate": savings_rate,
        "expense_breakdown": expense_categories,
        "income_breakdown": income_categories,
        "monthly_trends": monthly_trends
    }

def get_categories():
    """Retrieve distinct existing categories plus default options."""
    default_categories = {
        "expense": [
            "Food & Dining", "Housing", "Transportation", "Utilities",
            "Healthcare", "Entertainment", "Electronics", "Shopping",
            "Education", "Personal Care", "Travel", "Other Expense"
        ],
        "income": [
            "Salary", "Freelance", "Investments", "Business",
            "Gifts", "Rental Income", "Bonus", "Other Income"
        ]
    }
    return default_categories

def reset_database():
    """Reset the database to initial clean demo data."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS transactions;")
    conn.commit()
    conn.close()
    init_db()
    return True

# CLI Bridge for invocation by Node.js server.ts or terminal inspection
if __name__ == "__main__":
    init_db()
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        try:
            if cmd == "init":
                print(json.dumps({"status": "success", "message": "Database initialized"}))
            elif cmd == "get_transactions":
                args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
                data = get_transactions(
                    search=args.get("search", ""),
                    trans_type=args.get("type", ""),
                    category=args.get("category", ""),
                    start_date=args.get("start_date", ""),
                    end_date=args.get("end_date", ""),
                    sort_by=args.get("sort_by", "date"),
                    sort_order=args.get("sort_order", "desc")
                )
                print(json.dumps({"status": "success", "data": data}))
            elif cmd == "get_summary":
                summary = get_summary()
                print(json.dumps({"status": "success", "data": summary}))
            elif cmd == "get_categories":
                cats = get_categories()
                print(json.dumps({"status": "success", "data": cats}))
            elif cmd == "get_by_id":
                tx_id = int(sys.argv[2])
                item = get_transaction_by_id(tx_id)
                print(json.dumps({"status": "success", "data": item}))
            elif cmd == "add":
                payload = json.loads(sys.argv[2])
                new_item = add_transaction(
                    title=payload["title"],
                    amount=payload["amount"],
                    category=payload["category"],
                    date=payload["date"],
                    trans_type=payload["type"],
                    notes=payload.get("notes", "")
                )
                print(json.dumps({"status": "success", "data": new_item}))
            elif cmd == "update":
                tx_id = int(sys.argv[2])
                payload = json.loads(sys.argv[3])
                updated = update_transaction(
                    tx_id=tx_id,
                    title=payload["title"],
                    amount=payload["amount"],
                    category=payload["category"],
                    date=payload["date"],
                    trans_type=payload["type"],
                    notes=payload.get("notes", "")
                )
                print(json.dumps({"status": "success", "data": updated}))
            elif cmd == "delete":
                tx_id = int(sys.argv[2])
                success = delete_transaction(tx_id)
                print(json.dumps({"status": "success", "deleted": success}))
            elif cmd == "reset":
                reset_database()
                print(json.dumps({"status": "success", "message": "Database reset to initial sample records"}))
            else:
                print(json.dumps({"status": "error", "message": f"Unknown command {cmd}"}))
        except Exception as e:
            print(json.dumps({"status": "error", "message": str(e)}))
