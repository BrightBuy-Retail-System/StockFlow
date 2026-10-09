from flask import Blueprint, request, jsonify
from db import get_db_connection
import bcrypt
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)

auth_cart_bp = Blueprint('auth_cart', __name__)

@auth_cart_bp.route('/login', methods=['POST'])
def login():
    # 1. Read JSON payload sent from fetch()
    data = request.get_json()
    if not data:
        return jsonify({"message": "Missing request body"}), 400

    identifier = (data.get('email') or data.get('username') or '').strip()
    password = data.get('password')

    if not (identifier) or not password:
        return jsonify({"message": "Email and password are required"}), 400

    # 2. Query database for user
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        query = """ SELECT user_id, full_name, email, password_hash, role_id
                    FROM users
                    WHERE email = %s OR full_name = %s
                    LIMIT 1"""
        cursor.execute(query, (identifier, identifier))
        user = cursor.fetchone()

        # 3. Check if user exists and verify hashed password
        if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            role_id = user.get("role_id")

            access_token = create_access_token(
                identity=str(user["user_id"]),
                additional_claims={
                    "username": user["full_name"],
                    "role_id": role_id,
                    "email": user["email"]
                }
            )
            return jsonify({
                "message": "Login successful",
                "access_token": access_token,
                "user": {
                    "id": user["user_id"], 
                    "username": user["full_name"],
                    "role_id": role_id #role_id
                }
            }), 200
        else:
            return jsonify({"message": "Invalid email or password"}), 401

    except Exception as e:
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

@auth_cart_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    claims = get_jwt()
    return jsonify({
        "user_id": int(user_id) if user_id and user_id.isdigit() else user_id,
        "username": claims.get("username"),
        "role_id": claims.get("role_id"),
        "email": claims.get("email")
    }), 200

@auth_cart_bp.route('/register', methods=['POST'])
def register():
    # 1. Read JSON payload sent from fetch()
    data = request.get_json()
    if not data:
        return jsonify({"message": "Missing request body"}), 400

    username = data.get('username')
    password = data.get('password')
    email    = data.get('email')
    role_id  = 1

    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400

    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    # 2. Query database for user
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        check_email = "SELECT email FROM users WHERE email = %s"
        cursor.execute(check_email, (email,))
        if cursor.fetchone():
            return jsonify({"message": "This email is already exists"}), 409

        check_username = "SELECT full_name FROM users WHERE full_name = %s"
        cursor.execute(check_username, (username,))
        if cursor.fetchone():
            return jsonify({"message": "This username already exists"}), 409

        query = """
                INSERT INTO users(
                    role_id, full_name, email, password_hash
                ) VALUES(%s, %s, %s, %s)
                """
        
        cursor.execute(query, (
            role_id, username, email, password_hash,
        ))
        conn.commit()
        new_user_id = cursor.lastrowid

        access_token = create_access_token(
            identity=str(new_user_id),
            additional_claims={
                "username": username,
                "role_id": role_id,
                "email": email
            }
        )

        return jsonify({
            "message": "Registration successful",
            "access_token": access_token,
            "user": {"id": new_user_id, "username": username, "role_id": role_id}
        }), 201
        
    except Exception as e:
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@auth_cart_bp.route('/staff', methods=['GET'])
@jwt_required()
def get_staff_members():
    """Retrieve all internal staff accounts (Managers and System Administrators)."""
    claims = get_jwt()
    caller_role = claims.get('role_id')
    if caller_role not in (2, 3, 4):
        return jsonify({"message": "Access denied. Managers and Administrators only."}), 403

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT user_id, full_name, email, role_id
            FROM users
            WHERE role_id IN (2, 3, 4)
            ORDER BY role_id DESC, user_id ASC
        """
        cursor.execute(query)
        staff_members = cursor.fetchall()
        return jsonify({"staff": staff_members}), 200
    except Exception as e:
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@auth_cart_bp.route('/staff/register', methods=['POST'])
@jwt_required()
def register_staff_member():
    """Allow Managers (role 2) and System Administrators (role 3) to onboard new staff."""
    claims = get_jwt()
    caller_role = claims.get('role_id')
    if caller_role not in (2, 3, 4):
        return jsonify({"message": "Access denied. Only Managers and Administrators can register staff."}), 403

    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip()
    password = (data.get('password') or '').strip()
    role_id = data.get('role_id')

    if not username or not email or not password or not role_id:
        return jsonify({"message": "All fields (Full Name / Username, Email, Password, Role) are required"}), 400

    try:
        role_id = int(role_id)
    except (ValueError, TypeError):
        return jsonify({"message": "Invalid role ID"}), 400

    if role_id not in (2, 3, 4):
        return jsonify({"message": "Staff role must be Store Manager (2) or System Administrator (3/4)"}), 400

    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check if email is already taken
        cursor.execute("SELECT email FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"message": "This corporate email is already registered."}), 409

        # Check if username / full_name is already taken
        cursor.execute("SELECT full_name FROM users WHERE full_name = %s", (username,))
        if cursor.fetchone():
            return jsonify({"message": "This staff name / username already exists."}), 409

        query = """
            INSERT INTO users (role_id, full_name, email, password_hash)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(query, (role_id, username, email, password_hash))
        conn.commit()
        new_user_id = cursor.lastrowid

        return jsonify({
            "message": f"Successfully registered new staff member as {'System Administrator' if role_id == 3 else 'Store Executive & Manager'}.",
            "user": {
                "id": new_user_id,
                "username": username,
                "email": email,
                "role_id": role_id
            }
        }), 201

    except Exception as e:
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


