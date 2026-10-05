from flask import Blueprint, jsonify, request  # pyrefly: ignore
from db import get_db_connection  # pyrefly: ignore
from flask_jwt_extended import jwt_required, get_jwt, verify_jwt_in_request

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

def execute(sql, params=None):
    #Run an INSERT/UPDATE/DELETE,commit,and return lastrowid + rowcount.
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params or ())
    conn.commit()
    result = {'lastrowid': cursor.lastrowid, 'rowcount': cursor.rowcount}
    cursor.close()
    conn.close()
    return result


# ── helper: get the role of the current requester (0 = guest) ────────────────
def get_role():
    """Return role_id from JWT claims, or 0 if no token present."""
    try:
        verify_jwt_in_request(optional=True)
        claims = get_jwt()
        return claims.get('role_id', 0) if claims else 0
    except Exception:
        return 0

# ── helper: 403 response for unauthorized write attempts ─────────────────────
def manager_required():
    """Return a 403 error response if the caller is not a manager or admin."""
    role = get_role()
    if role not in (2, 3):
        return jsonify({"error": "Manager or Admin access required"}), 403
    return None  # all good


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
    Return products.
    Managers & Admins (role 2, 3) see all products including inactive ones.
    Customers (role 1) and guests see only active products.
    """
    role = get_role()
    category_id = request.args.get('category_id')
    q = request.args.get('q', '').strip()
    like = f"%{q}%"

    sql = """
        SELECT p.product_id, p.title AS name, p.description, p.base_price,
               p.is_active, c.name AS category_name
        FROM   products p
        JOIN   categories c ON c.category_id = p.category_id
        """

    # Customers and guests only see active products
    active_filter = "" if role in (2, 3) else "AND p.is_active = 1 "

    if category_id and q:
        rows = query(sql + f"WHERE p.category_id = %s {active_filter}AND (p.title LIKE %s OR p.description LIKE %s) ORDER BY p.title", (category_id, like, like))
    elif category_id:
        rows = query(sql + f"WHERE p.category_id = %s {active_filter}ORDER BY p.title", (category_id,))
    elif q:
        rows = query(sql + f"WHERE 1=1 {active_filter}AND (p.title LIKE %s OR p.description LIKE %s) ORDER BY p.title", (like, like))
    else:
        rows = query(sql + f"WHERE 1=1 {active_filter}ORDER BY p.title")

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

# check / limit orderable stock for a specific variant
@catalog_bp.route('/variants/<int:variant_id>/stock', methods=['GET'])
def get_variant_stock(variant_id):
    """
    Return the live available stock and order limit for a specific variant.
    """
    rows = query(
        """
        SELECT pv.variant_id, pv.sku, p.title AS product_name,
               COALESCE(i.stock_quantity, 0) AS available_stock,
               p.is_active
        FROM   product_variants pv
        JOIN   products p ON p.product_id = pv.product_id
        LEFT JOIN inventory i ON i.variant_id = pv.variant_id
        WHERE  pv.variant_id = %s
        """,
        (variant_id,)
    )
    if not rows:
        return jsonify({"error": "Variant not found"}), 404
    
    info = rows[0]
    available = int(info['available_stock']) if info['is_active'] else 0
    return jsonify({
        "variant_id": variant_id,
        "sku": info['sku'],
        "product_name": info['product_name'],
        "available_stock": available,
        "max_orderable": available,
        "in_stock": available > 0
    })

# validate order quantities against available inventory stock
@catalog_bp.route('/validate-stock', methods=['POST'])
def validate_order_stock():
    """
    Validate that requested order quantities do not exceed available stock in the database.
    Accepts:
      { "variant_id": <int>, "quantity": <int> }
      OR
      { "items": [ { "variant_id": <int>, "quantity": <int> }, ... ] }
    """
    data = request.get_json() or {}
    items = data.get('items')
    if items is None:
        if 'variant_id' in data:
            items = [{'variant_id': data.get('variant_id'), 'quantity': data.get('quantity', 1)}]
        else:
            items = []

    if not items:
        return jsonify({"error": "No items provided for stock validation"}), 400

    results = []
    has_insufficient = False

    for item in items:
        vid = item.get('variant_id')
        try:
            req_qty = int(item.get('quantity', 1))
        except (ValueError, TypeError):
            req_qty = 1

        rows = query(
            """
            SELECT pv.variant_id, pv.sku, p.title AS product_name,
                   COALESCE(i.stock_quantity, 0) AS available_stock,
                   p.is_active
            FROM   product_variants pv
            JOIN   products p ON p.product_id = pv.product_id
            LEFT JOIN inventory i ON i.variant_id = pv.variant_id
            WHERE  pv.variant_id = %s
            """,
            (vid,)
        )

        if not rows:
            results.append({
                "variant_id": vid,
                "valid": False,
                "requested_quantity": req_qty,
                "available_stock": 0,
                "max_orderable": 0,
                "error": f"Product variant #{vid} not found."
            })
            has_insufficient = True
            continue

        var_info = rows[0]
        avail = int(var_info['available_stock']) if var_info['is_active'] else 0
        is_valid = (req_qty > 0) and (req_qty <= avail)

        if not is_valid:
            has_insufficient = True

        results.append({
            "variant_id": vid,
            "sku": var_info['sku'],
            "product_name": var_info['product_name'],
            "requested_quantity": req_qty,
            "available_stock": avail,
            "max_orderable": avail,
            "valid": is_valid,
            "message": "Stock available" if is_valid else (
                f"Cannot order {req_qty} units. Only {avail} unit(s) available in stock." if avail > 0 else "Item is currently out of stock."
            )
        })

    return jsonify({
        "success": not has_insufficient,
        "items": results
    }), (200 if not has_insufficient else 400)

# create product — managers & admins only
@catalog_bp.route('/products', methods=['POST'])
@jwt_required()
def create_product():
    err = manager_required()
    if err: return err

    data = request.get_json()
    res = execute(
        "INSERT INTO products (title, description, base_price, category_id, is_active) VALUES (%s, %s, %s, %s, 1)",
        (data['title'], data.get('description', ''), data['base_price'], data['category_id'])
    )
    return jsonify({"product_id": res['lastrowid']}), 201

# update product — managers & admins only
@catalog_bp.route('/products/<int:product_id>', methods=['PATCH'])
@jwt_required()
def update_product(product_id):
    err = manager_required()
    if err: return err

    data = request.get_json()
    fields = {k: v for k, v in data.items() if k in ('title', 'description', 'base_price', 'category_id', 'is_active')}
    if not fields:
        return jsonify({"error": "No valid fields provided"}), 400
    set_clause = ", ".join(f"{k} = %s" for k in fields)
    execute(f"UPDATE products SET {set_clause} WHERE product_id = %s", (*fields.values(), product_id))
    return jsonify({"updated": product_id})

# delete product (soft) — managers & admins only
@catalog_bp.route('/products/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    err = manager_required()
    if err: return err

    execute("UPDATE products SET is_active = 0 WHERE product_id = %s", (product_id,))
    return jsonify({"deleted": product_id})

# create variant — managers & admins only
@catalog_bp.route('/products/<int:product_id>/variants', methods=['POST'])
@jwt_required()
def create_variant(product_id):
    err = manager_required()
    if err: return err

    """
    Add a new variant (SKU, attribute_name, attribute_value, optional price_override)
    to an existing product.
    """
    data = request.get_json()
    sku            = data.get('sku', '').strip()
    attribute_name  = data.get('attribute_name', '').strip() or None
    attribute_value = data.get('attribute_value', '').strip() or None
    price_override  = data.get('price_override') or None

    if not sku:
        return jsonify({"error": "SKU is required"}), 400

    # Check the parent product exists
    product = query("SELECT product_id FROM products WHERE product_id = %s", (product_id,))
    if not product:
        return jsonify({"error": "Product not found"}), 404

    res = execute(
        """
        INSERT INTO product_variants (product_id, sku, attribute_name, attribute_value, price_override)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (product_id, sku, attribute_name, attribute_value, price_override)
    )
    variant_id = res['lastrowid']

    # Seed a stock row so the variant shows up in inventory queries
    execute(
        "INSERT INTO inventory (variant_id, stock_quantity, low_stock_threshold) VALUES (%s, 0, 10)",
        (variant_id,)
    )

    return jsonify({"variant_id": variant_id}), 201


