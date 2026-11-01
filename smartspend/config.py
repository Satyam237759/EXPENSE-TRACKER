"""
SmartSpend - Configuration Settings
"""

import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Base application configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'smartspend-super-secret-production-key-2026')
    DATABASE_PATH = os.path.join(BASE_DIR, 'instance', 'smartspend.db')
    SESSION_COOKIE_NAME = 'smartspend_session'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 86400 * 7  # 7 days
    CURRENCY_SYMBOL = '₹'
    CURRENCY_CODE = 'INR'
