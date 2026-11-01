# SmartSpend — Professional Expense Tracker Web Application

SmartSpend is an enterprise-grade personal finance and expense tracking web application developed with **HTML5, CSS3, Vanilla JavaScript, Chart.js, Python Flask, and SQLite**. 

Designed for commercial and portfolio presentation, SmartSpend implements a dark navy and purple SaaS design language, session-based user authentication with password hashing, multi-tenant user isolation, dynamic financial calculations in Indian Rupees (₹), budget controls with threshold warnings, dedicated savings goals with contribution logs, and recurring financial automations.

---

## 📁 1. Project Directory Structure

```text
smartspend/
├── app.py                      # Master Flask REST API & Web Application
├── config.py                   # Centralized Configuration & Session settings
├── requirements.txt            # Python dependencies (Flask, Werkzeug)
├── README.md                   # Complete installation, setup & viva guide
├── database/
│   ├── db_setup.py             # SQLite schema generation & demo data seed
│   └── db_operations.py        # Parameterized queries & business logic
├── templates/
│   ├── base.html               # Base layout with sidebar, topbar & modals
│   ├── login.html              # Sign-in portal with pre-filled demo account
│   ├── register.html           # New user registration portal
│   ├── dashboard.html          # KPI summary, Chart.js trends & recent ledger
│   ├── transactions.html       # Full filter, search, sort, and paginated table
│   ├── budgets.html            # Overall and category monthly budget tracking
│   ├── savings.html            # Long-term goals & actual deposit contributions
│   ├── recurring.html          # Automations for salaries, rent & subscriptions
│   ├── analytics.html          # Custom date reports, averages, & payment shares
│   └── profile.html            # Profile management & database security specs
├── static/
│   ├── css/
│   │   └── style.css           # Premium Dark Navy & Purple gradient stylesheet
│   └── js/
│       ├── app.js              # Global currency formatters (₹), dates & toasts
│       ├── dashboard.js        # KPI stats & Chart.js graph initializations
│       ├── transactions.js     # Table filtering, search & pagination logic
│       ├── budgets.js          # Budget progress bars & 80%/100% warning logic
│       ├── savings.js          # Wealth targets & contribution modal handlers
│       └── analytics.js        # Date-range reports & payment method charts
└── instance/
    └── smartspend.db           # SQLite persistent relational database
```

---

## 🛠️ 2. Technology Stack & Architecture

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+), Chart.js 4.4, FontAwesome 6, Plus Jakarta Sans, JetBrains Mono.
- **Backend:** Python 3.10+, Flask framework, Werkzeug security utilities.
- **Database:** SQLite 3 with WAL (Write-Ahead Logging) and Foreign Key constraints.
- **Security:**
  - Password hashing: **PBKDF2-HMAC-SHA256** with 100,000 rounds and random cryptographic salts.
  - SQL injection immunity: **100% Parameterized queries** with `?` bindings.
  - Multi-tenant isolation: All records filtered by `user_id`.
  - Input validation: Type checking, bounds checking, positive amounts (`amount > 0`).

---

## 🌟 3. Core Features Breakdown

### A. Executive Dashboard
- **Total Balance:** Net surplus/deficit with savings rate percentage.
- **Total Income & Total Expenses:** Formatted in Indian Rupees (`₹`), with current month breakdowns.
- **Monthly Budget Usage:** Real-time percentage progress bar with remaining budget.
- **Quick Action Buttons:** Rapid Add Expense and Add Income modal triggers.
- **Interactive Chart.js Visualizations:**
  1. *Monthly Trend Chart:* Grouped comparative bars for Income vs. Expense.
  2. *Category Doughnut Chart:* Category percentage distribution with center callouts.
  3. *Weekly Spending Trend:* Line chart showing daily spending across the last 7 days.
- **Recent Transactions Ledger:** Latest 6 records with category badges and payment methods.

### B. Transaction Management
- Full CRUD operations with instant dynamic calculations.
- Comprehensive filtering by:
  - Text search (title and notes)
  - Type (Expense / Income)
  - Category (Food & Dining, Rent, Utilities, Shopping, Salary, Freelance, etc.)
  - Payment Method (UPI, Debit Card, Credit Card, Net Banking, Cash)
  - Date presets (*All Time*, *This Month*, *Last 30 Days*, *Custom Range*)
- Column sorting (Date, Title, Category, Amount) and client-side pagination.
- Modal confirmation before record deletion.

### C. Income Hub
- Dedicated revenue stream tracking for salaries, freelance contracts, business payouts, investments, and gifts.
- Attribution by payment channel and monthly cash flow aggregation.

### D. Budget Management & Overspending Warnings
- Establish an **Overall Monthly Budget** or individual **Category Budgets** (e.g. ₹12,000 for Food, ₹24,000 for Rent).
- Progress bars calculate real expenditures against limits.
- **80% Threshold Warning:** Amber alert when spending reaches 80% of budget.
- **100% Exceeded Warning:** Crimson alert when spending exceeds 100% of budget with exact overage amount.