# update variant — managers & admins only
@catalog_bp.route('/variants/<int:variant_id>', methods=['PATCH'])
@jwt_required()
def update_variant(variant_id):
    err = manager_required()
    if err: return err

    """
    Update mutable fields of a variant: sku, attribute_name, attribute_value,
    price_override.
    """
    data   = request.get_json()
    fields = {k: v for k, v in data.items()
              if k in ('sku', 'attribute_name', 'attribute_value', 'price_override')}
    if not fields:
        return jsonify({"error": "No valid fields provided"}), 400

    set_clause = ", ".join(f"{k} = %s" for k in fields)
    execute(
        f"UPDATE product_variants SET {set_clause} WHERE variant_id = %s",
        (*fields.values(), variant_id)
    )
    return jsonify({"updated": variant_id})


# delete variant — managers & admins only
@catalog_bp.route('/variants/<int:variant_id>', methods=['DELETE'])
@jwt_required()
def delete_variant(variant_id):
    err = manager_required()
    if err: return err

    """
    Permanently remove a variant and its inventory row.
    """
    execute("DELETE FROM inventory WHERE variant_id = %s", (variant_id,))
    execute("DELETE FROM product_variants WHERE variant_id = %s", (variant_id,))
    return jsonify({"deleted": variant_id})



