-- ============================================================================
-- StockFlow (BrightBuy) - Member 5: Analytics, Reports & Payment Transactions
-- Course: CS3043 - Database Systems
-- Reference: Lecture Notes 1 - 9 (DDL, DML, Joins, Views, Triggers, SPs, DCL, Windowing)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1: DATA DEFINITION LANGUAGE (DDL) - Schema Alteration & Table Setup
-- Reference: Lecture Note 1 (Alter Table, Create Table with Constraints & FKs)
-- ----------------------------------------------------------------------------

-- Alter existing parent table 'orders' to support payment tracking
ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS payment_status ENUM('Pending', 'Paid', 'Refunded') DEFAULT 'Pending';

-- Drop dependent objects cleanly if recreating
DROP VIEW IF EXISTS v_customer_order_summary;
DROP VIEW IF EXISTS v_category_order_totals;
DROP VIEW IF EXISTS v_top_selling_products;
DROP VIEW IF EXISTS v_quarterly_sales_report;

-- Create PAYMENT_TRANSACTION table
-- Enforces: PRIMARY KEY, FOREIGN KEY (ON DELETE RESTRICT, ON UPDATE CASCADE), CHECK constraint
CREATE TABLE IF NOT EXISTS PAYMENT_TRANSACTION (
    payment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    transaction_reference VARCHAR(100) NOT NULL UNIQUE,
    processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (payment_id),
    CONSTRAINT chk_payment_amount 
        CHECK (amount > 0),
    CONSTRAINT fk_payment_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- SECTION 2: INDEX OPTIMIZATION (DDL)
-- Speed up transactional queries, joins, and timestamp-based reporting
-- ----------------------------------------------------------------------------
CREATE INDEX idx_payment_order_id 
    ON PAYMENT_TRANSACTION (order_id);

CREATE INDEX idx_payment_processed_at 
    ON PAYMENT_TRANSACTION (processed_at);

CREATE INDEX idx_orders_placed_payment 
    ON orders (placed_at, payment_status);

-- ----------------------------------------------------------------------------
-- SECTION 3: VIRTUAL RELATIONS (VIEWS) & ADVANCED AGGREGATIONS
-- Reference: Lecture Notes 3 (Joins), 4 (Views), and 9 (Windowing & ROLLUP)
-- ----------------------------------------------------------------------------

-- VIEW 1: Quarterly Sales Report
-- Demonstrates: Aggregations (SUM, COUNT), CASE WHEN expressions, and
-- Window Function Moving Average (ROWS BETWEEN 1 PRECEDING AND CURRENT ROW)
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
GROUP BY YEAR(o.placed_at), QUARTER(o.placed_at)
ORDER BY sales_year, sales_quarter;

-- VIEW 2: Top-Selling Products Leaderboard
-- Demonstrates: Multi-table INNER JOIN, Nested Derived Table, and
-- Window Ranking DENSE_RANK() OVER (ORDER BY total_revenue DESC)
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
    LEFT OUTER JOIN categories c ON c.category_id = p.category_id
    GROUP BY p.product_id, p.title, c.name
) ranked_products
ORDER BY total_revenue DESC;

-- VIEW 3: Category Order Totals with Hierarchical Summary
-- Demonstrates: Extended Aggregation WITH ROLLUP (Hierarchical subtotals + Grand Total)
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
LEFT OUTER JOIN orders o ON o.order_id = oi.order_id
GROUP BY c.name WITH ROLLUP;

-- VIEW 4: Customer Order Summary & Lifetime Value
-- Demonstrates: Multi-table Outer Joins, COALESCE for NULL handling, and Conditional Aggregates
CREATE VIEW v_customer_order_summary AS
SELECT
    u.user_id AS customer_id,
    u.full_name AS customer_name,
    u.email,
    COALESCE(tc.city_name, 'Texas Regional') AS primary_city,
    COUNT(DISTINCT o.order_id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0.00) AS lifetime_spending,
    COALESCE(SUM(CASE WHEN o.payment_status = 'Paid' THEN 1 ELSE 0 END), 0) AS paid_orders,
    COALESCE(SUM(CASE WHEN o.payment_status = 'Pending' THEN 1 ELSE 0 END), 0) AS pending_orders,
    COALESCE(SUM(CASE WHEN o.payment_status = 'Paid' THEN o.total_amount ELSE 0.00 END), 0.00) AS paid_order_value,
    COALESCE(SUM(CASE WHEN o.payment_status = 'Pending' THEN o.total_amount ELSE 0.00 END), 0.00) AS pending_order_value
