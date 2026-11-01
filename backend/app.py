"""
Expense Tracker - Python Flask Backend
Provides RESTful API endpoints for transactions, categories, and financial analytics.
Utilizes SQLite with parameterized queries for persistent, secure data storage.
"""

import os
import re
from datetime import datetime
from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
import database

# Initialize Flask Application
app = Flask(__name__, static_folder="../dist", static_url_path="")
CORS(app)  # Enable Cross-Origin Resource Sharing for API consumers

# Ensure database tables are created on startup
database.init_db()

def validate_transaction_payload(data, is_update=False):
    """
    Validate input data for creating or updating a transaction.
    Returns (cleaned_data, error_message).
    """
    if not isinstance(data, dict):
        return None, "Request body must be a JSON object"
        
    title = data.get("title", "").strip() if isinstance(data.get("title"), str) else ""
    if not title:
        return None, "Title is required and cannot be empty"
    if len(title) > 100:
        return None, "Title cannot exceed 100 characters"
        
    # Amount validation
    amount_raw = data.get("amount")
    try:
        amount = float(amount_raw)
        if amount <= 0:
            return None, "Amount must be a positive number greater than zero"
        amount = round(amount, 2)
    except (ValueError, TypeError):
        return None, "Amount must be a valid positive number"
        
    # Type validation
    trans_type = str(data.get("type", "")).strip().lower()
    if trans_type not in ("income", "expense"):
        return None, "Transaction type must be either 'income' or 'expense'"
        
    # Category validation
    category = str(data.get("category", "")).strip()
    if not category:
        return None, "Category is required and cannot be empty"
    if len(category) > 50:
        return None, "Category cannot exceed 50 characters"
        
    # Date validation (YYYY-MM-DD)
    date_str = str(data.get("date", "")).strip()
    if not date_str:
        return None, "Date is required"
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return None, "Date must be in valid YYYY-MM-DD format"
        
    notes = str(data.get("notes", "")).strip()
    if len(notes) > 500:
        return None, "Notes cannot exceed 500 characters"
        
    return {
        "title": title,
        "amount": amount,
        "type": trans_type,
        "category": category,
        "date": date_str,
        "notes": notes
    }, None

@app.route("/api/summary", methods=["GET"])
def get_summary_endpoint():
    """Returns dynamic financial summaries: income, expenses, balance, breakdown, trends."""
    try:
        summary = database.get_summary()
        return jsonify({"success": True, "data": summary}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/categories", methods=["GET"])
def get_categories_endpoint():
    """Returns list of income and expense categories."""
    try:
        categories = database.get_categories()
        return jsonify({"success": True, "data": categories}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/transactions", methods=["GET"])
def get_transactions_endpoint():
    """
    Retrieve transactions with optional query filters:
    - search: string matching title or notes
    - type: 'income' | 'expense'
    - category: string category name
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - sort_by: 'date' | 'amount' | 'title' | 'category' | 'id'
    - sort_order: 'asc' | 'desc'
    """
    try:
        search = request.args.get("search", "")
        trans_type = request.args.get("type", "")
        category = request.args.get("category", "")
        start_date = request.args.get("start_date", "")
        end_date = request.args.get("end_date", "")
        sort_by = request.args.get("sort_by", "date")
        sort_order = request.args.get("sort_order", "desc")
        
        records = database.get_transactions(
            search=search,
            trans_type=trans_type,
            category=category,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
            sort_order=sort_order
        )
        return jsonify({"success": True, "data": records, "count": len(records)}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/transactions/<int:tx_id>", methods=["GET"])
def get_single_transaction(tx_id):
    """Retrieve details for a single transaction by primary key ID."""
    try:
        record = database.get_transaction_by_id(tx_id)
        if not record:
            return jsonify({"success": False, "error": f"Transaction with ID {tx_id} not found"}), 404
        return jsonify({"success": True, "data": record}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/transactions", methods=["POST"])
def add_transaction_endpoint():
    """Create a new income or expense transaction."""
    try:
        data = request.get_json(silent=True)
        cleaned, error = validate_transaction_payload(data)
        if error:
            return jsonify({"success": False, "error": error}), 400
            
        new_record = database.add_transaction(
            title=cleaned["title"],
            amount=cleaned["amount"],
            category=cleaned["category"],
            date=cleaned["date"],
            trans_type=cleaned["type"],
            notes=cleaned["notes"]
        )
        return jsonify({
            "success": True,
            "message": "Transaction recorded successfully",
            "data": new_record
        }), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/transactions/<int:tx_id>", methods=["PUT"])
def update_transaction_endpoint(tx_id):
    """Update an existing transaction by ID."""
    try:
        existing = database.get_transaction_by_id(tx_id)
        if not existing:
            return jsonify({"success": False, "error": f"Transaction with ID {tx_id} not found"}), 404
            
        data = request.get_json(silent=True)
        cleaned, error = validate_transaction_payload(data, is_update=True)
        if error:
            return jsonify({"success": False, "error": error}), 400
            
        updated = database.update_transaction(
            tx_id=tx_id,
            title=cleaned["title"],
            amount=cleaned["amount"],
            category=cleaned["category"],
            date=cleaned["date"],
            trans_type=cleaned["type"],
            notes=cleaned["notes"]
        )
        return jsonify({
            "success": True,
            "message": "Transaction updated successfully",
            "data": updated
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/transactions/<int:tx_id>", methods=["DELETE"])
def delete_transaction_endpoint(tx_id):
    """Delete a transaction by ID."""
    try:
        existing = database.get_transaction_by_id(tx_id)
        if not existing:
            return jsonify({"success": False, "error": f"Transaction with ID {tx_id} not found"}), 404
            
        deleted = database.delete_transaction(tx_id)
        if deleted:
            return jsonify({
                "success": True,
                "message": f"Transaction #{tx_id} deleted successfully"
            }), 200
        else:
            return jsonify({"success": False, "error": "Failed to delete record"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/reset", methods=["POST"])
def reset_database_endpoint():
    """Reset database to initial realistic demonstration sample data."""
    try:
        database.reset_database()
        return jsonify({"success": True, "message": "Database reset to sample records successfully"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/export/csv", methods=["GET"])
def export_csv_endpoint():
    """Export all transactions as a CSV formatted response."""
    try:
        transactions = database.get_transactions(sort_by="date", sort_order="desc")
        import io
        import csv
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Date", "Title", "Type", "Category", "Amount", "Notes", "Created At"])
        for t in transactions:
            writer.writerow([t["id"], t["date"], t["title"], t["type"], t["category"], f"{t['amount']:.2f}", t.get("notes", ""), t["created_at"]])
            
        output.seek(0)
        return app.response_class(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment;filename=expense_tracker_export.csv"}
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Fallback route to serve frontend index.html for SPA routing if running Flask standalone
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    dist_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
    if path != "" and os.path.exists(os.path.join(dist_dir, path)):
        return send_file(os.path.join(dist_dir, path))
    index_path = os.path.join(dist_dir, "index.html")
    if os.path.exists(index_path):
        return send_file(index_path)
    return "<h1>Expense Tracker API is running</h1><p>Visit /api/summary to test the REST API.</p>"

if __name__ == "__main__":
    print("Expense Tracker Flask Backend starting on http://127.0.0.1:5000 ...")
    app.run(host="0.0.0.0", port=5000, debug=True)
