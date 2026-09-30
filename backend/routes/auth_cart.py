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

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    # 2. Query database for user
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        query = "SELECT user_id, full_name, password_hash, role_id FROM users WHERE email = %s"
        cursor.execute(query, (email,))
        user = cursor.fetchone()

        # 3. Check if user exists and verify hashed password
        if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            role_id = user.get("role_id")
            access_token = create_access_token(
                identity=str(user["user_id"]),
                additional_claims={
                    "username": user["full_name"],
                    "role_id": role_id,
                    "email": email
                }
            )
            return jsonify({
                "message": "Login successful",
                "access_token": access_token,
                "user": {
                    "id": user["user_id"],
                    "username": user["full_name"],
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
        checkUser = "SELECT email FROM users WHERE email = %s"
        cursor.execute(checkUser, (email,))
        if cursor.fetchone():
            return jsonify({"message": "Email already exists"}), 409

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
