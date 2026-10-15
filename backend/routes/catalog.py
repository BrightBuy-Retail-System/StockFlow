from flask import Blueprint, jsonify, request  # pyrefly: ignore
from db import get_db_connection  # pyrefly: ignore
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity, verify_jwt_in_request
import mysql.connector

catalog_bp = Blueprint('catalog', __name__)

def query(sql, params=None):
    #Run a SELECT and return all rows as a list of dicts.
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(sql, params or ())
        rows = cursor.fetchall()
        return rows
    finally:
        cursor.close()
        conn.close()

def execute(sql, params=None):
    #Run an INSERT/UPDATE/DELETE,commit,and return lastrowid + rowcount.
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(sql, params or ())
        conn.commit()
        result = {'lastrowid': cursor.lastrowid, 'rowcount': cursor.rowcount}
        return result
    finally:
        cursor.close()
        conn.close()


#get the role of the current requester (0 = guest) 
def get_role():
    """Return role_id from JWT claims, or 0 if no token present."""
    try:
        verify_jwt_in_request(optional=True)
        claims = get_jwt()
        return claims.get('role_id', 0) if claims else 0
    except Exception:
        return 0

#403 response for unauthorized write attempts
def manager_required():
    """Return a 403 error response if the caller is not a manager or admin."""
    role = get_role()
    if role not in (2, 3, 4):
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
    Return products with aggregated stock counts, default variant, and attributes.
    Managers & Admins (role 2, 3, 4) see all products including inactive ones.
    Customers (role 1) and guests see only active products.
    """
    role = get_role()
    category_id = request.args.get('category_id')
    q = request.args.get('q', '').strip()

    sql = """
        SELECT p.product_id, p.title, p.title AS name, p.description, p.image_url, p.base_price,
               p.is_active, c.category_id, c.name AS category_name,
               CAST(COALESCE(SUM(i.stock_quantity), 0) AS SIGNED) AS total_stock,
               CAST(COALESCE(SUM(i.stock_quantity), 0) AS SIGNED) AS stock_quantity,
               MIN(pv.variant_id) AS default_variant_id,
               GROUP_CONCAT(DISTINCT pv.attribute_value SEPARATOR ', ') AS variant_attributes
        FROM   products p
        JOIN   categories c ON c.category_id = p.category_id
        LEFT JOIN product_variants pv ON pv.product_id = p.product_id
        LEFT JOIN inventory i ON i.variant_id = pv.variant_id
    """

    conditions = []
    params = []

    # Customers and guests only see active products
    if role not in (2, 3, 4):
        conditions.append("p.is_active = 1")

    if category_id:
        conditions.append("p.category_id = %s")
        params.append(category_id)

    if q:
        like = f"%{q}%"
        conditions.append("(p.title LIKE %s OR p.description LIKE %s)")
        params.extend([like, like])

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    group_clause = "GROUP BY p.product_id, p.title, p.description, p.image_url, p.base_price, p.is_active, c.category_id, c.name"
    rows = query(f"{sql} {where_clause} {group_clause} ORDER BY p.title", tuple(params))
    return jsonify(rows)


@catalog_bp.route('/products/<int:product_id>')
def get_product_detail(product_id):
    """
    Return one product with all its variants and current stock levels.
    Non-managers (role 1 & guests) only see active products.
    """
    role = get_role()
    products = query(
        """
        SELECT p.product_id, p.title AS name, p.title, p.description, p.image_url, p.base_price,
               p.is_active, c.category_id, c.name AS category_name
        FROM   products p
        JOIN   categories c ON c.category_id = p.category_id
        WHERE  p.product_id = %s
        """,
        (product_id,)
    )

    if not products:
        return jsonify({"error": "Product not found"}), 404

    product = products[0]

    # Customers and guests cannot access inactive products
    if role not in (2, 3, 4) and not product.get('is_active'):
        return jsonify({"error": "Product not found"}), 404

    # Variants + stock for this product (including raw pv.price_override)
    variants = query(
        """
        SELECT pv.variant_id, pv.sku, pv.attribute_name, pv.attribute_value,
               pv.price_override,
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

