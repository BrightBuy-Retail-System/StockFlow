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
    send_staff_welcome_email,
    send_staff_credentials_reset_email,
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
                    "user_id": user["user_id"],
                    "username": user["full_name"],
                    "full_name": user["full_name"],
                    "email": user["email"],
                    "role_id": role_id
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
    uid = int(user_id) if user_id and str(user_id).isdigit() else user_id
    return jsonify({
        "id": uid,
        "user_id": uid,
        "username": claims.get("username"),
        "full_name": claims.get("username"),
        "role_id": claims.get("role_id"),
        "email": claims.get("email")
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
            "user": {
                "id": new_user_id,
                "user_id": new_user_id,
                "username": username,
                "full_name": username,
                "email": email,
                "role_id": role_id
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
    """Allow Managers (role 2) and System Administrators (role 3/4) to onboard new staff."""
    claims = get_jwt()
    caller_role = claims.get('role_id')
    if caller_role not in (2, 3, 4):
        return jsonify({"message": "Access denied. Only Managers and Administrators can register staff."}), 403

    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or 'password123'
    role_id = data.get('role_id')

    if not username or not email or not role_id:
        return jsonify({"message": "Full Name / Username, Corporate Email, and Role are required"}), 400

    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400

    try:
        role_id = int(role_id)
    except (ValueError, TypeError):
        return jsonify({"message": "Invalid role ID"}), 400

    if role_id not in (2, 3, 4):
        return jsonify({"message": "Staff role must be Store Manager (2) or System Administrator (3/4)"}), 400

    if caller_role == 2 and role_id in (3, 4):
        return jsonify({"message": "Store Managers cannot register Administrators. Admin role required."}), 403

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

        # Dispatch Welcome Email to newly onboarded staff member
        role_label = 'System Administrator' if role_id in (3, 4) else 'Store Executive & Manager'
        email_sent = False
        email_note = ""
        try:
            email_sent, email_note = send_staff_welcome_email(
                to_email=email,
                username=username,
                role_name=role_label,
                temp_password=password,
                sync=True
            )
        except Exception as exc:
            email_sent = False
            email_note = f"Dispatch error: {str(exc)}"

        return jsonify({
            "message": f"Successfully registered new staff member as {role_label}.",
            "user": {
                "id": new_user_id,
                "username": username,
                "email": email,
                "role_id": role_id
            },
            "credentials": {
                "username": username,
                "email": email,
                "temp_password": password,
                "role_title": role_label
            },
            "email_dispatched": email_sent,
            "email_message": email_note
        }), 201

    except Exception as e:
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@auth_cart_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """
    Allows any authenticated user (Customer, Manager, System Admin) to update their account password.
    Requires current password verification and validates new password complexity.
    Dispatches a confirmation email upon successful update.
    """
    current_user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    current_password = (data.get('current_password') or '').strip()
    new_password = (data.get('new_password') or '').strip()
    confirm_password = (data.get('confirm_password') or '').strip()

    if not current_password or not new_password:
        return jsonify({"message": "Current password and new password are required."}), 400

    if len(new_password) < 6:
        return jsonify({"message": "New password must be at least 6 characters long."}), 400

    if confirm_password and new_password != confirm_password:
        return jsonify({"message": "New password and confirmation do not match."}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT user_id, full_name, email, password_hash FROM users WHERE user_id = %s", (current_user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"message": "User account not found."}), 404

        # Verify current password matches hash in DB
        if not bcrypt.checkpw(current_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return jsonify({"message": "Current password is incorrect."}), 401

        # Prevent setting identical password
        if bcrypt.checkpw(new_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return jsonify({"message": "New password cannot be identical to your current password."}), 400

        salt = bcrypt.gensalt()
        new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), salt).decode('utf-8')

        cursor.execute("UPDATE users SET password_hash = %s WHERE user_id = %s", (new_password_hash, current_user_id))
        conn.commit()

        # Send confirmation email
        try:
            send_password_reset_success_email(
                to_email=user['email'],
                username=user.get('full_name') or 'Valued User'
            )
        except Exception:
            pass

        return jsonify({
            "status": "success",
            "message": "Your password has been changed successfully. A security confirmation email was sent."
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@auth_cart_bp.route('/staff/<int:staff_id>/reset-password', methods=['POST'])
@jwt_required()
def admin_reset_staff_password(staff_id):
    """
    Allows System Administrators (role 3 & 4) to reset the password for any staff member or manager.
    Updates the password hash and sends an email notification with the new temporary credentials.
    """
    claims = get_jwt()
    caller_role = claims.get('role_id')
    if caller_role not in (3, 4):
        return jsonify({"message": "Access denied. Only System Administrators can reset staff credentials."}), 403

    data = request.get_json() or {}
    new_password = (data.get('new_password') or '').strip()

    if not new_password or len(new_password) < 6:
        return jsonify({"message": "New temporary password must be at least 6 characters long."}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT user_id, full_name, email, role_id FROM users WHERE user_id = %s", (staff_id,))
        target_user = cursor.fetchone()
        if not target_user:
            return jsonify({"message": f"Staff member #{staff_id} not found."}), 404

        salt = bcrypt.gensalt()
        new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), salt).decode('utf-8')

        cursor.execute("UPDATE users SET password_hash = %s WHERE user_id = %s", (new_password_hash, staff_id))
        conn.commit()

        # Send credentials email to the staff member
        try:
            send_staff_credentials_reset_email(
                to_email=target_user['email'],
                username=target_user['full_name'],
                new_temp_password=new_password
            )
        except Exception:
            pass

        return jsonify({
            "status": "success",
            "message": f"Password for {target_user['full_name']} ({target_user['email']}) has been successfully updated."
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@auth_cart_bp.route('/staff/<int:staff_id>', methods=['DELETE'])
@jwt_required()
def delete_staff_member(staff_id):
    """
    Allow System Administrators (role 3 or 4) to remove/decommission a corporate staff account.
    Prevents self-deletion.
    """
    claims = get_jwt()
    caller_role = claims.get('role_id')
    current_user_id = int(get_jwt_identity())

    if caller_role not in (3, 4):
        return jsonify({"message": "Access denied. Only System Administrators can remove staff accounts."}), 403

    if staff_id == current_user_id:
        return jsonify({"message": "Security Violation: You cannot remove your own active administrator account."}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check target user
        cursor.execute("SELECT user_id, full_name, email, role_id FROM users WHERE user_id = %s", (staff_id,))
        staff_row = cursor.fetchone()
        if not staff_row:
            return jsonify({"message": f"Staff member #{staff_id} not found."}), 404

        if staff_row['role_id'] not in (2, 3, 4):
            return jsonify({"message": "Target account is not an internal corporate staff member."}), 400

        # Check for historical orders
        cursor.execute("SELECT COUNT(*) AS order_count FROM orders WHERE user_id = %s", (staff_id,))
        res_orders = cursor.fetchone()
        if res_orders and res_orders['order_count'] > 0:
            return jsonify({
                "message": f"Cannot permanently remove {staff_row['full_name']} because they have {res_orders['order_count']} linked transaction records."
            }), 400

        # Clean up cart items and cart
        cursor.execute("""
            DELETE FROM cart_items 
            WHERE cart_id IN (SELECT cart_id FROM carts WHERE user_id = %s)
        """, (staff_id,))
        cursor.execute("DELETE FROM carts WHERE user_id = %s", (staff_id,))

        # Clean up audit logs
        try:
            cursor.execute("DELETE FROM audit_logs WHERE user_id = %s", (staff_id,))
        except Exception:
            pass

        # Delete the user record
        cursor.execute("DELETE FROM users WHERE user_id = %s", (staff_id,))
        conn.commit()

        return jsonify({
            "status": "success",
            "message": f"Staff account for {staff_row['full_name']} ({staff_row['email']}) has been successfully removed."
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
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
                p.image_url,
                COALESCE(i.stock_quantity, 0) AS available_stock,
                COALESCE(pv.price_override, p.base_price) AS unit_price,
                (COALESCE(pv.price_override, p.base_price) * ci.quantity) AS total_price
            FROM cart_items ci
            JOIN product_variants pv ON ci.variant_id = pv.variant_id
            JOIN products p ON pv.product_id = p.product_id
            LEFT JOIN inventory i ON pv.variant_id = i.variant_id
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
    try:
        quantity = int(data.get('quantity', 1))
    except (ValueError, TypeError):
        return jsonify({"message": "Valid positive quantity is required"}), 400

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

        # Verify active product status and stock
        cursor.execute("""
            SELECT p.is_active, COALESCE(i.stock_quantity, 0) AS stock_quantity
            FROM product_variants pv
            JOIN products p ON pv.product_id = p.product_id
            LEFT JOIN inventory i ON pv.variant_id = i.variant_id
            WHERE pv.variant_id = %s
        """, (variant_id,))
        var_info = cursor.fetchone()
        if not var_info:
            return jsonify({"message": "Variant not found"}), 404
        if var_info['is_active'] != 1:
            return jsonify({"message": "Product is inactive and cannot be added to cart"}), 400

        cart_id = _get_or_create_cart(cursor, conn, user_id)

        # Check if this variant is already in the cart
        cursor.execute(
            "SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = %s AND variant_id = %s",
            (cart_id, variant_id)
        )
        existing_item = cursor.fetchone()
        existing_qty = existing_item['quantity'] if existing_item else 0
        new_qty = existing_qty + quantity

        if new_qty > var_info['stock_quantity']:
            return jsonify({
                "message": f"Requested quantity ({new_qty}) exceeds available stock ({var_info['stock_quantity']})",
                "available_stock": var_info['stock_quantity']
            }), 400

        if existing_item:
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
    try:
        quantity = int(data.get('quantity', 1))
    except (ValueError, TypeError):
        return jsonify({"message": "Valid quantity is required"}), 400

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

        variant_id = existing['variant_id']

        if quantity <= 0:
            cursor.execute("DELETE FROM cart_items WHERE cart_item_id = %s AND cart_id = %s", (cart_item_id, cart_id))
        else:
            # Check variant active and stock availability
            cursor.execute("""
                SELECT p.is_active, COALESCE(i.stock_quantity, 0) AS stock_quantity
                FROM product_variants pv
                JOIN products p ON pv.product_id = p.product_id
                LEFT JOIN inventory i ON pv.variant_id = i.variant_id
                WHERE pv.variant_id = %s
            """, (variant_id,))
            var_info = cursor.fetchone()
            if not var_info:
                return jsonify({"message": "Variant not found"}), 404
            if var_info['is_active'] != 1:
                return jsonify({"message": "Product is inactive"}), 400

            curr_stock = int(var_info['stock_quantity'])
            if quantity > curr_stock:
                return jsonify({
                    "message": f"Requested quantity ({quantity}) exceeds available stock ({curr_stock})",
                    "available_stock": curr_stock
                }), 400

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

        cursor.execute("DELETE FROM cart_items WHERE cart_item_id = %s AND cart_id = %s", (cart_item_id, cart_id))
        if cursor.rowcount == 0:
            return jsonify({"message": "Cart item not found"}), 404

        conn.commit()
        return jsonify({"message": "Item removed from cart"}), 200

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

        cursor.execute("DELETE FROM cart_items WHERE cart_id = %s", (cart_id,))
        conn.commit()
        return jsonify({"message": "Cart cleared successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