# ----------------------------------------------------
# CART ENDPOINTS (Member 2: Auth, Sessions & Cart)
# ----------------------------------------------------

def _get_or_create_cart(cursor, conn, user_id):
    """Helper to retrieve existing user cart or create a new one."""
    cursor.execute("SELECT cart_id FROM carts WHERE user_id = %s", (user_id,))
    cart = cursor.fetchone()
    if cart:
        return cart['cart_id']
    
    cursor.execute("INSERT INTO carts (user_id) VALUES (%s)", (user_id,))
    conn.commit()
    return cursor.lastrowid


@auth_cart_bp.route('/cart', methods=['GET'])
@jwt_required()
def get_user_cart():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cart_id = _get_or_create_cart(cursor, conn, user_id)

        query = """
            SELECT 
                ci.cart_item_id,
                ci.variant_id,
                ci.quantity,
                pv.sku,
                pv.attribute_name,
                pv.attribute_value,
                p.product_id,
                p.title AS product_name,
                p.description,
                COALESCE(pv.price_override, p.base_price) AS unit_price,
                (COALESCE(pv.price_override, p.base_price) * ci.quantity) AS total_price
            FROM cart_items ci
            JOIN product_variants pv ON ci.variant_id = pv.variant_id
            JOIN products p ON pv.product_id = p.product_id
            WHERE ci.cart_id = %s
            ORDER BY ci.cart_item_id DESC
        """
        cursor.execute(query, (cart_id,))
        items = cursor.fetchall()

        item_count = sum(item['quantity'] for item in items) if items else 0
        subtotal = sum(float(item['total_price']) for item in items) if items else 0.0

        return jsonify({
            "cart_id": cart_id,
            "items": items,
            "item_count": item_count,
            "subtotal": round(subtotal, 2)
        }), 200

    except Exception as e:
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@auth_cart_bp.route('/cart/add', methods=['POST'])
@jwt_required()
def add_to_cart():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    variant_id = data.get('variant_id')
    product_id = data.get('product_id')
    quantity = int(data.get('quantity', 1))

    if quantity <= 0:
        return jsonify({"message": "Valid positive quantity is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # If variant_id is not directly supplied but product_id is, resolve first variant of that product
        if not variant_id and product_id:
            cursor.execute("SELECT variant_id FROM product_variants WHERE product_id = %s LIMIT 1", (product_id,))
            v_match = cursor.fetchone()
            if v_match:
                variant_id = v_match['variant_id']

        # If variant_id is supplied, ensure it exists in product_variants.
        # If it doesn't match a variant_id, check if caller passed product_id as variant_id.
        if variant_id:
            cursor.execute("SELECT variant_id FROM product_variants WHERE variant_id = %s", (variant_id,))
            if not cursor.fetchone():
                cursor.execute("SELECT variant_id FROM product_variants WHERE product_id = %s LIMIT 1", (variant_id,))
                fallback_variant = cursor.fetchone()
                if fallback_variant:
                    variant_id = fallback_variant['variant_id']
                else:
                    return jsonify({"message": f"No active product variant found for ID {variant_id}"}), 404
        else:
            return jsonify({"message": "Valid variant_id or product_id is required"}), 400

        cart_id = _get_or_create_cart(cursor, conn, user_id)

        # Check if this variant is already in the cart
        cursor.execute(
            "SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = %s AND variant_id = %s",
            (cart_id, variant_id)
        )
        existing_item = cursor.fetchone()

        if existing_item:
            new_qty = existing_item['quantity'] + quantity
            cursor.execute(
                "UPDATE cart_items SET quantity = %s WHERE cart_item_id = %s",
                (new_qty, existing_item['cart_item_id'])
            )
        else:
            cursor.execute(
                "INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (%s, %s, %s)",
                (cart_id, variant_id, quantity)
            )

        conn.commit()
        return jsonify({
            "message": "Item added to cart successfully",
            "cart_id": cart_id,
            "variant_id": variant_id,
            "quantity": quantity
        }), 200

    except Exception as e:
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@auth_cart_bp.route('/cart/items/<int:cart_item_id>', methods=['PUT'])
@jwt_required()
def update_cart_item(cart_item_id):
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    quantity = int(data.get('quantity', 1))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cart_id = _get_or_create_cart(cursor, conn, user_id)

        if quantity <= 0:
            cursor.execute("DELETE FROM cart_items WHERE cart_item_id = %s AND cart_id = %s", (cart_item_id, cart_id))
        else:
            cursor.execute(
                "UPDATE cart_items SET quantity = %s WHERE cart_item_id = %s AND cart_id = %s",
                (quantity, cart_item_id, cart_id)
            )

        conn.commit()
        return jsonify({"message": "Cart item updated successfully"}), 200

    except Exception as e:
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@auth_cart_bp.route('/cart/items/<int:cart_item_id>', methods=['DELETE'])
@jwt_required()
def delete_cart_item(cart_item_id):
    user_id = get_jwt_identity()
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cart_id = _get_or_create_cart(cursor, conn, user_id)
        cursor.execute("DELETE FROM cart_items WHERE cart_item_id = %s AND cart_id = %s", (cart_item_id, cart_id))
        conn.commit()
        return jsonify({"message": "Item removed from cart"}), 200

    except Exception as e:
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@auth_cart_bp.route('/cart/clear', methods=['DELETE'])
@jwt_required()
def clear_cart():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cart_id = _get_or_create_cart(cursor, conn, user_id)
        cursor.execute("DELETE FROM cart_items WHERE cart_id = %s", (cart_id,))
        conn.commit()
        return jsonify({"message": "Cart cleared successfully"}), 200

    except Exception as e:
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

