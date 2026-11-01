import React from 'react';
import { Database, Server, Layout, ShieldCheck, Download, Terminal, CheckCircle2, FileCode } from 'lucide-react';

export const ProjectInfoModal: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-900 p-6 sm:p-8 text-white shadow-md">
        <div className="max-w-3xl">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/15 text-indigo-100 backdrop-blur-xs mb-3">
            Academic & Internship Submission
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Expense Tracker Architecture
          </h2>
          <p className="mt-2 text-sm text-indigo-100 leading-relaxed">
            A production-ready full-stack web application developed using HTML5, CSS3, JavaScript, Python Flask, and SQLite. Designed for high performance, parameterized SQL security, and dynamic calculations.
          </p>
        </div>
      </div>

      {/* 4 Pillars of Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Frontend */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-3">
            <Layout className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Frontend Layer</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Responsive UI with Tailwind CSS, SVG pie charts, modal forms, real-time input validation, and dynamic recalculations.
          </p>
        </div>

        {/* Backend API */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-3">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Python Flask API</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Modular REST endpoints (<code className="text-purple-600 font-mono">backend/app.py</code>) handling CRUD, data validation, and aggregation.
          </p>
        </div>

        {/* Database */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">SQLite Storage</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Local relational database (<code className="text-blue-600 font-mono">expenses.db</code>) with indexes, foreign keys, and permanent persistence.
          </p>
        </div>

        {/* Security */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Parameterized SQL</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            All database queries use parameterized placeholders (<code className="text-emerald-600 font-mono">?</code>) to prevent SQL injection attacks.
          </p>
        </div>
      </div>

      {/* Database Schema & SQL Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table Schema */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Database className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">SQLite Schema Definition</h3>
          </div>
          <div className="mt-4 bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed">
            <pre>{`CREATE TABLE transactions (
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
CREATE INDEX idx_transactions_category ON transactions(category);`}</pre>
          </div>
        </div>

        {/* Parameterized Query Example */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Parameterized Query Implementation</h3>
          </div>
          <div className="mt-4 bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed">
            <pre>{`# Safe insertion with parameterized SQL query
cursor.execute("""
    INSERT INTO transactions (title, amount, category, date, type, notes)
    VALUES (?, ?, ?, ?, ?, ?)
""", (title, amount, category, date, trans_type, notes))

# Safe parameterized query with filter term
cursor.execute("""
    SELECT * FROM transactions 
    WHERE (title LIKE ? OR notes LIKE ?) AND type = ?
""", (f"%{term}%", f"%{term}%", trans_type))`}</pre>
          </div>
        </div>
      </div>

      {/* REST API Endpoints Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-3">Flask REST API Endpoints</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Endpoint</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Validation & Parameters</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              <tr>
                <td className="py-2.5 px-3 font-bold text-indigo-600">GET</td>
                <td className="py-2.5 px-3 text-slate-900">/api/summary</td>
                <td className="py-2.5 px-3 font-sans text-slate-600">Returns total income, expenses, balance, savings rate & breakdowns</td>
                <td className="py-2.5 px-3 font-sans text-slate-500">None (Dynamic aggregate SQL)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-indigo-600">GET</td>
                <td className="py-2.5 px-3 text-slate-900">/api/transactions</td>
                <td className="py-2.5 px-3 font-sans text-slate-600">Retrieves filtered, sorted list of transactions</td>
                <td className="py-2.5 px-3 font-sans text-slate-500">search, type, category, start_date, end_date, sort_by</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-600">POST</td>
                <td className="py-2.5 px-3 text-slate-900">/api/transactions</td>
                <td className="py-2.5 px-3 font-sans text-slate-600">Creates a new transaction record</td>
                <td className="py-2.5 px-3 font-sans text-slate-500">title, amount &gt; 0, category, date, type in ('income','expense')</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-amber-600">PUT</td>
                <td className="py-2.5 px-3 text-slate-900">/api/transactions/:id</td>
                <td className="py-2.5 px-3 font-sans text-slate-600">Updates an existing transaction by ID</td>
                <td className="py-2.5 px-3 font-sans text-slate-500">Validates ID existence and updated fields</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-rose-600">DELETE</td>
                <td className="py-2.5 px-3 text-slate-900">/api/transactions/:id</td>
                <td className="py-2.5 px-3 font-sans text-slate-600">Deletes a transaction permanently</td>
                <td className="py-2.5 px-3 font-sans text-slate-500">Transaction ID integer</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-indigo-600">GET</td>
                <td className="py-2.5 px-3 text-slate-900">/api/export/csv</td>
                <td className="py-2.5 px-3 font-sans text-slate-600">Streams all transaction records as a CSV download</td>
                <td className="py-2.5 px-3 font-sans text-slate-500">MIME text/csv with attachment header</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Local Execution Guide for Viva / Project Defense */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900">How to Run and Demonstrate Locally</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          For project demonstrations, evaluators can inspect both the live web dashboard or run the Python Flask backend directly:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              1. Standalone Python Flask Server
            </h4>
            <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-xs">
              <p className="text-slate-400"># Navigate to backend directory</p>
              <p>cd backend</p>
              <p className="text-slate-400 mt-1"># Install requirements</p>
              <p>pip install -r requirements.txt</p>
              <p className="text-slate-400 mt-1"># Run Flask app</p>
              <p>python app.py</p>
            </div>
            <p className="text-[11px] text-slate-500">
              Starts the Flask server on <code className="font-mono text-indigo-600">http://127.0.0.1:5000</code>.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              2. Full-Stack Development Server
            </h4>
            <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-xs">
              <p className="text-slate-400"># Install dependencies</p>
              <p>npm install</p>
              <p className="text-slate-400 mt-1"># Start dev server</p>
              <p>npm run dev</p>
            </div>
            <p className="text-[11px] text-slate-500">
              Starts server on <code className="font-mono text-indigo-600">http://localhost:3000</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
