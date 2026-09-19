from flask import Blueprint, jsonify

orders_bp = Blueprint('orders', __name__)

@orders_bp.route('/ping', methods=['GET'])
def ping():
    return jsonify({
        "status": "healthy",
        "module": "orders"
    }), 200

@orders_bp.route('/<int:order_id>', methods=['GET'])
def get_order_by_id(order_id):
    return jsonify({
        "status": "success",
        "message": f"Route reached for Order ID: {order_id}",
        "order_id": order_id
    }), 200