### E. Savings Goals & Actual Contributions
- Set targets for items like a *MacBook Pro M3*, *Emergency Fund*, or *Vacation Trip*.
- Record actual deposit contributions (amount, date, notes) that increment the goal's balance.
- **Crucial Distinction:** Distinguishes recorded cash deposits from theoretical income minus expense figures.

### F. Recurring Transactions Processor
- Automations for monthly salary credits, rent payments, fiber broadband, and digital subscriptions.
- Supports Daily, Weekly, Monthly, and Yearly frequencies.
- **Process Due Now** button scans for due dates (`next_due_date <= today`), executes the transaction, advances the due date, and prevents duplicate executions via `last_processed_date`.

### G. Analytics & CSV Export
- Custom date window reporting.
- Daily average spending metric.
- Highest spending month vs. lowest spending month.
- Payment method share doughnut chart (UPI vs. Cards vs. Net Banking).
- One-click CSV download for spreadsheets.

---

## 💻 4. Local Installation & Setup Instructions

### Prerequisites
- Python 3.9 or higher installed ([python.org](https://www.python.org/downloads/))
- Git (optional)
- Visual Studio Code or any modern code editor

---

### Step-by-Step Setup on Windows (VS Code)

1. **Open Project in VS Code:**
   Open VS Code, press `Ctrl + O` (or `File -> Open Folder...`) and select the `smartspend` directory.

2. **Open Integrated Terminal:**
   Press `` Ctrl + ` `` (Backtick) to launch the integrated terminal (PowerShell or Command Prompt).

3. **Create a Python Virtual Environment:**
   ```powershell
   python -m venv venv
   ```

4. **Activate the Virtual Environment:**
   - On Windows (PowerShell):
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
     *(If script execution is restricted on Windows, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` first)*
   - On Windows (Command Prompt):
     ```cmd
     venv\Scripts\activate.bat
     ```

5. **Install Dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

6. **Initialize SQLite Database (Schema & Demo Records):**
   ```powershell
   python database/db_setup.py
   ```

7. **Launch SmartSpend Application:**
   ```powershell
   python app.py
   ```

8. **Open in Browser:**
   Navigate to `http://127.0.0.1:5000` in your web browser (Chrome, Edge, Firefox).

---

### Step-by-Step Setup on macOS / Linux

```bash
# 1. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install requirements
pip install -r requirements.txt

# 3. Initialize SQLite database
python3 database/db_setup.py

# 4. Start the Flask application
python3 app.py
```
Open `http://127.0.0.1:5000` in your browser.

---

## 🔑 5. Pre-Seeded Demo Account

The database includes an authentic demonstration profile with realistic Indian Rupee transactions, active budgets, goals, and recurring rules:

| Field | Credentials |
|---|---|
| **Email** | `satyamnishad685@gmail.com` |
| **Password** | `Demo@123` |
| **Name** | Satyam Nishad |
| **Currency** | Indian Rupee (₹ INR) |

You can also click **Create one for free** on the login page to register a brand new isolated account.

---

## 🧪 6. Verification & Testing Checklist

1. **Sign In:** Use `demo@smartspend.in` / `Demo@123` or register a new user.
2. **Dashboard Verification:** Check that Total Balance, Income, Expenses, Savings Rate, and Budget Usage display calculated figures in Indian Rupees (₹).
3. **Add Transaction:** Click **Add Expense** or **Add Income**, fill in title, amount (e.g. ₹1,200), category, and payment method (UPI). Click **Save Record**. The KPI cards and transaction table will update dynamically.
4. **Edit Transaction:** Click the pencil icon on any record in the Transactions tab, modify the amount or title, and click **Update Record**.
5. **Delete Transaction:** Click the trash icon on a transaction and confirm the delete prompt.
6. **Budget Warning Test:** Navigate to the **Budgets** tab. View the progress bar for *Bills & Utilities* (74.2%) and *Food & Dining*. Set a low budget (e.g. ₹1,000 for Entertainment) to see the **Budget Exceeded** banner trigger immediately.
7. **Savings Deposit:** Navigate to the **Savings Goals** tab. Click **Deposit** on *MacBook Pro M3*, add ₹5,000, and watch the progress bar increment.
8. **Recurring Processing:** Navigate to the **Recurring Rules** tab. Click **Process Due Now** to verify automatic generation of due transactions.
9. **Export CSV:** Click **Export CSV** in the header or transactions table to download a formatted `.csv` file.

---

## 📦 7. Standalone Desktop Packaging (Optional)

To package SmartSpend into a portable desktop executable using PyInstaller:

```bash
pip install pyinstaller
pyinstaller --noconfirm --onedir --windowed --add-data "templates;templates" --add-data "static;static" app.py
```
This generates a runnable executable in the `dist/app/` folder.
