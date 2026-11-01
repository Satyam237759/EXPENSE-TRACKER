"""
SmartSpend - Database Setup and Schema Management
Handles SQLite database initialization, table creation, indexes, and initial demo data.
"""

import sqlite3
import os
import hashlib
import binascii
from datetime import datetime, timedelta

DB_DIR = os.path.dirname(os.path.abspath(__file__))
# Store in parent directory instance/ or root
INSTANCE_DIR = os.path.join(os.path.dirname(DB_DIR), "instance")
os.makedirs(INSTANCE_DIR, exist_ok=True)
DB_PATH = os.path.join(INSTANCE_DIR, "smartspend.db")

def hash_password(password: str) -> str:
    """Create a secure PBKDF2-HMAC-SHA256 password hash with salt."""
    salt = hashlib.sha256(os.urandom(32)).hexdigest()[:16]
    pwd_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}${binascii.hexlify(pwd_hash).decode('ascii')}"

def verify_password(stored_hash: str, password: str) -> bool:
    """Verify password against stored salt$hash."""
    try:
        salt, expected_hash = stored_hash.split('$')
        pwd_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return binascii.hexlify(pwd_hash).decode('ascii') == expected_hash
    except Exception:
        return False

def get_db():
    """Create a connection with Row factory and WAL mode enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    """Create tables, indexes, and default categories."""
    conn = get_db()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        currency TEXT DEFAULT 'INR',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Categories Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        icon TEXT DEFAULT 'tag',
        color TEXT DEFAULT '#6366f1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 3. Transactions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        payment_method TEXT DEFAULT 'UPI',
        notes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 4. Budgets Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        month TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, month, category),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 5. Savings Goals Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS savings_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        target_amount REAL NOT NULL CHECK(target_amount > 0),
        current_amount REAL DEFAULT 0.0 CHECK(current_amount >= 0),
        target_date TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        notes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 6. Savings Contributions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS savings_contributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        date TEXT NOT NULL,
        notes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 7. Recurring Transactions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recurring_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        category TEXT NOT NULL,
        frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
        payment_method TEXT DEFAULT 'UPI',
        next_due_date TEXT NOT NULL,
        last_processed_date TEXT DEFAULT NULL,
        is_active INTEGER DEFAULT 1,
        notes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Create Indexes for lightning fast lookups
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_trans_user_date ON transactions(user_id, date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_trans_user_type ON transactions(user_id, type);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_trans_user_cat ON transactions(user_id, category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_goals_user ON savings_goals(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_transactions(user_id, is_active);")

    conn.commit()

    # Seed Default Categories & Demo User if no users exist
    cursor.execute("SELECT COUNT(*) as count FROM users")
    if cursor.fetchone()["count"] == 0:
        seed_demo_data(conn)

    conn.close()
    return True

def seed_demo_data(conn):
    """Seed a realistic demo user with authentic Indian Rupee transactions, budgets, goals, and recurring items."""
    cursor = conn.cursor()

    # Create demo user: satyamnishad685@gmail.com / Demo@123
    pwd_hash = hash_password("Demo@123")
    cursor.execute("""
        INSERT INTO users (name, email, password_hash, currency)
        VALUES (?, ?, ?, ?)
    """, ("Satyam Nishad", "satyamnishad685@gmail.com", pwd_hash, "INR"))
    user_id = cursor.lastrowid

    # Seed Default System & User Categories
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

    for name, icon, color in default_expense_cats:
        cursor.execute("""
            INSERT INTO categories (user_id, name, type, icon, color)
            VALUES (?, ?, 'expense', ?, ?)
        """, (user_id, name, icon, color))

    default_income_cats = [
        ("Salary", "briefcase", "#10b981"),
        ("Freelance", "laptop", "#0d9488"),
        ("Business", "building", "#2563eb"),
        ("Investments", "trending-up", "#8b5cf6"),
        ("Gifts", "gift", "#d97706"),
        ("Rental Income", "key", "#4f46e5"),
        ("Other Income", "plus-circle", "#64748b")
    ]

    for name, icon, color in default_income_cats:
        cursor.execute("""
            INSERT INTO categories (user_id, name, type, icon, color)
            VALUES (?, ?, 'income', ?, ?)
        """, (user_id, name, icon, color))

    # Helper for relative dates (YYYY-MM-DD)
    today = datetime.now()
    def get_date_str(days_ago):
        d = today - timedelta(days=days_ago)
        return d.strftime("%Y-%m-%d")

    current_month = today.strftime("%Y-%m")

    # Seed Transactions (in INR ₹)
    demo_transactions = [
        ("Monthly Tech Job Salary", 95000.00, "income", "Salary", get_date_str(26), "Net Banking", "October Tech Corp payout"),
        ("Apartment 2BHK Rent", 24000.00, "expense", "Rent", get_date_str(25), "UPI", "Monthly apartment lease to landlord"),
        ("Supermarket & Vegetable Groceries", 4850.00, "expense", "Food & Dining", get_date_str(22), "UPI", "Blinkit & Nature's Basket fresh groceries"),
        ("Freelance UI/UX Mobile App Design", 28000.00, "income", "Freelance", get_date_str(18), "Net Banking", "Milestone 2 payment from Bangalore client"),
        ("Electricity & Water Utility Bill", 3250.00, "expense", "Bills & Utilities", get_date_str(16), "UPI", "BESCOM electricity & apartment water bill"),
        ("Metro Smart Card Recharge", 1500.00, "expense", "Transportation", get_date_str(14), "UPI", "Monthly transit card top-up"),
        ("High-Speed Fiber Broadband", 1199.00, "expense", "Bills & Utilities", get_date_str(12), "Credit Card", "Airtel Xstream Fiber 200Mbps"),
        ("Weekend Dining & Swiggy Delivery", 2450.00, "expense", "Food & Dining", get_date_str(10), "Debit Card", "Barbeque Nation family dinner"),
        ("Dental Clinic Consultation & Cleaning", 2200.00, "expense", "Health", get_date_str(8), "UPI", "Routine bi-annual dental prophylaxis"),
        ("Noise-Cancelling Wireless Earbuds", 4999.00, "expense", "Shopping", get_date_str(6), "Credit Card", "Amazon Great Indian Festival deal"),
        ("Stock Dividend Payout", 3500.00, "income", "Investments", get_date_str(5), "Net Banking", "TCS & Infosys quarterly dividend credits"),
        ("IMAX Cinema Tickets & Popcorn", 1250.00, "expense", "Entertainment", get_date_str(3), "UPI", "Weekend movie with friends"),
        ("Netflix & Spotify Premium Bundle", 799.00, "expense", "Subscriptions", get_date_str(2), "Credit Card", "Monthly digital entertainment subscriptions"),
        ("Cafe Coffee & Snacks", 380.00, "expense", "Food & Dining", get_date_str(1), "UPI", "Blue Tokai iced latte and croissant")
    ]

    for title, amount, t_type, cat, d_str, payment, notes in demo_transactions:
        cursor.execute("""
            INSERT INTO transactions (user_id, title, amount, type, category, date, payment_method, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, title, amount, t_type, cat, d_str, payment, notes))

    # Seed Monthly Budgets
    demo_budgets = [
        (current_month, "Overall", 60000.00),
        (current_month, "Food & Dining", 12000.00),
        (current_month, "Rent", 24000.00),
        (current_month, "Bills & Utilities", 6000.00),
        (current_month, "Transportation", 4000.00),
        (current_month, "Shopping", 8000.00),
        (current_month, "Entertainment", 5000.00)
    ]

    for month, cat, amt in demo_budgets:
        cursor.execute("""
            INSERT INTO budgets (user_id, month, category, amount)
            VALUES (?, ?, ?, ?)
        """, (user_id, month, cat, amt))

    # Seed Savings Goals
    demo_goals = [
        ("MacBook Pro M3", 140000.00, 65000.00, (today + timedelta(days=90)).strftime("%Y-%m-%d"), "Electronics", "High-performance laptop for freelance work"),
        ("Emergency Fund (6 Months)", 180000.00, 115000.00, (today + timedelta(days=180)).strftime("%Y-%m-%d"), "Security", "Liquid safety buffer in high-yield fixed deposit"),
        ("Goa Beach Holiday Trip", 35000.00, 20000.00, (today + timedelta(days=45)).strftime("%Y-%m-%d"), "Travel", "Flight, resort and scuba diving in South Goa")
    ]

    for title, target, current, t_date, cat, notes in demo_goals:
        cursor.execute("""
            INSERT INTO savings_goals (user_id, title, target_amount, current_amount, target_date, category, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user_id, title, target, current, t_date, cat, notes))
        goal_id = cursor.lastrowid

        # Record recent contributions
        cursor.execute("""
            INSERT INTO savings_contributions (goal_id, user_id, amount, date, notes)
            VALUES (?, ?, ?, ?, ?)
        """, (goal_id, user_id, current * 0.4, get_date_str(20), "Monthly scheduled contribution"))
        cursor.execute("""
            INSERT INTO savings_contributions (goal_id, user_id, amount, date, notes)
            VALUES (?, ?, ?, ?, ?)
        """, (goal_id, user_id, current * 0.6, get_date_str(5), "Bonus savings deposit"))

    # Seed Recurring Transactions
    demo_recurring = [
        ("Monthly Tech Job Salary", 95000.00, "income", "Salary", "monthly", "Net Banking", (today + timedelta(days=4)).strftime("%Y-%m-%d"), "Primary monthly salary from tech firm"),
        ("Apartment Rent", 24000.00, "expense", "Rent", "monthly", "UPI", (today + timedelta(days=5)).strftime("%Y-%m-%d"), "Monthly house rent auto-pay"),
        ("Airtel Fiber Broadband", 1199.00, "expense", "Bills & Utilities", "monthly", "Credit Card", (today + timedelta(days=12)).strftime("%Y-%m-%d"), "High speed fiber recurring bill"),
        ("Netflix & Spotify Subscription", 799.00, "expense", "Subscriptions", "monthly", "Credit Card", (today + timedelta(days=2)).strftime("%Y-%m-%d"), "Entertainment media bundle")
    ]

    for title, amt, t_type, cat, freq, payment, due_date, notes in demo_recurring:
        cursor.execute("""
            INSERT INTO recurring_transactions (user_id, title, amount, type, category, frequency, payment_method, next_due_date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, title, amt, t_type, cat, freq, payment, due_date, notes))

    conn.commit()
    print("Demo user 'demo@smartspend.in' seeded with complete realistic Indian financial dataset!")

if __name__ == "__main__":
    init_db()
    print("Database initialized at:", DB_PATH)
