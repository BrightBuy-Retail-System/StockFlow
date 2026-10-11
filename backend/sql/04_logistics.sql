-- Table 1: Texas Regional Distribution Hubs & Municipalities
CREATE TABLE IF NOT EXISTS texas_cities (
    city_id              INT AUTO_INCREMENT PRIMARY KEY,
    city_name            VARCHAR(100) NOT NULL UNIQUE,
    hub_name             VARCHAR(100) NOT NULL,
    base_lead_time_days  INT NOT NULL DEFAULT 2,
    shipping_fee         DECIMAL(8,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB;

-- Table 2: Parcel Tracking & Dispatch Records
CREATE TABLE IF NOT EXISTS shipments (
    shipment_id          INT AUTO_INCREMENT PRIMARY KEY,
    tracking_number      VARCHAR(64) NOT NULL UNIQUE,
    destination_city_id  INT NOT NULL,
    shipping_status      ENUM('PENDING','DISPATCHED','IN_TRANSIT','DELIVERED') DEFAULT 'PENDING',
    estimated_arrival    DATE,
    dispatched_at        TIMESTAMP NULL,
    delivered_at         TIMESTAMP NULL,
    delivery_address     TEXT NULL,
    recipient_phone      VARCHAR(30) NULL,
    CONSTRAINT fk_shipment_city
        FOREIGN KEY (destination_city_id) REFERENCES texas_cities(city_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- SECTION 2: INDEX OPTIMIZATION (DDL)
-- Speed up destination routing, dispatch status filtering, and ETA ordering
CREATE INDEX idx_shipments_destination 
    ON shipments (destination_city_id);

CREATE INDEX idx_shipments_status 
    ON shipments (shipping_status);

CREATE INDEX idx_shipments_estimated 
    ON shipments (estimated_arrival);

-- SECTION 3: VIRTUAL RELATIONS (VIEWS) - Operational Analytics
-- VIEW 1: Texas Regional Hub Throughput & Performance Summary
-- Aggregates real-time shipment status counts per regional hub
DROP VIEW IF EXISTS v_texas_hub_shipment_stats;

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

-- VIEW 2: Complete Shipment Tracking & Order Audit View
-- Multi-table relational join linking shipments, hubs, customer accounts, and order headers
DROP VIEW IF EXISTS v_shipment_tracking_overview;

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

