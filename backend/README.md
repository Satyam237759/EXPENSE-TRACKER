# Expense Tracker - College Internship Project

A complete, modern, responsive personal finance and expense tracking web application built with **HTML5, CSS3, JavaScript, Python Flask, and SQLite**.

---

## 📌 Project Overview
Expense Tracker empowers users to manage their personal finances by tracking income and expenditures, viewing dynamic category analytics through interactive charts, filtering and searching transactions, and maintaining an accurate real-time balance.

All data is permanently persisted inside an SQLite database (`expenses.db`) with parameterized SQL queries to prevent SQL injection vulnerabilities.

---

## 🛠️ Technology Stack
- **Frontend:** HTML5, CSS3, JavaScript, Tailwind CSS, Lucide Icons
- **Backend:** Python 3, Flask REST API
- **Database:** SQLite3 (`expenses.db`) with Row Factory and parameterized queries
- **Runtime:** Express / Vite dev server integration on port 3000 & standalone Flask server on port 5000

---

## 🌟 Key Features
1. **Interactive Dashboard:** Live metrics for Total Income, Total Expenses, Net Balance, and Transaction Count.
2. **Transaction Management:** Full CRUD (Create, Read, Update, Delete) operations with instant dynamic calculations.
3. **Category Spending Analytics:** Visual category breakdown donut/pie chart with percentage distributions and total expenditures.
4. **Income vs. Expense Trend Analysis:** Monthly comparison bars.
5. **Advanced Filters & Search:** Filter by type (All, Income, Expense), category, date ranges, and live title/notes keyword search.
6. **Form Validation:** Comprehensive frontend and backend validation for required fields, positive amounts, and valid calendar dates.
7. **CSV Data Export:** One-click data export of all financial records to a `.csv` file.
8. **Toast Notifications:** Smooth feedback on creation, modification, deletion, and validation errors.
9. **Fully Responsive:** Optimized for desktop (1440px+ sidebar layout), tablets, and mobile smartphones.

---

## 🗄️ Database Schema (`expenses.db`)

```sql
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    notes TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category ON transactions(category);
```

---

## 📡 REST API Specifications

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/summary` | Dynamic totals (income, expenses, balance, savings rate, breakdown) |
| `GET` | `/api/transactions` | Query transactions with filters (`search`, `type`, `category`, `start_date`, `end_date`, `sort_by`, `sort_order`) |
| `POST` | `/api/transactions` | Add a new income or expense transaction |
| `GET` | `/api/transactions/<id>` | Fetch a single transaction by primary key |
| `PUT` | `/api/transactions/<id>` | Update an existing transaction |
| `DELETE` | `/api/transactions/<id>` | Permanently remove a transaction |
| `GET` | `/api/categories` | Get predefined categories for income and expense |
| `POST` | `/api/reset` | Reset database to clean realistic sample records |
| `GET` | `/api/export/csv` | Download all records as a CSV spreadsheet |

---

## 🚀 Running the Project Locally

### Option 1: Standalone Flask Backend
```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start Flask API server
python app.py
```
The Flask backend will launch at `http://127.0.0.1:5000`.

### Option 2: Full-Stack Integrated Environment (Vite + Node / Python Bridge)
```bash
# 1. Install Node dependencies
npm install

# 2. Run the development server
npm run dev
```
Open `http://localhost:3000` in your browser.
