"""
SmartSpend - Professional Expense Tracker Web Application
Full-featured Python Flask application with SQLite database persistence,
session-based user authentication, budget tracking, savings goals, recurring rules,
and analytical reporting.
"""

import os
import sys
import io
import csv
from functools import wraps
from datetime import datetime
from flask import (
    Flask, render_template, request, redirect, url_for,
    session, flash, jsonify, Response, send_from_directory
)
from config import Config

# Ensure database module is reachable
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database.db_setup import init_db
from database import db_operations as db

# Initialize Flask App
app = Flask(__name__, static_folder="static", template_folder="templates")
app.config.from_object(Config)

# Ensure database tables exist on startup
init_db()

# ----------------- AUTHENTICATION HELPERS -----------------

def login_required(f):
    """Decorator to require login for protected routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"success": False, "error": "Authentication required. Please log in."}), 401
            return redirect(url_for("login_page"))
        return f(*args, **kwargs)
    return decorated_function

@app.context_processor
def inject_user_context():
    """Inject user details and currency symbol into all Jinja templates."""
    user = None
    if "user_id" in session:
        user = {
            "id": session.get("user_id"),
            "name": session.get("user_name"),
            "email": session.get("user_email"),
            "currency": session.get("user_currency", "INR")
        }
    return {
        "current_user": user,
        "currency_symbol": "₹",
        "app_name": "SmartSpend"
    }

# ----------------- WEB PAGE ROUTES -----------------

@app.route("/")
def index():
    if "user_id" in session:
        return redirect(url_for("dashboard_page"))
    return redirect(url_for("login_page"))

@app.route("/login", methods=["GET", "POST"])
def login_page():
    if "user_id" in session:
        return redirect(url_for("dashboard_page"))

    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")

        user = db.authenticate_user(email, password)
        if user:
            session.permanent = True
            session["user_id"] = user["id"]
            session["user_name"] = user["name"]
            session["user_email"] = user["email"]
            session["user_currency"] = user.get("currency", "INR")
            flash("Welcome back, " + user["name"] + "!", "success")
            return redirect(url_for("dashboard_page"))
        else:
            flash("Invalid email or password. Please try again.", "danger")

    return render_template("login.html")

@app.route("/register", methods=["GET", "POST"])
def register_page():
    if "user_id" in session:
        return redirect(url_for("dashboard_page"))

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if not name or not email or not password:
            flash("All fields are required.", "danger")
        elif password != confirm_password:
            flash("Passwords do not match.", "danger")
        elif len(password) < 6:
            flash("Password must be at least 6 characters long.", "danger")
        else:
            try:
                user = db.register_user(name, email, password)
                session.permanent = True
                session["user_id"] = user["id"]
                session["user_name"] = user["name"]
                session["user_email"] = user["email"]
                session["user_currency"] = user.get("currency", "INR")
                flash("Account created successfully! Welcome to SmartSpend.", "success")
                return redirect(url_for("dashboard_page"))
            except ValueError as e:
                flash(str(e), "danger")

    return render_template("register.html")

@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out securely.", "info")
    return redirect(url_for("login_page"))

@app.route("/dashboard")
@login_required
def dashboard_page():
    return render_template("dashboard.html")

@app.route("/transactions")
@login_required
def transactions_page():
    return render_template("transactions.html")

@app.route("/income")
@login_required
def income_page():
    return render_template("transactions.html", default_type="income")

@app.route("/budgets")
@login_required
def budgets_page():
    return render_template("budgets.html")

@app.route("/savings")
@login_required
def savings_page():
    return render_template("savings.html")

@app.route("/recurring")
@login_required
def recurring_page():
    return render_template("recurring.html")

@app.route("/analytics")
@login_required
def analytics_page():
    return render_template("analytics.html")

@app.route("/profile", methods=["GET", "POST"])
@login_required
def profile_page():
    user_id = session["user_id"]
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip()
        current_password = request.form.get("current_password")
        new_password = request.form.get("new_password")

        try:
            updated = db.update_user_profile(user_id, name, email, current_password, new_password)
            session["user_name"] = updated["name"]
            session["user_email"] = updated["email"]
            flash("Profile updated successfully.", "success")
        except ValueError as e:
            flash(str(e), "danger")

    user_info = db.get_user_by_id(user_id)
    return render_template("profile.html", user=user_info)

# ----------------- REST API ENDPOINTS -----------------

@app.route("/api/auth/me")
def api_auth_me():
    if "user_id" not in session:
        return jsonify({"authenticated": False}), 200
    user = db.get_user_by_id(session["user_id"])
    return jsonify({"authenticated": True, "user": user}), 200

@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")

    user = db.authenticate_user(email, password)
    if not user:
        return jsonify({"success": False, "error": "Invalid email or password"}), 401

    session.permanent = True
    session["user_id"] = user["id"]
    session["user_name"] = user["name"]
    session["user_email"] = user["email"]
    session["user_currency"] = user.get("currency", "INR")
    return jsonify({"success": True, "user": user}), 200

@app.route("/api/auth/register", methods=["POST"])
def api_register():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"success": False, "error": "Name, email, and password are required"}), 400
    if len(password) < 6:
        return jsonify({"success": False, "error": "Password must be at least 6 characters"}), 400

    try:
        user = db.register_user(name, email, password)
        session.permanent = True
        session["user_id"] = user["id"]
        session["user_name"] = user["name"]
        session["user_email"] = user["email"]
        session["user_currency"] = user.get("currency", "INR")
        return jsonify({"success": True, "user": user}), 201
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route("/api/auth/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out"}), 200

@app.route("/api/dashboard")
@login_required
def api_dashboard():
    user_id = session["user_id"]
    summary = db.get_dashboard_summary(user_id)
    return jsonify({"success": True, "data": summary}), 200

@app.route("/api/transactions", methods=["GET"])
@login_required
def api_get_transactions():
    user_id = session["user_id"]
    search = request.args.get("search", "")
    t_type = request.args.get("type", "")
    category = request.args.get("category", "")
    payment_method = request.args.get("payment_method", "")
    start_date = request.args.get("start_date", "")
    end_date = request.args.get("end_date", "")
    sort_by = request.args.get("sort_by", "date")
    sort_order = request.args.get("sort_order", "desc")
    limit = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))

    result = db.get_transactions(
        user_id=user_id,
        search=search,
        trans_type=t_type,
        category=category,
        payment_method=payment_method,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset
    )
    return jsonify({"success": True, "data": result["records"], "total": result["total"]}), 200

@app.route("/api/transactions", methods=["POST"])
@login_required
def api_add_transaction():
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}

    title = data.get("title", "").strip()
    amount_raw = data.get("amount")
    t_type = str(data.get("type", "")).strip().lower()
    category = data.get("category", "").strip()
    date_str = data.get("date", "").strip()
    payment_method = data.get("payment_method", "UPI").strip()
    notes = data.get("notes", "").strip()

    if not title:
        return jsonify({"success": False, "error": "Title is required"}), 400
    try:
        amount = float(amount_raw)
        if amount <= 0:
            return jsonify({"success": False, "error": "Amount must be a positive number greater than 0"}), 400
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "Invalid amount"}), 400

    if t_type not in ("income", "expense"):
        return jsonify({"success": False, "error": "Type must be 'income' or 'expense'"}), 400
    if not category:
        return jsonify({"success": False, "error": "Category is required"}), 400
    if not date_str:
        return jsonify({"success": False, "error": "Date is required"}), 400

    new_tx = db.add_transaction(user_id, title, amount, t_type, category, date_str, payment_method, notes)
    return jsonify({"success": True, "message": "Transaction added successfully", "data": new_tx}), 201

@app.route("/api/transactions/<int:tx_id>", methods=["PUT"])
@login_required
def api_update_transaction(tx_id):
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}

    title = data.get("title", "").strip()
    amount = float(data.get("amount", 0))
    t_type = str(data.get("type", "")).strip().lower()
    category = data.get("category", "").strip()
    date_str = data.get("date", "").strip()
    payment_method = data.get("payment_method", "UPI").strip()
    notes = data.get("notes", "").strip()

    if not title or amount <= 0 or t_type not in ("income", "expense") or not category or not date_str:
        return jsonify({"success": False, "error": "Please check all required fields"}), 400

    updated = db.update_transaction(user_id, tx_id, title, amount, t_type, category, date_str, payment_method, notes)
    if not updated:
        return jsonify({"success": False, "error": "Transaction not found or unauthorized"}), 404

    return jsonify({"success": True, "message": "Transaction updated successfully", "data": updated}), 200

@app.route("/api/transactions/<int:tx_id>", methods=["DELETE"])
@login_required
def api_delete_transaction(tx_id):
    user_id = session["user_id"]
    deleted = db.delete_transaction(user_id, tx_id)
    if not deleted:
        return jsonify({"success": False, "error": "Transaction not found or unauthorized"}), 404
    return jsonify({"success": True, "message": "Transaction deleted successfully"}), 200

@app.route("/api/categories", methods=["GET"])
@login_required
def api_get_categories():
    user_id = session["user_id"]
    cats = db.get_categories(user_id)
    return jsonify({"success": True, "data": cats}), 200

@app.route("/api/categories", methods=["POST"])
@login_required
def api_add_category():
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    c_type = data.get("type", "expense").strip().lower()
    icon = data.get("icon", "tag")
    color = data.get("color", "#6366f1")

    if not name:
        return jsonify({"success": False, "error": "Category name is required"}), 400

    new_cat = db.add_category(user_id, name, c_type, icon, color)
    return jsonify({"success": True, "data": new_cat}), 201

@app.route("/api/budgets", methods=["GET"])
@login_required
def api_get_budgets():
    user_id = session["user_id"]
    month = request.args.get("month", datetime.now().strftime("%Y-%m"))
    budgets_info = db.get_budgets(user_id, month)
    return jsonify({"success": True, "data": budgets_info}), 200

@app.route("/api/budgets", methods=["POST"])
@login_required
def api_set_budget():
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    month = data.get("month", datetime.now().strftime("%Y-%m")).strip()
    category = data.get("category", "Overall").strip()
    amount = float(data.get("amount", 0))

    if amount <= 0:
        return jsonify({"success": False, "error": "Budget amount must be greater than 0"}), 400

    db.set_budget(user_id, month, category, amount)
    return jsonify({"success": True, "message": f"Budget for {category} set to ₹{amount:,.2f}"}), 200

@app.route("/api/budgets/<int:b_id>", methods=["DELETE"])
@login_required
def api_delete_budget(b_id):
    user_id = session["user_id"]
    deleted = db.delete_budget(user_id, b_id)
    if not deleted:
        return jsonify({"success": False, "error": "Budget record not found"}), 404
    return jsonify({"success": True, "message": "Budget removed"}), 200

@app.route("/api/savings-goals", methods=["GET"])
@login_required
def api_get_savings_goals():
    user_id = session["user_id"]
    goals = db.get_savings_goals(user_id)
    return jsonify({"success": True, "data": goals}), 200

@app.route("/api/savings-goals", methods=["POST"])
@login_required
def api_add_savings_goal():
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    target_amount = float(data.get("target_amount", 0))
    target_date = data.get("target_date", "").strip()
    category = data.get("category", "General").strip()
    notes = data.get("notes", "").strip()
    initial_amount = float(data.get("initial_amount", 0))

    if not title or target_amount <= 0 or not target_date:
        return jsonify({"success": False, "error": "Title, positive target amount, and target date are required"}), 400

    goal_id = db.add_savings_goal(user_id, title, target_amount, target_date, category, notes, initial_amount)
    return jsonify({"success": True, "goal_id": goal_id, "message": "Savings goal created"}), 201

@app.route("/api/savings-goals/<int:goal_id>/contribute", methods=["POST"])
@login_required
def api_add_savings_contribution(goal_id):
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    amount = float(data.get("amount", 0))
    date_str = data.get("date", datetime.now().strftime("%Y-%m-%d")).strip()
    notes = data.get("notes", "").strip()

    if amount <= 0:
        return jsonify({"success": False, "error": "Contribution must be greater than 0"}), 400

    try:
        result = db.add_savings_contribution(user_id, goal_id, amount, date_str, notes)
        return jsonify({"success": True, "message": "Contribution recorded successfully", "data": result}), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route("/api/savings-goals/<int:goal_id>", methods=["DELETE"])
@login_required
def api_delete_savings_goal(goal_id):
    user_id = session["user_id"]
    deleted = db.delete_savings_goal(user_id, goal_id)
    if not deleted:
        return jsonify({"success": False, "error": "Savings goal not found"}), 404
    return jsonify({"success": True, "message": "Savings goal removed"}), 200

@app.route("/api/recurring", methods=["GET"])
@login_required
def api_get_recurring():
    user_id = session["user_id"]
    items = db.get_recurring_transactions(user_id)
    return jsonify({"success": True, "data": items}), 200

@app.route("/api/recurring", methods=["POST"])
@login_required
def api_add_recurring():
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    amount = float(data.get("amount", 0))
    t_type = str(data.get("type", "expense")).strip().lower()
    category = data.get("category", "").strip()
    frequency = data.get("frequency", "monthly").strip().lower()
    payment_method = data.get("payment_method", "UPI").strip()
    next_due_date = data.get("next_due_date", "").strip()
    notes = data.get("notes", "").strip()

    if not title or amount <= 0 or not category or not next_due_date:
        return jsonify({"success": False, "error": "All fields are required"}), 400

    rec_id = db.add_recurring_transaction(user_id, title, amount, t_type, category, frequency, payment_method, next_due_date, notes)
    return jsonify({"success": True, "id": rec_id, "message": "Recurring rule saved"}), 201

@app.route("/api/recurring/process", methods=["POST"])
@login_required
def api_process_recurring():
    user_id = session["user_id"]
    count = db.process_due_recurring_transactions(user_id)
    return jsonify({"success": True, "processed_count": count, "message": f"Processed {count} due transaction(s)"}), 200

@app.route("/api/recurring/<int:r_id>", methods=["DELETE"])
@login_required
def api_delete_recurring(r_id):
    user_id = session["user_id"]
    deleted = db.delete_recurring_transaction(user_id, r_id)
    if not deleted:
        return jsonify({"success": False, "error": "Recurring item not found"}), 404
    return jsonify({"success": True, "message": "Recurring rule removed"}), 200

@app.route("/api/analytics")
@login_required
def api_analytics():
    user_id = session["user_id"]
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    report = db.get_analytics_report(user_id, start_date, end_date)
    return jsonify({"success": True, "data": report}), 200

@app.route("/api/export/csv")
@login_required
def api_export_csv():
    user_id = session["user_id"]
    t_type = request.args.get("type", "")
    category = request.args.get("category", "")
    start_date = request.args.get("start_date", "")
    end_date = request.args.get("end_date", "")

    result = db.get_transactions(
        user_id=user_id,
        trans_type=t_type,
        category=category,
        start_date=start_date,
        end_date=end_date,
        limit=10000
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Date (YYYY-MM-DD)", "Title", "Type", "Category", "Amount (INR)", "Payment Method", "Notes", "Created At"])

    for tx in result["records"]:
        writer.writerow([
            tx["id"],
            tx["date"],
            tx["title"],
            tx["type"].capitalize(),
            tx["category"],
            f"{tx['amount']:.2f}",
            tx.get("payment_method", "UPI"),
            tx.get("notes", ""),
            tx.get("created_at", "")
        ])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=smartspend_transactions.csv"}
    )

if __name__ == "__main__":
    print("SmartSpend Flask Web App starting on http://127.0.0.1:5000 ...")
    app.run(host="0.0.0.0", port=5000, debug=True)
