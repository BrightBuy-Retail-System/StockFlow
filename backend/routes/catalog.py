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

@catalog_bp.route('/products/<int:product_id>')
def get_product_detail(product_id):
    """
    Return one product with all its variants and current stock levels.
    """
    products = query(
        """
        SELECT p.product_id, p.title AS name, p.description, p.base_price,
               p.is_active, c.name AS category_name
        FROM   products p
        JOIN   categories c ON c.category_id = p.category_id
        WHERE  p.product_id = %s
        """,
        (product_id,)
    )

    if not products:
        return jsonify({"error": "Product not found"}), 404

    product = products[0]

    # Variants + stock for this product
    variants = query(
        """
        SELECT pv.variant_id, pv.sku, pv.attribute_name, pv.attribute_value,
               COALESCE(pv.price_override, p.base_price) AS price,
               COALESCE(i.stock_quantity, 0) AS stock
        FROM   product_variants pv
        JOIN   products p ON p.product_id = pv.product_id
        LEFT JOIN inventory i ON i.variant_id = pv.variant_id
        WHERE  pv.product_id = %s
        ORDER  BY pv.sku
        """,
        (product_id,)
    )

    product['variants'] = variants
    return jsonify(product)

# get low stock
@catalog_bp.route('/inventory/low-stock', methods=['GET'])
def get_low_stock():
    """
    Return all variants where stock is below a threshold
    """
    threshold = int(request.args.get('threshold', 10))

    rows = query(
        """
        SELECT p.title AS product_name,
               pv.sku, pv.attribute_name, pv.attribute_value,
               COALESCE(i.stock_quantity, 0) AS stock,
               COALESCE(i.low_stock_threshold, 10) AS threshold
        FROM   product_variants pv
        JOIN   products p ON p.product_id = pv.product_id
        LEFT JOIN inventory i ON i.variant_id = pv.variant_id
        WHERE  COALESCE(i.stock_quantity, 0) <= %s
        ORDER  BY stock ASC
        """,
        (threshold,)
    )

    return jsonify(rows)