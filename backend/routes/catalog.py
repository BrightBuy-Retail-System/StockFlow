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


# =========================================================================
# WAREHOUSE ADMINISTRATOR & INVENTORY COMMAND ENDPOINTS
# =========================================================================

@catalog_bp.route('/admin/inventory', methods=['GET'])
def get_admin_inventory():
    """
    Return comprehensive inventory listings with SKU, product, variant attributes,
    current stock quantity, and threshold alerts.
    """
    sql = """
        SELECT 
            pv.variant_id,
            pv.product_id,
            pv.sku,
            pv.attribute_name,
            pv.attribute_value,
            COALESCE(pv.price_override, p.base_price) AS effective_price,
            pv.price_override,
            p.title AS product_name,
            p.category_id,
            c.name AS category_name,
            p.base_price,
            p.is_active,
            COALESCE(i.inventory_id, 0) AS inventory_id,
            COALESCE(i.stock_quantity, 0) AS stock_quantity,
            COALESCE(i.low_stock_threshold, 10) AS low_stock_threshold,
            i.updated_at AS stock_updated_at
        FROM product_variants pv
        JOIN products p ON pv.product_id = p.product_id
        JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN inventory i ON pv.variant_id = i.variant_id
        ORDER BY p.title ASC, pv.sku ASC
    """
    rows = query(sql)
    return jsonify(rows)


@catalog_bp.route('/products', methods=['POST'])
def create_product():
    data = request.get_json() or {}
    title = data.get('title')
    category_id = data.get('category_id')
    description = data.get('description', '')
    base_price = data.get('base_price', 0.0)
    is_active = 1 if data.get('is_active', True) else 0

    if not title or not category_id:
        return jsonify({"message": "Product title and category_id are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = """
            INSERT INTO products (category_id, title, description, base_price, is_active)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (category_id, title, description, base_price, is_active))
        conn.commit()
        product_id = cursor.lastrowid
        return jsonify({"message": "Product created successfully", "product_id": product_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@catalog_bp.route('/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    data = request.get_json() or {}
    title = data.get('title')
    category_id = data.get('category_id')
    description = data.get('description')
    base_price = data.get('base_price')
    is_active = data.get('is_active')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        fields = []
        params = []
        if title is not None:
            fields.append("title = %s")
            params.append(title)
        if category_id is not None:
            fields.append("category_id = %s")
            params.append(category_id)
        if description is not None:
            fields.append("description = %s")
            params.append(description)
        if base_price is not None:
            fields.append("base_price = %s")
            params.append(base_price)
        if is_active is not None:
            fields.append("is_active = %s")
            params.append(1 if is_active else 0)

        if not fields:
            return jsonify({"message": "No fields to update"}), 400

        params.append(product_id)
        sql = f"UPDATE products SET {', '.join(fields)} WHERE product_id = %s"
        cursor.execute(sql, params)
        conn.commit()
        return jsonify({"message": "Product updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@catalog_bp.route('/variants', methods=['POST'])
def create_variant():
    data = request.get_json() or {}
    product_id = data.get('product_id')
    sku = data.get('sku')
    attribute_name = data.get('attribute_name', 'Standard')
    attribute_value = data.get('attribute_value', 'Default')
    price_override = data.get('price_override')
    stock_quantity = int(data.get('stock_quantity', 0))
    low_stock_threshold = int(data.get('low_stock_threshold', 10))

    if not product_id or not sku:
        return jsonify({"message": "product_id and sku are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check SKU uniqueness
        cursor.execute("SELECT variant_id FROM product_variants WHERE sku = %s", (sku,))
        if cursor.fetchone():
            return jsonify({"message": f"SKU '{sku}' already exists"}), 409

        sql_variant = """
            INSERT INTO product_variants (product_id, sku, attribute_name, attribute_value, price_override)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(sql_variant, (product_id, sku, attribute_name, attribute_value, None if price_override == '' else price_override))
        variant_id = cursor.lastrowid

        # Insert initial inventory
        sql_inv = """
            INSERT INTO inventory (variant_id, stock_quantity, low_stock_threshold)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE stock_quantity = %s, low_stock_threshold = %s
        """
        cursor.execute(sql_inv, (variant_id, stock_quantity, low_stock_threshold, stock_quantity, low_stock_threshold))

        conn.commit()
        return jsonify({"message": "Variant and inventory created successfully", "variant_id": variant_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@catalog_bp.route('/variants/<int:variant_id>', methods=['PUT'])
def update_variant(variant_id):
    data = request.get_json() or {}
    sku = data.get('sku')
    attribute_name = data.get('attribute_name')
    attribute_value = data.get('attribute_value')
    price_override = data.get('price_override')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        fields = []
        params = []
        if sku is not None:
            fields.append("sku = %s")
            params.append(sku)
        if attribute_name is not None:
            fields.append("attribute_name = %s")
            params.append(attribute_name)
        if attribute_value is not None:
            fields.append("attribute_value = %s")
            params.append(attribute_value)
        if price_override is not None:
            fields.append("price_override = %s")
            params.append(None if price_override == '' or price_override is None else price_override)

        if not fields:
            return jsonify({"message": "No fields to update"}), 400

        params.append(variant_id)
        sql = f"UPDATE product_variants SET {', '.join(fields)} WHERE variant_id = %s"
        cursor.execute(sql, params)
        conn.commit()
        return jsonify({"message": "Variant updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@catalog_bp.route('/inventory/<int:variant_id>', methods=['PUT'])
def update_inventory_stock(variant_id):
    data = request.get_json() or {}
    stock_quantity = data.get('stock_quantity')
    low_stock_threshold = data.get('low_stock_threshold')

    if stock_quantity is None and low_stock_threshold is None:
        return jsonify({"message": "stock_quantity or low_stock_threshold is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT inventory_id, stock_quantity, low_stock_threshold FROM inventory WHERE variant_id = %s", (variant_id,))
        existing = cursor.fetchone()

        if existing:
            new_qty = int(stock_quantity) if stock_quantity is not None else existing['stock_quantity']
            new_thresh = int(low_stock_threshold) if low_stock_threshold is not None else existing['low_stock_threshold']
            cursor.execute(
                "UPDATE inventory SET stock_quantity = %s, low_stock_threshold = %s WHERE variant_id = %s",
                (new_qty, new_thresh, variant_id)
            )
        else:
            new_qty = int(stock_quantity) if stock_quantity is not None else 0
            new_thresh = int(low_stock_threshold) if low_stock_threshold is not None else 10
            cursor.execute(
                "INSERT INTO inventory (variant_id, stock_quantity, low_stock_threshold) VALUES (%s, %s, %s)",
                (variant_id, new_qty, new_thresh)
            )

        conn.commit()
        return jsonify({
            "message": "Warehouse inventory updated successfully",
            "variant_id": variant_id,
            "stock_quantity": new_qty,
            "low_stock_threshold": new_thresh
        }), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"Server error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()