FROM users u
LEFT OUTER JOIN orders o ON o.user_id = u.user_id
LEFT OUTER JOIN shipments s ON s.shipment_id = o.shipment_id
LEFT OUTER JOIN texas_cities tc ON tc.city_id = s.destination_city_id
GROUP BY u.user_id, u.full_name, u.email, tc.city_name
ORDER BY lifetime_spending DESC;

-- ----------------------------------------------------------------------------
-- SECTION 4: PROCEDURAL CONSTRUCTS - STORED PROCEDURE
-- Reference: Lecture Note 6 (Stored Procedures with IN and OUT parameters)
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_process_payment;

DELIMITER $$
CREATE PROCEDURE sp_process_payment(
    IN p_order_id INT,
    IN p_amount DECIMAL(12,2),
    IN p_payment_method VARCHAR(50),
    OUT p_txn_ref VARCHAR(100),
    OUT p_payment_status VARCHAR(20)
)
BEGIN
    DECLARE v_is_card INT DEFAULT 0;
    DECLARE v_generated_ref VARCHAR(100);

    -- Generate a unique uppercase transaction reference
    SET v_generated_ref = CONCAT('TXN-', UPPER(SUBSTRING(MD5(RAND()), 1, 12)));

    -- Validate payment method
    IF LOWER(TRIM(p_payment_method)) IN ('card', 'credit card', 'debit card', 'visa', 'mastercard', 'amex') THEN
        SET v_is_card = 1;
        SET p_payment_status = 'Paid';
    ELSE
        SET v_is_card = 0;
        SET p_payment_status = 'Pending';
    END IF;

    -- Record payment transaction
    INSERT INTO PAYMENT_TRANSACTION (order_id, amount, transaction_reference, processed_at)
    VALUES (p_order_id, p_amount, v_generated_ref, NOW());

    -- Synchronize order payment status
    UPDATE orders
    SET payment_status = p_payment_status
    WHERE order_id = p_order_id;

    SET p_txn_ref = v_generated_ref;
END$$
DELIMITER ;

-- ----------------------------------------------------------------------------
-- SECTION 5: DATABASE TRIGGERS
-- Reference: Lecture Note 5 (Row-Level Trigger with FOR EACH ROW)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_payment_audit;

DELIMITER $$
CREATE TRIGGER trg_after_payment_audit
AFTER INSERT ON PAYMENT_TRANSACTION
FOR EACH ROW
BEGIN
    -- Log transaction event into audit_logs if table exists
    INSERT INTO audit_logs (action, table_name, record_id, details, created_at)
    VALUES (
        'PAYMENT_RECORDED',
        'PAYMENT_TRANSACTION',
        NEW.payment_id,
        CONCAT('Ref: ', NEW.transaction_reference, ', Amount: $', NEW.amount, ', Order: #', NEW.order_id),
        NOW()
    );
END$$
DELIMITER ;

-- ----------------------------------------------------------------------------
-- SECTION 6: DATA CONTROL LANGUAGE (DCL) - ROLES & AUTHORIZATION
-- Reference: Lecture Note 8 (CREATE ROLE, GRANT Privileges)
-- ----------------------------------------------------------------------------
-- Create analyst role with read-only access to analytical views
CREATE ROLE IF NOT EXISTS analytics_viewer;
GRANT SELECT ON v_quarterly_sales_report TO analytics_viewer;
GRANT SELECT ON v_top_selling_products TO analytics_viewer;
GRANT SELECT ON v_category_order_totals TO analytics_viewer;
GRANT SELECT ON v_customer_order_summary TO analytics_viewer;
