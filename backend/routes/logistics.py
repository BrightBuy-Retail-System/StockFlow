from datetime import date, timedelta

from flask import Blueprint, jsonify, request
from db import get_db_connection
logistics_bp = Blueprint('logistics', __name__)
OUT_OF_STOCK_PENALTY_DAYS = 3
