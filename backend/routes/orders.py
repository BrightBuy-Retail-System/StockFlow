from flask import Blueprint, jsonify

orders_bp = Blueprint('orders', __name__)

@orders_bp.route('/ping', methods=['GET'])
def ping():
    return jsonify({
        "status": "healthy",
        "module": "orders"
    }), 200