# get low stock — managers & admins only
@catalog_bp.route('/inventory/low-stock', methods=['GET'])
@jwt_required()
def get_low_stock():
    """
    Return all variants where stock is below a threshold.
    Accessible only to authenticated managers and admins.
    """
    err = manager_required()
    if err: return err

    try:
        threshold = int(request.args.get('threshold', 10))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid threshold parameter; must be an integer"}), 400

    rows = query(
        """
        SELECT p.title AS product_name,
               pv.variant_id, pv.sku, pv.attribute_name, pv.attribute_value,
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
    role = get_role()
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
    available = int(info['available_stock']) if (info['is_active'] or role in (2, 3, 4)) else 0
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

    data = request.get_json() or {}
    title = data.get('title', '').strip() if isinstance(data.get('title'), str) else ''
    base_price = data.get('base_price')
    category_id = data.get('category_id')

    if not title:
        return jsonify({"error": "title is required"}), 400
    if base_price is None:
        return jsonify({"error": "base_price is required"}), 400
    if category_id is None:
        return jsonify({"error": "category_id is required"}), 400

    try:
        base_price = float(base_price)
        category_id = int(category_id)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid base_price or category_id"}), 400

    try:
        res = execute(
            "INSERT INTO products (title, description, image_url, base_price, category_id, is_active) VALUES (%s, %s, %s, %s, %s, 1)",
            (title, data.get('description', ''), data.get('image_url'), base_price, category_id)
        )
        return jsonify({"product_id": res['lastrowid']}), 201
    except mysql.connector.IntegrityError:
        return jsonify({"error": "Failed to create product due to integrity constraint (check category_id)"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# update product — managers & admins only
@catalog_bp.route('/products/<int:product_id>', methods=['PATCH', 'PUT'])
@jwt_required()
def update_product(product_id):
    err = manager_required()
    if err: return err

    data = request.get_json() or {}
    fields = {k: v for k, v in data.items() if k in ('title', 'description', 'image_url', 'base_price', 'category_id', 'is_active')}
    if not fields:
        return jsonify({"error": "No valid fields provided"}), 400

    existing = query("SELECT product_id FROM products WHERE product_id = %s", (product_id,))
    if not existing:
        return jsonify({"error": "Product not found"}), 404

    try:
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        execute(f"UPDATE products SET {set_clause} WHERE product_id = %s", (*fields.values(), product_id))
        return jsonify({"updated": product_id})
    except mysql.connector.IntegrityError:
        return jsonify({"error": "Database constraint violation while updating product"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# delete product (soft) — managers & admins only
@catalog_bp.route('/products/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    err = manager_required()
    if err: return err

    existing = query("SELECT product_id FROM products WHERE product_id = %s", (product_id,))
    if not existing:
        return jsonify({"error": "Product not found"}), 404

    execute("UPDATE products SET is_active = 0 WHERE product_id = %s", (product_id,))
    return jsonify({"deleted": product_id})

# create variant — managers & admins only
@catalog_bp.route('/variants', methods=['POST'])
@catalog_bp.route('/products/<int:product_id>/variants', methods=['POST'])
@jwt_required()
def create_variant(product_id=None):
    err = manager_required()
    if err: return err

    """
    Add a new variant (SKU, attribute_name, attribute_value, optional price_override)
    to an existing product atomically.
    """
    data = request.get_json() or {}
    target_product_id = product_id or data.get('product_id')
    if not target_product_id:
        return jsonify({"error": "product_id is required"}), 400

    sku = data.get('sku', '').strip() if isinstance(data.get('sku'), str) else ''
    attribute_name = data.get('attribute_name', '').strip() if isinstance(data.get('attribute_name'), str) else None
    attribute_value = data.get('attribute_value', '').strip() if isinstance(data.get('attribute_value'), str) else None
    price_override = data.get('price_override')
    if price_override is not None and str(price_override).strip() == '':
        price_override = None

    try:
        initial_stock = int(data.get('stock_quantity', 0))
    except (ValueError, TypeError):
        initial_stock = 0

    try:
        low_stock = int(data.get('low_stock_threshold', 10))
    except (ValueError, TypeError):
        low_stock = 10

    if not sku:
        return jsonify({"error": "SKU is required"}), 400

    # Check the parent product exists
    product = query("SELECT product_id FROM products WHERE product_id = %s", (target_product_id,))
    if not product:
        return jsonify({"error": "Product not found"}), 404

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO product_variants (product_id, sku, attribute_name, attribute_value, price_override)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (target_product_id, sku, attribute_name or None, attribute_value or None, price_override)
        )
        variant_id = cursor.lastrowid

        # Seed an inventory row
        cursor.execute(
            "INSERT INTO inventory (variant_id, stock_quantity, low_stock_threshold) VALUES (%s, %s, %s)",
            (variant_id, max(0, initial_stock), max(1, low_stock))
        )
        conn.commit()
        return jsonify({"variant_id": variant_id}), 201
    except mysql.connector.IntegrityError:
        conn.rollback()
        return jsonify({"error": f"Variant with SKU '{sku}' already exists"}), 409
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# update variant — managers & admins only
@catalog_bp.route('/variants/<int:variant_id>', methods=['PATCH', 'PUT'])
@jwt_required()
def update_variant(variant_id):
    err = manager_required()
    if err: return err

    """
    Update mutable fields of a variant: sku, attribute_name, attribute_value,
    price_override.
    """
    data = request.get_json() or {}
    fields = {k: v for k, v in data.items()
              if k in ('sku', 'attribute_name', 'attribute_value', 'price_override')}
    if not fields:
        return jsonify({"error": "No valid fields provided"}), 400

    if 'sku' in fields:
        if not isinstance(fields['sku'], str) or not fields['sku'].strip():
            return jsonify({"error": "SKU cannot be empty"}), 400
        fields['sku'] = fields['sku'].strip()

    existing = query("SELECT variant_id FROM product_variants WHERE variant_id = %s", (variant_id,))
    if not existing:
        return jsonify({"error": "Variant not found"}), 404

    try:
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        execute(
            f"UPDATE product_variants SET {set_clause} WHERE variant_id = %s",
            (*fields.values(), variant_id)
        )
        return jsonify({"updated": variant_id})
    except mysql.connector.IntegrityError:
        return jsonify({"error": "Variant SKU already in use"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# delete variant — managers & admins only
@catalog_bp.route('/variants/<int:variant_id>', methods=['DELETE'])
@jwt_required()
def delete_variant(variant_id):
    err = manager_required()
    if err: return err

    """
    Atomically remove a variant and its inventory row.
    Prevents deletion if referenced in existing orders to preserve transaction history.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT variant_id, sku FROM product_variants WHERE variant_id = %s", (variant_id,))
        var_row = cursor.fetchone()
        if not var_row:
            return jsonify({"error": "Variant not found"}), 404

        # Check if the variant is referenced in order history
        cursor.execute("SELECT COUNT(*) AS count FROM order_items WHERE variant_id = %s", (variant_id,))
        order_count = cursor.fetchone()['count']
        if order_count > 0:
            return jsonify({
                "error": f"Cannot delete variant '{var_row['sku']}': it is referenced in {order_count} existing order(s)."
            }), 409

        # Remove from cart_items if any
        cursor.execute("DELETE FROM cart_items WHERE variant_id = %s", (variant_id,))
        # Remove inventory row
        cursor.execute("DELETE FROM inventory WHERE variant_id = %s", (variant_id,))
        # Remove variant row
        cursor.execute("DELETE FROM product_variants WHERE variant_id = %s", (variant_id,))

        conn.commit()
        return jsonify({"deleted": variant_id})
    except mysql.connector.IntegrityError:
        conn.rollback()
        return jsonify({"error": "Cannot delete variant due to database integrity constraints"}), 409
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# restock / adjust stock for a variant — managers & admins only
@catalog_bp.route('/inventory/<int:variant_id>', methods=['PATCH', 'PUT'])
@jwt_required()
def update_inventory(variant_id):
    err = manager_required()
    if err: return err

    """
    Set or adjust the stock_quantity and/or low_stock_threshold for a variant.
    Accepts:
      { "stock_quantity": <int> }                                  (set exact stock count directly)
      { "adjust": <int> }                                          (relative delta, e.g. +50 or -5)
      { "low_stock_threshold": <int> }                            (update threshold)
    Allows updating both stock quantity/adjust and low_stock_threshold together.
    """
    data = request.get_json() or {}

    # Verify that the variant actually exists before attempting any inventory updates/inserts
    var_check = query("SELECT variant_id FROM product_variants WHERE variant_id = %s", (variant_id,))
    if not var_check:
        return jsonify({"error": "Variant not found"}), 404

    # Ensure an inventory record exists for this variant
    inv_check = query("SELECT variant_id FROM inventory WHERE variant_id = %s", (variant_id,))
    if not inv_check:
        execute(
            "INSERT INTO inventory (variant_id, stock_quantity, low_stock_threshold) VALUES (%s, 0, 10)",
            (variant_id,)
        )

    updated = False

    if 'stock_quantity' in data:
        try:
            exact_qty = max(0, int(data['stock_quantity']))
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid stock_quantity value"}), 400

        execute(
            "UPDATE inventory SET stock_quantity = %s WHERE variant_id = %s",
            (exact_qty, variant_id)
        )
        updated = True
    elif 'adjust' in data:
        try:
            delta = int(data['adjust'])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid adjust value"}), 400

        execute(
            """
            UPDATE inventory
            SET stock_quantity = GREATEST(0, stock_quantity + %s)
            WHERE variant_id = %s
            """,
            (delta, variant_id)
        )
        updated = True

    if 'low_stock_threshold' in data:
        try:
            threshold = max(0, int(data['low_stock_threshold']))
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid low_stock_threshold value"}), 400

        execute(
            "UPDATE inventory SET low_stock_threshold = %s WHERE variant_id = %s",
            (threshold, variant_id)
        )
        updated = True

    if not updated:
        return jsonify({"error": "Provide stock_quantity, adjust, or low_stock_threshold"}), 400

    # Return the updated row
    rows = query(
        "SELECT variant_id, stock_quantity, low_stock_threshold FROM inventory WHERE variant_id = %s",
        (variant_id,)
    )
    return jsonify(rows[0] if rows else {"variant_id": variant_id})


# admin inventory overview — product variants + stock (managers & admins only)
@catalog_bp.route('/admin/inventory', methods=['GET'])
@jwt_required()
def get_admin_inventory():
    """
    Return all product variants joined with parent product, category, and inventory stock.
    Accessible only to managers and admins.
    """
    err = manager_required()
    if err: return err

    sql = """
        SELECT 
            pv.variant_id,
            pv.product_id,
            pv.sku,
            pv.attribute_name,
            pv.attribute_value,
            pv.price_override,
            p.title AS product_name,
            p.base_price,
            COALESCE(pv.price_override, p.base_price) AS effective_price,
            p.is_active,
            p.image_url,
            c.category_id,
            c.name AS category_name,
            COALESCE(i.stock_quantity, 0) AS stock_quantity,
            COALESCE(i.low_stock_threshold, 10) AS low_stock_threshold
        FROM product_variants pv
        JOIN products p ON p.product_id = pv.product_id
        LEFT JOIN categories c ON c.category_id = p.category_id
        LEFT JOIN inventory i ON i.variant_id = pv.variant_id
        ORDER BY p.title, pv.sku
    """
    rows = query(sql)
    return jsonify(rows)


# reserve stock when added to cart — authenticated customers only
@catalog_bp.route('/cart/reserve', methods=['POST'])
@jwt_required()
def reserve_cart_stock():
    """
    Validate available inventory when an authenticated customer adds items to cart.
    Stock deduction is performed atomically during checkout in orders.py, avoiding
    double stock deduction and inventory corruption.
    Body: { "variant_id": <int>, "quantity": <int> }
    """
    data = request.get_json() or {}
    variant_id = data.get('variant_id')
    try:
        qty = int(data.get('quantity', 1))
    except (ValueError, TypeError):
        qty = 1

    if not variant_id or qty <= 0:
        return jsonify({"error": "variant_id and positive quantity are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT stock_quantity FROM inventory WHERE variant_id = %s", (variant_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Inventory record for variant not found"}), 404

        current_stock = int(row['stock_quantity'])
        if current_stock < qty:
            return jsonify({
                "error": f"Insufficient stock available. Only {current_stock} unit(s) remaining.",
                "available_stock": current_stock
            }), 400

        return jsonify({
            "success": True,
            "variant_id": variant_id,
            "deducted": qty,
            "reserved": qty,
            "remaining_stock": current_stock,
            "available_stock": current_stock
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# add item to database cart (carts + cart_items tables)
@catalog_bp.route('/cart/add', methods=['POST'])
@jwt_required()
def add_to_cart():
    """
    Save an item to the user's database cart.
    Creates a cart row if one doesn't exist yet,
    then inserts or updates the cart_items row.
    Body: { "variant_id": <int>, "quantity": <int> }
    """
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    variant_id = data.get('variant_id')
    try:
        qty = int(data.get('quantity', 1))
    except (ValueError, TypeError):
        qty = 1

    if not variant_id or qty <= 0:
        return jsonify({"error": "variant_id and positive quantity are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check that variant exists and product is active
        cursor.execute(
            """
            SELECT pv.variant_id, p.is_active 
            FROM product_variants pv 
            JOIN products p ON p.product_id = pv.product_id 
            WHERE pv.variant_id = %s
            """,
            (variant_id,)
        )
        var_row = cursor.fetchone()
        if not var_row:
            return jsonify({"error": "Variant not found"}), 404
        if not var_row['is_active']:
            return jsonify({"error": "Product is no longer active"}), 400

        # 1. Get or create a cart for this user
        cursor.execute("SELECT cart_id FROM carts WHERE user_id = %s", (user_id,))
        cart = cursor.fetchone()
        if cart:
            cart_id = cart['cart_id']
        else:
            cursor.execute("INSERT INTO carts (user_id) VALUES (%s)", (user_id,))
            conn.commit()
            cart_id = cursor.lastrowid

        # 2. Check if this variant is already in the cart
        cursor.execute(
            "SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = %s AND variant_id = %s",
            (cart_id, variant_id)
        )
        existing = cursor.fetchone()

        if existing:
            # Already in cart → add to the existing quantity
            new_qty = existing['quantity'] + qty
            cursor.execute(
                "UPDATE cart_items SET quantity = %s WHERE cart_item_id = %s",
                (new_qty, existing['cart_item_id'])
            )
        else:
            # New item → insert a fresh row
            cursor.execute(
                "INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (%s, %s, %s)",
                (cart_id, variant_id, qty)
            )

        conn.commit()
        return jsonify({
            "success": True,
            "message": "Item added to cart",
            "cart_id": cart_id
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


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
    data = request.get_json() or {}
    name = data.get('name', '').strip() if isinstance(data.get('name'), str) else ''
    slug = data.get('slug', '').strip() if isinstance(data.get('slug'), str) else ''

    if not name or not slug:
        return jsonify({"error": "name and slug are required"}), 400

    try:
        res = execute(
            "INSERT INTO categories (name, slug) VALUES (%s, %s)",
            (name, slug)
        )
        return jsonify({"category_id": res['lastrowid']}), 201
    except mysql.connector.IntegrityError:
        return jsonify({"error": f"Category with slug '{slug}' or name '{name}' already exists"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# update category — managers & admins only
@catalog_bp.route('/categories/<int:category_id>', methods=['PATCH', 'PUT'])
@jwt_required()
def update_category(category_id):
    err = manager_required()
    if err: return err

    """
    Update category name and/or slug.
    Body: { "name": "...", "slug": "..." }
    """
    data = request.get_json() or {}
    fields = {k: v.strip() for k, v in data.items() if k in ('name', 'slug') and isinstance(v, str) and v.strip()}
    if not fields:
        return jsonify({"error": "Provide 'name' or 'slug' to update"}), 400

    existing = query("SELECT category_id FROM categories WHERE category_id = %s", (category_id,))
    if not existing:
        return jsonify({"error": "Category not found"}), 404

    try:
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        execute(
            f"UPDATE categories SET {set_clause} WHERE category_id = %s",
            (*fields.values(), category_id)
        )
        
        rows = query("SELECT category_id, name, slug FROM categories WHERE category_id = %s", (category_id,))
        return jsonify({"updated": category_id, "category": rows[0] if rows else {}})
    except mysql.connector.IntegrityError:
        return jsonify({"error": "Category name or slug already in use"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# delete category — managers & admins only
@catalog_bp.route('/categories/<int:category_id>', methods=['DELETE'])
@jwt_required()
def delete_category(category_id):
    err = manager_required()
    if err: return err

    """
    Delete a category. If active products are linked to this category,
    returns an informative conflict error to prevent orphaned products.
    Soft-deleted (inactive) products that have no order history are cleaned up
    atomically so they do not block category deletion.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT category_id, name FROM categories WHERE category_id = %s", (category_id,))
        cat_row = cursor.fetchone()
        if not cat_row:
            return jsonify({"error": "Category not found"}), 404

        # 1. Check for active products in this category
        cursor.execute("SELECT COUNT(*) AS count FROM products WHERE category_id = %s AND is_active = 1", (category_id,))
        active_count = cursor.fetchone()['count']
        if active_count > 0:
            return jsonify({
                "error": f"Cannot delete category: {active_count} active product(s) are currently assigned to it. Please reassign or delete those products first."
            }), 400

        # 2. Check for soft-deleted (inactive) products in this category
        cursor.execute("SELECT product_id FROM products WHERE category_id = %s AND is_active = 0", (category_id,))
        inactive_prods = cursor.fetchall()
        if inactive_prods:
            prod_ids = [p['product_id'] for p in inactive_prods]
            format_strings = ','.join(['%s'] * len(prod_ids))
            
            # Check if any variant of these inactive products has order history
            cursor.execute(f"""
                SELECT COUNT(*) AS count 
                FROM order_items oi 
                JOIN product_variants pv ON pv.variant_id = oi.variant_id 
                WHERE pv.product_id IN ({format_strings})
            """, prod_ids)
            ordered_count = cursor.fetchone()['count']
            if ordered_count > 0:
                return jsonify({
                    "error": "Cannot delete category: inactive products in this category are referenced in historical orders."
                }), 400

            # Safe to clean up inactive products
            cursor.execute(f"DELETE FROM products WHERE product_id IN ({format_strings})", prod_ids)

        cursor.execute("DELETE FROM categories WHERE category_id = %s", (category_id,))
        conn.commit()
        return jsonify({"deleted": category_id})
    except mysql.connector.IntegrityError:
        conn.rollback()
        return jsonify({"error": "Cannot delete category due to linked database records"}), 400
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
