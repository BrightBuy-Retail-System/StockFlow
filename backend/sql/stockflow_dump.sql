-- StockFlow Database Schema

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- Clean up existing objects
DROP VIEW IF EXISTS v_customer_order_summary;
DROP VIEW IF EXISTS v_category_order_totals;
DROP VIEW IF EXISTS v_top_selling_products;
DROP VIEW IF EXISTS v_quarterly_sales_report;
DROP VIEW IF EXISTS v_shipment_tracking_overview;
DROP VIEW IF EXISTS v_texas_hub_shipment_stats;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS PAYMENT_TRANSACTION;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS shipments;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS texas_cities;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS roles;

-- Roles
CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT DEFAULT NULL,
    image_url VARCHAR(500) DEFAULT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);

-- Product Variants
CREATE TABLE product_variants (
    variant_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    sku VARCHAR(64) NOT NULL UNIQUE,
    attribute_name VARCHAR(50) NOT NULL,
    attribute_value VARCHAR(50) NOT NULL,
    price_override DECIMAL(10,2) DEFAULT NULL,
    CONSTRAINT fk_variants_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_variants_product ON product_variants(product_id);

-- Inventory
CREATE TABLE inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    variant_id INT NOT NULL UNIQUE,
    stock_quantity INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 10,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_stock_positive
        CHECK (stock_quantity >= 0),
    CONSTRAINT fk_inventory_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Texas Logistics Hubs
CREATE TABLE texas_cities (
    city_id INT AUTO_INCREMENT PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL UNIQUE,
    hub_name VARCHAR(100) NOT NULL,
    base_lead_time_days INT NOT NULL DEFAULT 2,
    shipping_fee DECIMAL(8,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shipments
CREATE TABLE shipments (
    shipment_id INT AUTO_INCREMENT PRIMARY KEY,
    tracking_number VARCHAR(64) NOT NULL UNIQUE,
    destination_city_id INT NOT NULL,
    shipping_status ENUM('PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED') DEFAULT 'PENDING',
    estimated_arrival DATE DEFAULT NULL,
    dispatched_at TIMESTAMP NULL DEFAULT NULL,
    delivered_at TIMESTAMP NULL DEFAULT NULL,
    delivery_address TEXT DEFAULT NULL,
    recipient_phone VARCHAR(30) DEFAULT NULL,
    CONSTRAINT fk_shipments_city
        FOREIGN KEY (destination_city_id) REFERENCES texas_cities(city_id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_shipments_destination ON shipments(destination_city_id);
CREATE INDEX idx_shipments_status ON shipments(shipping_status);
CREATE INDEX idx_shipments_estimated ON shipments(estimated_arrival);

-- Users
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL DEFAULT 1,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified TINYINT(1) DEFAULT 1,
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_role ON users(role_id);

-- Email Verification OTPs
CREATE TABLE email_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(120) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_verif_email ON email_verifications(email);

-- Password Resets
CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_password_resets_email_otp ON password_resets(email, otp_code);

-- Carts
CREATE TABLE carts (
    cart_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_carts_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cart Items
CREATE TABLE cart_items (
    cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    variant_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    CONSTRAINT uq_cart_variant
        UNIQUE (cart_id, variant_id),
    CONSTRAINT chk_cart_quantity
        CHECK (quantity > 0),
    CONSTRAINT fk_cart_items_cart
        FOREIGN KEY (cart_id) REFERENCES carts(cart_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_cart_items_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_cart_items_variant ON cart_items(variant_id);

-- Orders
CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    shipment_id INT DEFAULT NULL UNIQUE,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'SHIPPED', 'CANCELLED', 'DELIVERED') NOT NULL DEFAULT 'PENDING',
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    service_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    delivery_type ENUM('SHIP', 'PICKUP') NOT NULL DEFAULT 'SHIP',
    recipient_name VARCHAR(150) DEFAULT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    shipping_address TEXT DEFAULT NULL,
    billing_address TEXT DEFAULT NULL,
    payment_status ENUM('Pending', 'Paid', 'Refunded') DEFAULT 'Pending',
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE,
    CONSTRAINT fk_orders_shipment
        FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_placed_payment ON orders(placed_at, payment_status);
CREATE INDEX idx_orders_status ON orders(status);

-- Order Items
CREATE TABLE order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    variant_id INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    CONSTRAINT chk_order_item_qty
        CHECK (quantity > 0),
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_order_items_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_variant ON order_items(variant_id);

-- Payments
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    payment_method VARCHAR(50) NOT NULL,
    transaction_ref VARCHAR(100) NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    payment_status ENUM('INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED') DEFAULT 'INITIATED',
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment Transactions
CREATE TABLE PAYMENT_TRANSACTION (
    payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    transaction_reference VARCHAR(100) NOT NULL UNIQUE,
    processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_payment_amount
        CHECK (amount > 0),
    CONSTRAINT fk_payment_transaction_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_payment_txn_order ON PAYMENT_TRANSACTION(order_id);
CREATE INDEX idx_payment_txn_processed ON PAYMENT_TRANSACTION(processed_at);

-- Audit Logs
CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    event_action VARCHAR(50) NOT NULL,
    event_details TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_action ON audit_logs(event_action);

-- Views

-- Texas hub shipment stats
CREATE VIEW v_texas_hub_shipment_stats AS
SELECT 
    c.city_id,
    c.city_name,
    c.hub_name,
    c.base_lead_time_days,
    c.shipping_fee,
    COUNT(s.shipment_id) AS total_shipments,
    COALESCE(SUM(CASE WHEN s.shipping_status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending_count,
    COALESCE(SUM(CASE WHEN s.shipping_status = 'DISPATCHED' THEN 1 ELSE 0 END), 0) AS dispatched_count,
    COALESCE(SUM(CASE WHEN s.shipping_status = 'IN_TRANSIT' THEN 1 ELSE 0 END), 0) AS in_transit_count,
    COALESCE(SUM(CASE WHEN s.shipping_status = 'DELIVERED' THEN 1 ELSE 0 END), 0) AS delivered_count
FROM texas_cities c
LEFT JOIN shipments s ON c.city_id = s.destination_city_id
GROUP BY c.city_id, c.city_name, c.hub_name, c.base_lead_time_days, c.shipping_fee;

-- Shipment tracking overview
CREATE VIEW v_shipment_tracking_overview AS
SELECT
    s.shipment_id,
    s.tracking_number,
    s.shipping_status,
    s.estimated_arrival,
    s.dispatched_at,
    s.delivered_at,
    s.delivery_address,
    s.recipient_phone,
    c.city_id,
    c.city_name,
    c.hub_name,
    c.base_lead_time_days,
    c.shipping_fee,
    o.order_id,
    o.user_id,
    o.status AS order_status,
    o.total_amount,
    u.full_name AS customer_name
FROM shipments s
JOIN texas_cities c ON s.destination_city_id = c.city_id
LEFT JOIN orders o ON o.shipment_id = s.shipment_id
LEFT JOIN users u ON o.user_id = u.user_id;

-- Quarterly sales report
CREATE VIEW v_quarterly_sales_report AS
SELECT
    YEAR(o.placed_at) AS sales_year,
    QUARTER(o.placed_at) AS sales_quarter,
    COUNT(DISTINCT o.order_id) AS total_orders,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS gross_revenue,
    COALESCE(SUM(CASE
        WHEN o.payment_status = 'Paid' THEN oi.quantity * oi.unit_price
        ELSE 0.00
    END), 0.00) AS net_collected_revenue,
    COALESCE(SUM(oi.quantity), 0) AS total_units_sold,
    AVG(COALESCE(SUM(oi.quantity * oi.unit_price), 0.00)) OVER (
        ORDER BY YEAR(o.placed_at), QUARTER(o.placed_at)
        ROWS BETWEEN 1 PRECEDING AND CURRENT ROW
    ) AS moving_avg_quarterly_revenue
FROM orders o
LEFT OUTER JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status != 'CANCELLED'
GROUP BY YEAR(o.placed_at), QUARTER(o.placed_at)
ORDER BY sales_year, sales_quarter;

-- Top selling products
CREATE VIEW v_top_selling_products AS
SELECT
    product_id,
    product_name,
    category_name,
    total_units_sold,
    total_revenue,
    DENSE_RANK() OVER (ORDER BY total_revenue DESC) AS revenue_rank
FROM (
    SELECT
        p.product_id,
        p.title AS product_name,
        COALESCE(c.name, 'Uncategorized') AS category_name,
        COALESCE(SUM(oi.quantity), 0) AS total_units_sold,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS total_revenue
    FROM products p
    INNER JOIN product_variants pv ON pv.product_id = p.product_id
    INNER JOIN order_items oi ON oi.variant_id = pv.variant_id
    INNER JOIN orders o ON o.order_id = oi.order_id
    LEFT OUTER JOIN categories c ON c.category_id = p.category_id
    WHERE o.status != 'CANCELLED'
    GROUP BY p.product_id, p.title, c.name
) ranked_products
ORDER BY total_revenue DESC;

-- Category order totals
CREATE VIEW v_category_order_totals AS
SELECT
    COALESCE(c.name, 'ALL CATEGORIES (GRAND TOTAL)') AS category_name,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS total_category_revenue,
    COUNT(DISTINCT o.order_id) AS total_orders,
    COALESCE(SUM(oi.quantity), 0) AS total_units_sold
FROM categories c
LEFT OUTER JOIN products p ON p.category_id = c.category_id
LEFT OUTER JOIN product_variants pv ON pv.product_id = p.product_id
LEFT OUTER JOIN order_items oi ON oi.variant_id = pv.variant_id
LEFT OUTER JOIN orders o ON o.order_id = oi.order_id AND o.status != 'CANCELLED'
GROUP BY c.name WITH ROLLUP;

-- Customer order summary
CREATE VIEW v_customer_order_summary AS
SELECT
    u.user_id AS customer_id,
    u.full_name AS customer_name,
    u.email,
    COALESCE(MAX(tc.city_name), 'Texas Regional') AS primary_city,
    COUNT(DISTINCT o.order_id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0.00) AS lifetime_spending,
    COALESCE(SUM(CASE WHEN o.payment_status = 'Paid' THEN 1 ELSE 0 END), 0) AS paid_orders,
    COALESCE(SUM(CASE WHEN o.payment_status = 'Pending' THEN 1 ELSE 0 END), 0) AS pending_orders,
    COALESCE(SUM(CASE WHEN o.payment_status = 'Paid' THEN o.total_amount ELSE 0.00 END), 0.00) AS paid_order_value,
    COALESCE(SUM(CASE WHEN o.payment_status = 'Pending' THEN o.total_amount ELSE 0.00 END), 0.00) AS pending_order_value
FROM users u
LEFT OUTER JOIN orders o ON o.user_id = u.user_id AND o.status != 'CANCELLED'
LEFT OUTER JOIN shipments s ON s.shipment_id = o.shipment_id
LEFT OUTER JOIN texas_cities tc ON tc.city_id = s.destination_city_id
GROUP BY u.user_id, u.full_name, u.email
ORDER BY lifetime_spending DESC;

SET FOREIGN_KEY_CHECKS = 1;
