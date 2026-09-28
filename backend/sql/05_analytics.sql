-- check previous tables available or not
DROP VIEW IF EXISTS v_customer_order_summary;
DROP VIEW IF EXISTS v_category_order_totals;
DROP VIEW IF EXISTS v_top_selling_products;
DROP VIEW IF EXISTS v_quarterly_sales_report;

CREATE TABLE IF NOT EXISTS PAYMENT_TRANSACTION (
    payment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    transaction_reference VARCHAR(100) NOT NULL UNIQUE,
    processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (payment_id),
    CONSTRAINT fk_payment_order
        FOREIGN KEY (order_id) REFERENCES ORDERS(order_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_payment_order_id
    ON PAYMENT_TRANSACTION (order_id);

CREATE INDEX idx_payment_processed_at
    ON PAYMENT_TRANSACTION (processed_at);

CREATE INDEX idx_orders_order_date_payment_status
    ON ORDERS (order_date, payment_status);

CREATE VIEW v_quarterly_sales_report AS
SELECT
    YEAR(o.order_date) AS sales_year,
    EXTRACT(QUARTER FROM o.order_date) AS sales_quarter,
    COUNT(DISTINCT o.order_id) AS total_orders,
    SUM(oi.quantity * oi.unit_price) AS gross_revenue,
    SUM(CASE
            WHEN o.payment_status = 'Paid' THEN oi.quantity * oi.unit_price
            ELSE 0
        END) AS net_collected_revenue,
    SUM(oi.quantity) AS total_units_sold
FROM ORDERS o
LEFT JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY YEAR(o.order_date), EXTRACT(QUARTER FROM o.order_date)
ORDER BY sales_year, sales_quarter;

CREATE VIEW v_top_selling_products AS
SELECT
    product_name,
    brand,
    category_name,
    total_revenue,
    DENSE_RANK() OVER (ORDER BY total_revenue DESC) AS revenue_rank
FROM (
    SELECT
        p.product_name,
        p.brand,
        c.category_name,
        SUM(oi.quantity * oi.unit_price) AS total_revenue
    FROM order_items oi
    JOIN product_variants pv ON pv.variant_id = oi.variant_id
    JOIN products p ON p.product_id = pv.product_id
    LEFT JOIN categories c ON c.category_id = p.category_id
    GROUP BY p.product_name, p.brand, c.category_name
) ranked_products
ORDER BY total_revenue DESC;

CREATE VIEW v_category_order_totals AS
SELECT
    cat.category_name,
    SUM(oi.quantity * oi.unit_price) AS total_category_revenue,
    COUNT(DISTINCT o.order_id) AS total_orders
FROM categories cat
LEFT JOIN products p ON p.category_id = cat.category_id
LEFT JOIN product_variants pv ON pv.product_id = p.product_id
LEFT JOIN order_items oi ON oi.variant_id = pv.variant_id
LEFT JOIN ORDERS o ON o.order_id = oi.order_id
GROUP BY cat.category_name WITH ROLLUP;

CREATE VIEW v_customer_order_summary AS
SELECT
    c.customer_id,
    c.customer_name,
    tc.city_name,
    COUNT(o.order_id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0) AS lifetime_spending,
    SUM(CASE WHEN o.payment_status = 'Paid' THEN 1 ELSE 0 END) AS paid_orders,
    SUM(CASE WHEN o.payment_status = 'Pending' THEN 1 ELSE 0 END) AS pending_orders,
    COALESCE(SUM(CASE WHEN o.payment_status = 'Paid' THEN o.total_amount ELSE 0 END), 0) AS paid_order_value,
    COALESCE(SUM(CASE WHEN o.payment_status = 'Pending' THEN o.total_amount ELSE 0 END), 0) AS pending_order_value
FROM CUSTOMER c
LEFT JOIN TEXAS_CITY tc ON tc.city_id = c.city_id
LEFT JOIN ORDERS o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.customer_name, tc.city_name
ORDER BY lifetime_spending DESC;