# restock / adjust stock for a variant — managers & admins only
@catalog_bp.route('/inventory/<int:variant_id>', methods=['PATCH'])
@jwt_required()
def update_inventory(variant_id):
    err = manager_required()
    if err: return err

    """
    Set or adjust the stock_quantity and/or low_stock_threshold for a variant.
    Accepts:
      { "stock_quantity": <int>, "low_stock_threshold": <int> }   (absolute set)
      { "adjust": <int> }                                          (relative delta, e.g. +50 or -5)
    """
    data = request.get_json()

    if 'adjust' in data:
        # Relative adjustment — use SQL arithmetic to avoid race conditions
        delta = int(data['adjust'])
        execute(
            """
            UPDATE inventory
            SET stock_quantity = GREATEST(0, stock_quantity + %s)
            WHERE variant_id = %s
            """,
            (delta, variant_id)
        )
    else:
        fields = {k: v for k, v in data.items()
                  if k in ('stock_quantity', 'low_stock_threshold')}
        if not fields:
            return jsonify({"error": "Provide stock_quantity, low_stock_threshold, or adjust"}), 400
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        execute(
            f"UPDATE inventory SET {set_clause} WHERE variant_id = %s",
            (*fields.values(), variant_id)
        )

    # Return the updated row
    rows = query(
        "SELECT variant_id, stock_quantity, low_stock_threshold FROM inventory WHERE variant_id = %s",
        (variant_id,)
    )
    return jsonify(rows[0] if rows else {"variant_id": variant_id})



# create category — managers & admins only
@catalog_bp.route('/categories', methods=['POST'])
@jwt_required()
def create_category():
    err = manager_required()
    if err: return err

    """
    Create a new product category.
    Body: { "name": "...", "slug": "..." }
    """
    data = request.get_json()
    name = data.get('name', '').strip()
    slug = data.get('slug', '').strip()

    if not name or not slug:
        return jsonify({"error": "name and slug are required"}), 400

    res = execute(
        "INSERT INTO categories (name, slug) VALUES (%s, %s)",
        (name, slug)
    )
    return jsonify({"category_id": res['lastrowid']}), 201