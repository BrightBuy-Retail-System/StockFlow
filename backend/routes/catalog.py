from flask import Blueprint, jsonify, request  # pyrefly: ignore
from db import get_db_connection  # pyrefly: ignore

catalog_bp = Blueprint('catalog', __name__)

def query(sql, params=None):
    #Run a SELECT and return all rows as a list of dicts.
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(sql, params or ())
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows


# get categories
@catalog_bp.route('/categories')
def get_categories():
    #Return every product category
    rows = query("SELECT category_id, name, slug FROM categories ORDER BY name")
    return jsonify(rows)

# get products
@catalog_bp.route('/products')
def get_products():
    """
    Return all products.
    """
    category_id = request.args.get('category_id')

    if category_id:
        rows = query(
            """
            SELECT p.product_id, p.title AS name, p.description, p.base_price,
                   p.is_active, c.name AS category_name
            FROM   products p
            JOIN   categories c ON c.category_id = p.category_id
            WHERE  p.category_id = %s
            ORDER  BY p.title
            """,
            (category_id,)
        )
    else:
        rows = query(
            """
            SELECT p.product_id, p.title AS name, p.description, p.base_price,
                   p.is_active, c.name AS category_name
            FROM   products p
            JOIN   categories c ON c.category_id = p.category_id
            ORDER  BY p.title
            """
        )

    return jsonify(rows)
