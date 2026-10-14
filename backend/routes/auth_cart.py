from flask import Blueprint, request, jsonify
from db import get_db_connection
import bcrypt
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)

from email_service import (
    send_registration_otp_email,
    send_forgot_password_otp_email,
    send_password_reset_success_email,
)
from otp_service import generate_otp, verify_otp

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
        query = """ SELECT u.user_id, u.full_name, u.email, u.password_hash, u.role_id, 
                           u.assigned_city_id, c.city_name, c.hub_name
                    FROM users u
                    LEFT JOIN texas_cities c ON u.assigned_city_id = c.city_id
                    WHERE u.email = %s OR u.full_name = %s
                    LIMIT 1"""
        cursor.execute(query, (identifier, identifier))
        user = cursor.fetchone()

        # 3. Check if user exists and verify hashed password
        if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            role_id = user.get("role_id")
            assigned_city_id = user.get("assigned_city_id")
            city_name = user.get("city_name")
            hub_name = user.get("hub_name")

            access_token = create_access_token(
                identity=str(user["user_id"]),
                additional_claims={
                    "username": user["full_name"],
                    "role_id": role_id,
                    "email": user["email"],
                    "assigned_city_id": assigned_city_id,
                    "city_name": city_name,
                    "hub_name": hub_name
                }
            )
            return jsonify({
                "message": "Login successful",
                "access_token": access_token,
                "user": {
                    "id": user["user_id"], 
                    "username": user["full_name"],
                    "email": user["email"],
                    "role_id": role_id,
                    "assigned_city_id": assigned_city_id,
                    "city_name": city_name,
                    "hub_name": hub_name
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
        "user_id": int(user_id) if user_id and str(user_id).isdigit() else user_id,
        "username": claims.get("username"),
        "role_id": claims.get("role_id"),
        "email": claims.get("email"),
        "assigned_city_id": claims.get("assigned_city_id"),
        "city_name": claims.get("city_name"),
        "hub_name": claims.get("hub_name")
    }), 200

@auth_cart_bp.route('/send-register-otp', methods=['POST'])
def send_register_otp():
    """Generates and emails a 6-digit verification code to complete new registration."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    username = (data.get('username') or '').strip()

    if not email:
        return jsonify({"message": "Email is required."}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT user_id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"message": "This email is already registered."}), 409

        if username:
            cursor.execute("SELECT user_id FROM users WHERE full_name = %s", (username,))
            if cursor.fetchone():
                return jsonify({"message": "This username is already taken."}), 409

        otp_code = generate_otp(email, purpose="register")
        send_registration_otp_email(to_email=email, username=username or 'Customer', otp_code=otp_code)

        return jsonify({
            "status": "success",
            "message": f"Verification code sent to {email}."
        }), 200
    except Exception as e:
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@auth_cart_bp.route('/register', methods=['POST'])
def register():
    # 1. Read JSON payload sent from fetch()
    data = request.get_json()
    if not data:
        return jsonify({"message": "Missing request body"}), 400

    username = (data.get('username') or '').strip()
    password = data.get('password')
    email    = (data.get('email') or '').strip().lower()
    otp      = (data.get('otp') or '').strip()
    role_id  = 1
    raw_city = data.get('assigned_city_id') or data.get('city_id') or 1
    try:
        assigned_city_id = int(raw_city)
    except (ValueError, TypeError):
        assigned_city_id = 1

    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400

    # Verification OTP is required
    if not otp:
        return jsonify({"message": "Verification code (OTP) is required. Please request a verification code."}), 400

    is_valid, err_msg = verify_otp(email, otp, purpose="register")
    if not is_valid:
        return jsonify({"message": err_msg}), 400

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

        # Fetch city / hub info
        cursor.execute("SELECT city_name, hub_name FROM texas_cities WHERE city_id = %s", (assigned_city_id,))
        city_info = cursor.fetchone() or {"city_name": "Dallas", "hub_name": "DFW North Distribution Hub"}

        query = """
                INSERT INTO users(
                    role_id, full_name, email, password_hash, assigned_city_id
                ) VALUES(%s, %s, %s, %s, %s)
                """
        
        cursor.execute(query, (
            role_id, username, email, password_hash, assigned_city_id
        ))
        conn.commit()
        new_user_id = cursor.lastrowid

        access_token = create_access_token(
            identity=str(new_user_id),
            additional_claims={
                "username": username,
                "role_id": role_id,
                "email": email,
                "assigned_city_id": assigned_city_id,
                "city_name": city_info.get("city_name"),
                "hub_name": city_info.get("hub_name")
            }
        )

        return jsonify({
            "message": "Registration successful",
            "access_token": access_token,
            "user": {
                "id": new_user_id,
                "username": username,
                "email": email,
                "role_id": role_id,
                "assigned_city_id": assigned_city_id,
                "city_name": city_info.get("city_name"),
                "hub_name": city_info.get("hub_name")
            }
        }), 201
        
    except Exception as e:
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@auth_cart_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Generates and emails an OTP code for password reset."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()

    if not email:
        return jsonify({"message": "Email is required."}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT user_id, full_name, email FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({
                "status": "error",
                "message": "No account found with this email address."
            }), 404

        otp_code = generate_otp(email, purpose="forgot_password")
        send_forgot_password_otp_email(to_email=email, username=user.get('full_name') or 'Customer', otp_code=otp_code)

        return jsonify({
            "status": "success",
            "message": f"Password reset verification code sent to {email}."
        }), 200
    except Exception as e:
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@auth_cart_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Verifies reset OTP, updates the user's password hash, and sends confirmation email."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    otp = (data.get('otp') or '').strip()
    new_password = data.get('new_password')

    if not email or not otp or not new_password:
        return jsonify({"message": "Email, verification OTP, and new password are required."}), 400

    if len(new_password) < 6:
        return jsonify({"message": "New password must be at least 6 characters long."}), 400

    is_valid, err_msg = verify_otp(email, otp, purpose="forgot_password")
    if not is_valid:
        return jsonify({"message": err_msg}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT user_id, full_name, email FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"message": "User account not found."}), 404

        salt = bcrypt.gensalt()
        new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), salt).decode('utf-8')

        cursor.execute("UPDATE users SET password_hash = %s WHERE email = %s", (new_password_hash, email))
        conn.commit()

        # Send security notification
        send_password_reset_success_email(to_email=email, username=user.get('full_name') or 'Customer')

        return jsonify({
            "status": "success",
            "message": "Your password has been successfully reset. You can now log in."
        }), 200
    except Exception as e:
        if conn:
            conn.rollback()
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
            SELECT u.user_id, u.full_name, u.email, u.role_id, u.assigned_city_id,
                   c.city_name, c.hub_name
            FROM users u
            LEFT JOIN texas_cities c ON u.assigned_city_id = c.city_id
            WHERE u.role_id IN (2, 3, 4)
            ORDER BY u.role_id DESC, u.user_id ASC
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
    """Allow ONLY System Administrators (role 3 or 4) to onboard new staff and assign warehouse managers."""
    claims = get_jwt()
    caller_role = claims.get('role_id')
    if caller_role not in (3, 4):
        return jsonify({"message": "Access denied. Only System Administrators can onboard staff members."}), 403

    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip()
    password = (data.get('password') or '').strip()
    role_id = data.get('role_id')
    raw_city = data.get('assigned_city_id')

    if not username or not email or not password or not role_id:
        return jsonify({"message": "All fields (Full Name / Username, Email, Password, Role) are required"}), 400

    try:
        role_id = int(role_id)
    except (ValueError, TypeError):
        return jsonify({"message": "Invalid role ID"}), 400

    if role_id not in (2, 3, 4):
        return jsonify({"message": "Staff role must be Warehouse Manager (2) or System Administrator (3/4)"}), 400

    assigned_city_id = None
    if role_id == 2:
        if not raw_city:
            return jsonify({"message": "Warehouse Managers must be assigned to a specific regional warehouse / city."}), 400
        try:
            assigned_city_id = int(raw_city)
        except (ValueError, TypeError):
            return jsonify({"message": "Invalid warehouse city ID"}), 400

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

        # Fetch city / hub info if manager
        city_name = None
        hub_name = None
        if assigned_city_id:
            cursor.execute("SELECT city_name, hub_name FROM texas_cities WHERE city_id = %s", (assigned_city_id,))
            c_row = cursor.fetchone()
            if c_row:
                city_name = c_row['city_name']
                hub_name = c_row['hub_name']

        query = """
            INSERT INTO users (role_id, full_name, email, password_hash, assigned_city_id)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(query, (role_id, username, email, password_hash, assigned_city_id))
        conn.commit()
        new_user_id = cursor.lastrowid

        return jsonify({
            "message": f"Successfully registered new staff member as {'System Administrator' if role_id == 3 else f'Warehouse Manager for {hub_name} ({city_name})'}.",
            "user": {
                "id": new_user_id,
                "username": username,
                "email": email,
                "role_id": role_id,
                "assigned_city_id": assigned_city_id,
                "city_name": city_name,
                "hub_name": hub_name
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
        # 1. If product_id is provided, verify whether variant_id belongs to that product.
        # If variant_id is missing or belongs to a different product, resolve the true default variant for this product!
        if product_id:
            resolved_variant = None
            if variant_id:
                cursor.execute(
                    "SELECT variant_id FROM product_variants WHERE variant_id = %s AND product_id = %s",
                    (variant_id, product_id)
                )
                if cursor.fetchone():
                    resolved_variant = variant_id

            if not resolved_variant:
                cursor.execute(
                    "SELECT variant_id FROM product_variants WHERE product_id = %s ORDER BY variant_id ASC LIMIT 1",
                    (product_id,)
                )
                v_match = cursor.fetchone()
                if v_match:
                    resolved_variant = v_match['variant_id']

            if resolved_variant:
                variant_id = resolved_variant
            elif not variant_id:
                return jsonify({"message": f"No active product variants found for product ID {product_id}"}), 404

        # 2. If only variant_id was provided (no product_id):
        if variant_id:
            cursor.execute("SELECT variant_id FROM product_variants WHERE variant_id = %s", (variant_id,))
            if not cursor.fetchone():
                # Check if caller mistakenly passed product_id as variant_id
                cursor.execute("SELECT variant_id FROM product_variants WHERE product_id = %s ORDER BY variant_id ASC LIMIT 1", (variant_id,))
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

        # Get existing cart item
        cursor.execute(
            "SELECT variant_id, quantity FROM cart_items WHERE cart_item_id = %s AND cart_id = %s",
            (cart_item_id, cart_id)
        )
        existing = cursor.fetchone()
        if not existing:
            return jsonify({"message": "Cart item not found"}), 404

        old_qty = int(existing['quantity'])
        variant_id = existing['variant_id']
        diff = quantity - old_qty

        if quantity <= 0:
            # Restore all stock to inventory and delete item
            cursor.execute(
                "UPDATE inventory SET stock_quantity = stock_quantity + %s WHERE variant_id = %s",
                (old_qty, variant_id)
            )
            cursor.execute("DELETE FROM cart_items WHERE cart_item_id = %s AND cart_id = %s", (cart_item_id, cart_id))
        else:
            if diff > 0:
                # Need more items: check stock
                cursor.execute("SELECT stock_quantity FROM inventory WHERE variant_id = %s FOR UPDATE", (variant_id,))
                inv_row = cursor.fetchone()
                curr_stock = int(inv_row['stock_quantity']) if inv_row else 0
                if curr_stock < diff:
                    return jsonify({"message": f"Insufficient stock. Only {curr_stock} additional unit(s) available."}), 400

                cursor.execute(
                    "UPDATE inventory SET stock_quantity = stock_quantity - %s WHERE variant_id = %s",
                    (diff, variant_id)
                )
            elif diff < 0:
                # Reduce items: restore surplus back to inventory
                cursor.execute(
                    "UPDATE inventory SET stock_quantity = stock_quantity + %s WHERE variant_id = %s",
                    (-diff, variant_id)
                )

            cursor.execute(
                "UPDATE cart_items SET quantity = %s WHERE cart_item_id = %s AND cart_id = %s",
                (quantity, cart_item_id, cart_id)
            )

        conn.commit()
        return jsonify({"message": "Cart item updated successfully"}), 200

    except Exception as e:
        conn.rollback()
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

        # Get existing cart item to restore inventory
        cursor.execute(
            "SELECT variant_id, quantity FROM cart_items WHERE cart_item_id = %s AND cart_id = %s",
            (cart_item_id, cart_id)
        )
        item = cursor.fetchone()

        if item:
            # Restore stock to inventory table
            cursor.execute(
                "UPDATE inventory SET stock_quantity = stock_quantity + %s WHERE variant_id = %s",
                (item['quantity'], item['variant_id'])
            )
            cursor.execute("DELETE FROM cart_items WHERE cart_item_id = %s AND cart_id = %s", (cart_item_id, cart_id))
            conn.commit()
            return jsonify({"message": "Item removed from cart and stock restored"}), 200
        else:
            return jsonify({"message": "Cart item not found"}), 404

    except Exception as e:
        conn.rollback()
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

        # Fetch all items to restore stock to inventory table
        cursor.execute("SELECT variant_id, quantity FROM cart_items WHERE cart_id = %s", (cart_id,))
        items = cursor.fetchall()
        for item in items:
            cursor.execute(
                "UPDATE inventory SET stock_quantity = stock_quantity + %s WHERE variant_id = %s",
                (item['quantity'], item['variant_id'])
            )

        cursor.execute("DELETE FROM cart_items WHERE cart_id = %s", (cart_id,))
        conn.commit()
        return jsonify({"message": "Cart cleared and stock restored successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


