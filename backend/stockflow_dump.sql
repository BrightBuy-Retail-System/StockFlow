-- ========================================================
-- StockFlow Database Dump from TiDB Cloud
-- Generated automatically for Railway MySQL Import
-- ========================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Table structure for `PAYMENT_TRANSACTION`
DROP TABLE IF EXISTS `PAYMENT_TRANSACTION`;
CREATE TABLE `PAYMENT_TRANSACTION` (
  `payment_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `transaction_reference` varchar(100) NOT NULL,
  `processed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`) ,
  UNIQUE KEY `transaction_reference` (`transaction_reference`),
  KEY `fk_payment_order` (`order_id`),
  KEY `idx_payment_order_id` (`order_id`),
  KEY `idx_payment_processed_at` (`processed_at`),
  CONSTRAINT `fk_payment_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=60001;

-- Dumping data for `PAYMENT_TRANSACTION` (9 records)
INSERT INTO `PAYMENT_TRANSACTION` (`payment_id`, `order_id`, `amount`, `transaction_reference`, `processed_at`) VALUES
  (1, 1, '1299.00', 'TXN-5E12A4FC32D8', '2026-10-07 05:03:26'),
  (30001, 420002, '2899.98', 'TXN-BRIGHT-2026-1000', '2026-01-15 10:30:00'),
  (30002, 420003, '599.97', 'TXN-BRIGHT-2026-1001', '2026-02-10 14:15:00'),
  (30003, 420004, '239.00', 'TXN-BRIGHT-2026-1002', '2026-04-05 09:00:00'),
  (30004, 420005, '497.00', 'TXN-BRIGHT-2026-1003', '2026-05-20 16:45:00'),
  (30005, 420006, '2599.98', 'TXN-BRIGHT-2026-1004', '2026-07-12 11:20:00'),
  (30006, 420007, '4499.97', 'TXN-BRIGHT-2026-1005', '2026-08-25 13:10:00'),
  (30007, 420008, '2419.98', 'TXN-BRIGHT-2026-1006', '2026-09-18 15:50:00'),
  (30008, 420009, '3498.98', 'TXN-BRIGHT-2026-1007', '2026-10-02 08:30:00');

-- Table structure for `audit_logs`
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `event_action` varchar(50) NOT NULL,
  `event_details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`) ,
  KEY `fk_audit_user` (`user_id`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=60002;

-- Dumping data for `audit_logs` (6 records)
INSERT INTO `audit_logs` (`log_id`, `user_id`, `event_action`, `event_details`, `ip_address`, `created_at`) VALUES
  (1, 1, 'SYSTEM_INIT', 'Initial database schema and table constraints applied.', '127.0.0.1', '2026-01-10 08:05:00'),
  (2, 2, 'PRODUCT_CREATE', 'Added product VoltBook Pro 15 with SKUs VB-15-16GB-512 and VB-15-32GB-1TB.', '192.168.1.12', '2026-01-20 11:05:00'),
  (3, 4, 'USER_LOGIN', 'Customer authentication successful via web client.', '45.121.91.55', '2026-03-01 07:20:00'),
  (4, 4, 'ORDER_CHECKOUT', 'Placed Order #1 for amount $1305.48 via Texas shipping route.', '45.121.91.55', '2026-03-01 07:30:05'),
  (5, 3, 'SHIPMENT_DISPATCH', 'Shipment TX-TRK-9081242 dispatched from Gulf Coast Hub.', '10.0.4.15', '2026-03-05 14:15:30'),
  (30002, 4, 'PAYMENT_RECORDED', 'Txn Ref: TXN-5E12A4FC32D8 | Amount: $1299.00 | Status: Paid | Order #1', '127.0.0.1', '2026-10-07 05:03:27');

-- Table structure for `cart_items`
DROP TABLE IF EXISTS `cart_items`;
CREATE TABLE `cart_items` (
  `cart_item_id` int NOT NULL AUTO_INCREMENT,
  `cart_id` int NOT NULL,
  `variant_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`cart_item_id`) ,
  UNIQUE KEY `uq_cart_variant` (`cart_id`,`variant_id`),
  KEY `fk_cart_items_variant` (`variant_id`),
  CONSTRAINT `fk_cart_items_cart` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`cart_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=660002;

-- Dumping data for `cart_items` (12 records)
INSERT INTO `cart_items` (`cart_item_id`, `cart_id`, `variant_id`, `quantity`) VALUES
  (3, 2, 8, 2),
  (60014, 1, 3, 1),
  (60015, 1, 5, 2),
  (60016, 120003, 3, 1),
  (60017, 120003, 5, 2),
  (180002, 120002, 2, 1),
  (210002, 120002, 60041, 1),
  (240002, 210002, 5, 2),
  (240005, 210002, 60041, 1),
  (240008, 210002, 60068, 1),
  (390002, 150002, 60017, 1),
  (630002, 90002, 60068, 2);

-- Table structure for `carts`
DROP TABLE IF EXISTS `carts`;
CREATE TABLE `carts` (
  `cart_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cart_id`) ,
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fk_carts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=330002;

-- Dumping data for `carts` (11 records)
INSERT INTO `carts` (`cart_id`, `user_id`, `updated_at`) VALUES
  (1, 4, '2026-09-15 11:05:57'),
  (2, 5, '2026-09-15 11:05:57'),
  (90002, 150002, '2026-10-06 13:02:49'),
  (120002, 150003, '2026-10-06 15:21:11'),
  (120003, 120002, '2026-10-06 15:26:28'),
  (150002, 30002, '2026-10-06 18:05:48'),
  (180002, 180002, '2026-10-07 15:25:13'),
  (210002, 150004, '2026-10-09 04:41:26'),
  (240002, 210005, '2026-10-13 06:24:12'),
  (270002, 240002, '2026-10-13 06:56:15'),
  (300002, 270002, '2026-10-13 13:19:10');

-- Table structure for `categories`
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(120) NOT NULL,
  PRIMARY KEY (`category_id`) ,
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=60002;

-- Dumping data for `categories` (13 records)
INSERT INTO `categories` (`category_id`, `name`, `slug`) VALUES
  (1, 'Laptops & Computers', 'laptops-computers'),
  (2, 'Smart Devices & Audio', 'smart-devices-audio'),
  (3, 'Computer Accessories', 'accessories'),
  (4, 'Storage & Networking', 'storage-networking'),
  (30002, 'Smartphones & Tablets', 'smartphones-tablets'),
  (30003, 'Smart Audio & Headphones', 'smart-audio-headphones'),
  (30004, 'Wearables & Smartwatches', 'wearables-smartwatches'),
  (30005, 'Gaming Consoles & Gear', 'gaming-consoles-gear'),
  (30006, 'Cameras & Drones', 'cameras-drones'),
  (30007, 'Smart Home & IoT', 'smart-home-iot'),
  (30008, 'Electronic Toys & STEM', 'electronic-toys-stem'),
  (30009, 'Power Banks & Chargers', 'power-banks-chargers'),
  (30010, 'Car Electronics & Mounts', 'car-electronics');

-- Table structure for `email_verifications`
DROP TABLE IF EXISTS `email_verifications`;
CREATE TABLE `email_verifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(120) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `otp_code` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) ,
  KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=60001;

-- Dumping data for `email_verifications` (4 records)
INSERT INTO `email_verifications` (`id`, `email`, `username`, `password_hash`, `otp_code`, `expires_at`, `created_at`) VALUES
  (1, 'amara.silva99@test.com', 'Amara Silva', '$2b$12$QBgcmTR7RxmMIjvvbdtFUepdIf91iAfF6nld0tluV2g10hcvE8K4.', '323637', '2026-10-13 06:22:28', '2026-10-13 06:12:28'),
  (2, 'amara.silva999@test.com', 'Amara Silva', '$2b$12$.LglEFPXAgovN.jiEPKo7.8AhB0BYhMwLgsVh5dcGM.Wt9v6uQ8bS', '535502', '2026-10-13 06:24:09', '2026-10-13 06:14:09'),
  (3, 'amara.silva888@test.com', 'Amara Silva', '$2b$12$59td8ruyy02ZRpnI2aZfJeffhPVA2X7ioP5aFcxBxDFChEI8Sw99e', '920290', '2026-10-13 06:26:14', '2026-10-13 06:16:14'),
  (30005, 'ghyasirusanjaya@gmail.com', 'Yasiru Sanjaya', '$2b$12$QdteBunhQnBLsZRSrp4mFeEIVkato9rvYjJrlZn.9Irwo9BkL/Xfu', '862985', '2026-10-13 07:13:49', '2026-10-13 07:03:49');

-- Table structure for `inventory`
DROP TABLE IF EXISTS `inventory`;
CREATE TABLE `inventory` (
  `inventory_id` int NOT NULL AUTO_INCREMENT,
  `variant_id` int NOT NULL,
  `stock_quantity` int NOT NULL DEFAULT '0',
  `low_stock_threshold` int NOT NULL DEFAULT '10',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`inventory_id`) ,
  UNIQUE KEY `variant_id` (`variant_id`),
  CONSTRAINT `fk_inventory_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=90002;

-- Dumping data for `inventory` (77 records)
INSERT INTO `inventory` (`inventory_id`, `variant_id`, `stock_quantity`, `low_stock_threshold`, `updated_at`) VALUES
  (1, 1, 9, 10, '2026-10-14 07:11:03'),
  (2, 2, 21, 5, '2026-10-07 15:59:51'),
  (3, 3, 67, 15, '2026-10-07 17:21:14'),
  (4, 4, 5, 15, '2026-10-07 15:52:37'),
  (5, 5, 56, 10, '2026-10-07 15:34:09'),
  (6, 6, 35, 10, '2026-09-15 11:05:55'),
  (7, 7, 50, 12, '2026-09-15 11:05:55'),
  (8, 8, 3, 10, '2026-10-07 16:01:00'),
  (60002, 60002, 35, 10, '2026-10-09 07:59:46'),
  (60003, 60003, 25, 10, '2026-10-09 07:59:47'),
  (60004, 60004, 10, 10, '2026-10-09 07:59:47'),
  (60005, 60005, 30, 10, '2026-10-09 07:59:47'),
  (60006, 60006, 18, 10, '2026-10-09 07:59:48'),
  (60007, 60007, 28, 10, '2026-10-09 07:59:48'),
  (60008, 60008, 22, 10, '2026-10-09 07:59:48'),
  (60009, 60009, 21, 10, '2026-10-10 07:39:55'),
  (60010, 60010, 12, 10, '2026-10-09 07:59:49'),
  (60011, 60011, 14, 10, '2026-10-09 07:59:50'),
  (60012, 60012, 8, 10, '2026-10-09 07:59:50'),
  (60013, 60013, 15, 10, '2026-10-09 07:59:50'),
  (60014, 60014, 9, 10, '2026-10-09 07:59:51'),
  (60015, 60015, 20, 10, '2026-10-09 07:59:51'),
  (60016, 60016, 11, 10, '2026-10-09 07:59:51'),
  (60017, 60017, 16, 10, '2026-10-13 06:01:56'),
  (60018, 60018, 5, 10, '2026-10-09 07:59:52'),
  (60019, 60019, 45, 10, '2026-10-09 07:59:53'),
  (60020, 60020, 38, 10, '2026-10-09 07:59:53'),
  (60021, 60021, 20, 10, '2026-10-09 07:59:53'),
  (60022, 60022, 49, 10, '2026-10-13 13:36:12'),
  (60023, 60023, 32, 10, '2026-10-09 07:59:54'),
  (60024, 60024, 60, 10, '2026-10-09 07:59:54'),
  (60025, 60025, 40, 10, '2026-10-09 07:59:55'),
  (60026, 60026, 25, 10, '2026-10-09 07:59:55'),
  (60027, 60027, 18, 10, '2026-10-09 07:59:55'),
  (60028, 60028, 24, 10, '2026-10-13 06:01:56'),
  (60029, 60029, 19, 10, '2026-10-10 07:41:07'),
  (60030, 60030, 15, 10, '2026-10-09 07:59:57'),
  (60031, 60031, 25, 10, '2026-10-09 07:59:57'),
  (60032, 60032, 16, 10, '2026-10-09 07:59:58'),
  (60033, 60033, 20, 10, '2026-10-09 07:59:58'),
  (60034, 60034, 24, 10, '2026-10-09 07:59:59'),
  (60035, 60035, 35, 10, '2026-10-09 07:59:59'),
  (60036, 60036, 28, 10, '2026-10-09 08:00:00'),
  (60037, 60037, 18, 10, '2026-10-09 08:00:00'),
  (60038, 60038, 10, 10, '2026-10-09 08:00:00'),
  (60039, 60039, 14, 10, '2026-10-09 08:00:01'),
  (60040, 60040, 10, 10, '2026-10-09 08:00:02'),
  (60041, 60041, 9, 10, '2026-10-10 13:15:40'),
  (60042, 60042, 30, 10, '2026-10-09 08:00:03'),
  (60043, 60043, 16, 10, '2026-10-09 08:00:03');
INSERT INTO `inventory` (`inventory_id`, `variant_id`, `stock_quantity`, `low_stock_threshold`, `updated_at`) VALUES
  (60044, 60044, 40, 10, '2026-10-09 08:00:04'),
  (60045, 60045, 25, 10, '2026-10-09 08:00:05'),
  (60046, 60046, 18, 10, '2026-10-09 08:00:05'),
  (60047, 60047, 35, 10, '2026-10-09 08:00:06'),
  (60048, 60048, 10, 10, '2026-10-09 08:00:07'),
  (60049, 60049, 12, 10, '2026-10-09 08:00:07'),
  (60050, 60050, 25, 10, '2026-10-09 08:00:07'),
  (60051, 60051, 30, 10, '2026-10-09 08:00:08'),
  (60052, 60052, 22, 10, '2026-10-13 14:42:21'),
  (60053, 60053, 8, 10, '2026-10-09 08:00:08'),
  (60055, 60055, 52, 10, '2026-10-12 04:44:24'),
  (60056, 60056, 25, 10, '2026-10-09 08:00:10'),
  (60057, 60057, 30, 10, '2026-10-09 08:00:10'),
  (60058, 60058, 55, 10, '2026-10-09 08:00:11'),
  (60059, 60059, 40, 10, '2026-10-09 08:00:11'),
  (60060, 60060, 25, 10, '2026-10-09 08:00:11'),
  (60061, 60061, 20, 10, '2026-10-09 08:00:11'),
  (60062, 60062, 18, 10, '2026-10-09 08:00:12'),
  (60063, 60063, 42, 10, '2026-10-09 08:00:12'),
  (60064, 60064, 30, 10, '2026-10-09 08:00:13'),
  (60065, 60065, 15, 10, '2026-10-09 08:00:13'),
  (60066, 60066, 35, 10, '2026-10-09 08:00:14'),
  (60067, 60067, 25, 10, '2026-10-09 08:00:14'),
  (60068, 60068, 36, 10, '2026-10-13 14:47:23'),
  (60069, 60069, 20, 10, '2026-10-09 08:00:15'),
  (60070, 60070, 45, 10, '2026-10-09 08:00:16'),
  (60071, 60071, 35, 10, '2026-10-09 08:00:16');

-- Table structure for `order_items`
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `order_item_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `variant_id` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`order_item_id`) ,
  KEY `fk_order_items_order` (`order_id`),
  KEY `fk_order_items_variant` (`variant_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=570002;

-- Dumping data for `order_items` (75 records)
INSERT INTO `order_items` (`order_item_id`, `order_id`, `variant_id`, `unit_price`, `quantity`) VALUES
  (1, 1, 1, '1299.99', 1),
  (2, 2, 4, '199.99', 1),
  (3, 3, 6, '119.50', 1),
  (30002, 30002, 1, '1299.99', 1),
  (60002, 60002, 1, '1299.99', 1),
  (90002, 90002, 1, '1299.99', 1),
  (90003, 90003, 1, '1299.99', 1),
  (90004, 90004, 1, '1299.99', 2),
  (120002, 120002, 1, '1299.99', 1),
  (120003, 120003, 1, '1299.99', 1),
  (120004, 120004, 1, '1299.99', 2),
  (120005, 120005, 1, '1299.99', 1),
  (150002, 150002, 1, '1299.99', 1),
  (150003, 150003, 1, '1299.99', 1),
  (150004, 150004, 1, '1299.99', 2),
  (150005, 150005, 1, '1299.99', 1),
  (150006, 150006, 1, '1299.99', 1),
  (150007, 150007, 1, '1299.99', 1),
  (150008, 150008, 1, '1299.99', 1),
  (180002, 180002, 1, '1299.99', 1),
  (180003, 180003, 1, '1299.99', 1),
  (180004, 180004, 1, '1299.99', 2),
  (180005, 180005, 1, '1299.99', 1),
  (210002, 210002, 1, '1299.99', 1),
  (210003, 210003, 1, '1299.99', 1),
  (210004, 210004, 1, '1299.99', 2),
  (210005, 210005, 1, '1299.99', 1),
  (240002, 240002, 1, '1299.99', 1),
  (240003, 240003, 1, '1299.99', 1),
  (240004, 240004, 1, '1299.99', 2),
  (240005, 240005, 1, '1299.99', 1),
  (270002, 270002, 1, '1299.99', 1),
  (270003, 270003, 1, '1299.99', 1),
  (270004, 270004, 1, '1299.99', 2),
  (270005, 270005, 1, '1299.99', 1),
  (300002, 300002, 1, '1299.99', 1),
  (300003, 300003, 1, '1299.99', 1),
  (300004, 300004, 1, '1299.99', 2),
  (300005, 300005, 1, '1299.99', 1),
  (330002, 330002, 1, '1299.99', 1),
  (330003, 330003, 1, '1299.99', 1),
  (330004, 330004, 1, '1299.99', 2),
  (360002, 360002, 1, '1299.99', 1),
  (360003, 360003, 1, '1299.99', 1),
  (360004, 360004, 1, '1299.99', 2),
  (360005, 360005, 1, '1299.99', 1),
  (390002, 390002, 3, '199.99', 1),
  (420002, 420002, 1, '1299.99', 1),
  (420003, 420002, 2, '1599.99', 1),
  (420004, 420003, 3, '199.99', 2);
INSERT INTO `order_items` (`order_item_id`, `order_id`, `variant_id`, `unit_price`, `quantity`) VALUES
  (420005, 420003, 4, '199.99', 1),
  (420006, 420004, 5, '119.50', 1),
  (420007, 420004, 6, '119.50', 1),
  (420008, 420005, 7, '159.00', 2),
  (420009, 420005, 8, '179.00', 1),
  (420010, 420006, 60002, '1199.99', 1),
  (420011, 420006, 60003, '1399.99', 1),
  (420012, 420007, 60004, '1599.99', 2),
  (420013, 420007, 60005, '1299.99', 1),
  (420014, 420008, 60006, '1419.99', 1),
  (420015, 420008, 60007, '999.99', 1),
  (420016, 420009, 60008, '1099.99', 2),
  (420017, 420009, 60009, '1299.00', 1),
  (420018, 420010, 60010, '1699.00', 1),
  (420019, 420010, 60011, '3499.00', 1),
  (420020, 420011, 60012, '3999.00', 2),
  (420021, 420011, 60013, '2199.99', 1),
  (450002, 450002, 60068, '649.99', 2),
  (480002, 480002, 60022, '299.00', 1),
  (480003, 480002, 60068, '649.99', 1),
  (510002, 510002, 60068, '649.99', 1),
  (540002, 540002, 1, '1299.99', 1),
  (540003, 540003, 1, '1299.99', 1),
  (540004, 540004, 1, '1299.99', 2),
  (540005, 540005, 1, '1299.99', 1);

-- Table structure for `orders`
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `order_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `shipment_id` int DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `status` enum('PENDING','CONFIRMED','SHIPPED','CANCELLED','DELIVERED') NOT NULL DEFAULT 'PENDING',
  `placed_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `service_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `shipping_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `delivery_type` enum('SHIP','PICKUP') NOT NULL DEFAULT 'SHIP',
  `recipient_name` varchar(150) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `shipping_address` text DEFAULT NULL,
  `billing_address` text DEFAULT NULL,
  `payment_status` enum('Pending','Paid','Refunded') DEFAULT 'Pending',
  PRIMARY KEY (`order_id`) ,
  UNIQUE KEY `shipment_id` (`shipment_id`),
  KEY `fk_orders_user` (`user_id`),
  KEY `idx_orders_placed_payment` (`placed_at`,`payment_status`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_orders_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`shipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=570002;

-- Dumping data for `orders` (64 records)
INSERT INTO `orders` (`order_id`, `user_id`, `shipment_id`, `total_amount`, `status`, `placed_at`, `subtotal`, `service_fee`, `shipping_fee`, `delivery_type`, `recipient_name`, `phone`, `shipping_address`, `billing_address`, `payment_status`) VALUES
  (1, 4, 1, '1305.48', 'CONFIRMED', '2026-03-01 07:30:00', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Paid'),
  (2, 5, 2, '205.98', 'SHIPPED', '2026-03-04 18:22:00', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (3, 4, 3, '124.49', 'CONFIRMED', '2026-03-05 21:05:00', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (30002, 4, 30002, '1304.98', 'PENDING', '2026-09-29 07:49:58', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (60002, 4, 60002, '1304.98', 'PENDING', '2026-10-01 03:57:08', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (90002, 150002, 90002, '1304.98', 'SHIPPED', '2026-10-01 10:31:26', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (90003, 150002, 90003, '1304.98', 'SHIPPED', '2026-10-01 10:31:33', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (90004, 4, 90004, '2604.97', 'CANCELLED', '2026-10-01 10:31:39', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (120002, 4, 120002, '1304.98', 'PENDING', '2026-10-04 06:04:10', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (120003, 4, 120003, '1304.98', 'SHIPPED', '2026-10-04 06:04:19', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (120004, 4, 120004, '2604.97', 'CANCELLED', '2026-10-04 06:04:27', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (120005, 4, 120005, '1304.98', 'PENDING', '2026-10-04 06:04:33', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (150002, 4, 150002, '1304.98', 'PENDING', '2026-10-04 06:21:02', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (150003, 4, 150003, '1304.98', 'SHIPPED', '2026-10-04 06:21:08', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (150004, 4, 150004, '2604.97', 'CANCELLED', '2026-10-04 06:21:13', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (150005, 4, 150005, '1304.98', 'PENDING', '2026-10-04 06:21:19', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (150006, 150002, 150006, '1304.98', 'PENDING', '2026-10-04 06:23:20', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (150007, 150002, 150007, '1304.98', 'PENDING', '2026-10-04 06:23:35', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (150008, 150002, 150008, '1304.98', 'PENDING', '2026-10-04 06:24:01', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (180002, 4, 180002, '1304.98', 'PENDING', '2026-10-04 06:38:46', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (180003, 4, 180003, '1304.98', 'SHIPPED', '2026-10-04 06:38:52', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (180004, 4, 180004, '2604.97', 'CANCELLED', '2026-10-04 06:39:00', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (180005, 4, 180005, '1304.98', 'PENDING', '2026-10-04 06:39:06', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (210002, 4, 210002, '1304.98', 'PENDING', '2026-10-04 15:06:55', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (210003, 4, 210003, '1304.98', 'SHIPPED', '2026-10-04 15:07:02', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (210004, 4, 210004, '2604.97', 'CANCELLED', '2026-10-04 15:07:09', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (210005, 4, 210005, '1304.98', 'PENDING', '2026-10-04 15:07:15', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (240002, 4, 270002, '1304.98', 'PENDING', '2026-10-06 13:37:10', '1299.99', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (240003, 4, 270003, '1304.98', 'SHIPPED', '2026-10-06 13:37:19', '1299.99', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (240004, 4, 270004, '2604.97', 'CANCELLED', '2026-10-06 13:37:27', '2599.98', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (240005, 4, 270005, '1304.98', 'PENDING', '2026-10-06 13:37:34', '1299.99', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (270002, 4, 300002, '1304.98', 'PENDING', '2026-10-06 13:54:37', '1299.99', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (270003, 4, 300003, '1304.98', 'SHIPPED', '2026-10-06 13:54:45', '1299.99', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (270004, 4, 300004, '2604.97', 'CANCELLED', '2026-10-06 13:54:53', '2599.98', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (270005, 4, 300006, '1304.98', 'PENDING', '2026-10-06 13:57:14', '1299.99', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (300002, 4, 330002, '1304.98', 'PENDING', '2026-10-06 14:39:37', '1299.99', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (300003, 4, 330003, '1304.98', 'SHIPPED', '2026-10-06 14:39:44', '1299.99', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (300004, 4, 330004, '2604.97', 'CANCELLED', '2026-10-06 14:39:51', '2599.98', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (300005, 4, 330005, '1304.98', 'PENDING', '2026-10-06 14:39:56', '1299.99', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (330002, 4, 360002, '1304.98', 'PENDING', '2026-10-07 05:02:37', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (330003, 4, 360003, '1304.98', 'SHIPPED', '2026-10-07 05:02:47', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (330004, 4, 360004, '2604.97', 'CANCELLED', '2026-10-07 05:02:59', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (360002, 4, 390002, '1304.98', 'PENDING', '2026-10-07 10:37:00', '1299.99', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (360003, 4, 390003, '1304.98', 'SHIPPED', '2026-10-07 10:37:07', '1299.99', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (360004, 4, 390004, '2604.97', 'CANCELLED', '2026-10-07 10:37:21', '2599.98', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (360005, 4, 390005, '1304.98', 'PENDING', '2026-10-07 10:37:28', '1299.99', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (390002, 150002, 420002, '422.45', 'CONFIRMED', '2026-10-07 12:04:12', '199.99', '217.47', '4.99', 'SHIP', 'Test Customer', '0771234567', 'Shilpa, Gurugammanaya, 5 th mile post, Nannapurawa, Bibila, Dallas, 91500', 'Shilpa, Gurugammanaya, 5 th mile post, Nannapurawa, Bibila, Dallas, 91500', 'Pending'),
  (420002, 4, 450002, '2899.98', 'CONFIRMED', '2026-01-15 10:30:00', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Paid'),
  (420003, 5, 450003, '599.97', 'CONFIRMED', '2026-02-10 14:15:00', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Paid'),
  (420004, 30002, 450004, '239.00', 'CONFIRMED', '2026-04-05 09:00:00', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Paid');
INSERT INTO `orders` (`order_id`, `user_id`, `shipment_id`, `total_amount`, `status`, `placed_at`, `subtotal`, `service_fee`, `shipping_fee`, `delivery_type`, `recipient_name`, `phone`, `shipping_address`, `billing_address`, `payment_status`) VALUES
  (420005, 120002, 450005, '497.00', 'CONFIRMED', '2026-05-20 16:45:00', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Paid'),
  (420006, 150002, 450006, '2599.98', 'CONFIRMED', '2026-07-12 11:20:00', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Paid'),
  (420007, 4, 450007, '4499.97', 'CONFIRMED', '2026-08-25 13:10:00', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Paid'),
  (420008, 5, 450008, '2419.98', 'SHIPPED', '2026-09-18 15:50:00', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Paid'),
  (420009, 30002, 450009, '3498.98', 'CONFIRMED', '2026-10-02 08:30:00', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Paid'),
  (420010, 120002, 450010, '5198.00', 'PENDING', '2026-10-08 12:00:00', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (420011, 150002, 450011, '10197.99', 'CONFIRMED', '2026-10-09 10:15:00', '0.00', '0.00', '0.00', 'SHIP', NULL, NULL, NULL, NULL, 'Pending'),
  (450002, 150002, 480002, '1522.44', 'CONFIRMED', '2026-10-10 13:00:15', '1299.98', '217.47', '4.99', 'SHIP', 'Test Customer', '(214) 555-0199', '1201 Elm Street, Suite 450, Dallas, TX 75270, United States', '1201 Elm Street, Suite 450, Dallas, TX 75270, United States', 'Pending'),
  (480002, 270002, 510002, '1171.45', 'CONFIRMED', '2026-10-13 13:36:12', '948.99', '217.47', '4.99', 'SHIP', 'Prageeth Chamuditha', '(214) 555-0199', '1201 Elm Street, Suite 450, Dallas, TX 75270, United States', '1201 Elm Street, Suite 450, Dallas, TX 75270, United States', 'Pending'),
  (510002, 150002, 540002, '876.45', 'PENDING', '2026-10-13 14:47:22', '649.99', '217.47', '8.99', 'SHIP', 'chenith Customer', '12345678910', 'meeraniya street, El Paso, TX 12345, United States', 'meeraniya street, El Paso, TX 12345, United States', 'Pending'),
  (540002, 4, 570002, '1304.98', 'PENDING', '2026-10-14 07:09:20', '1299.99', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (540003, 4, 570003, '1304.98', 'SHIPPED', '2026-10-14 07:10:15', '1299.99', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (540004, 4, 570004, '2604.97', 'CANCELLED', '2026-10-14 07:10:44', '2599.98', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending'),
  (540005, 4, 570005, '1304.98', 'PENDING', '2026-10-14 07:11:02', '1299.99', '0.00', '4.99', 'SHIP', 'Sarah Jenkins', '', '', '', 'Pending');

-- Table structure for `password_resets`
DROP TABLE IF EXISTS `password_resets`;
CREATE TABLE `password_resets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `otp_code` varchar(10) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) ,
  KEY `idx_email_otp` (`email`,`otp_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30001;

-- Table structure for `payments`
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `transaction_ref` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_status` enum('INITIATED','SUCCESS','FAILED','REFUNDED') DEFAULT 'INITIATED',
  `processed_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`) ,
  UNIQUE KEY `order_id` (`order_id`),
  UNIQUE KEY `transaction_ref` (`transaction_ref`),
  CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=420002;

-- Dumping data for `payments` (43 records)
INSERT INTO `payments` (`payment_id`, `order_id`, `payment_method`, `transaction_ref`, `amount`, `payment_status`, `processed_at`) VALUES
  (1, 1, 'Credit Card (Visa)', 'TXN-PAY-88231019', '1305.48', 'SUCCESS', '2026-03-01 07:31:12'),
  (2, 2, 'Stripe Checkout', 'TXN-PAY-88231020', '205.98', 'SUCCESS', '2026-03-04 18:23:45'),
  (3, 3, 'Credit Card (Mastercard)', 'TXN-PAY-88231021', '124.49', 'SUCCESS', '2026-03-05 21:06:03'),
  (30002, 120002, 'CREDIT_CARD', 'TX-PAY-202610041134-649DCF', '1304.98', 'INITIATED', '2026-10-04 06:04:11'),
  (30003, 120003, 'CREDIT_CARD', 'TX-PAY-202610041134-D2BE4B', '1304.98', 'INITIATED', '2026-10-04 06:04:20'),
  (30004, 120004, 'CREDIT_CARD', 'TX-PAY-202610041134-73C49D', '2604.97', 'INITIATED', '2026-10-04 06:04:28'),
  (30005, 120005, 'CREDIT_CARD', 'TX-PAY-202610041134-5887CE', '1304.98', 'INITIATED', '2026-10-04 06:04:33'),
  (60002, 150002, 'CREDIT_CARD', 'TX-PAY-202610041151-93DFBA', '1304.98', 'INITIATED', '2026-10-04 06:21:02'),
  (60003, 150003, 'CREDIT_CARD', 'TX-PAY-202610041151-687247', '1304.98', 'INITIATED', '2026-10-04 06:21:08'),
  (60004, 150004, 'CREDIT_CARD', 'TX-PAY-202610041151-860068', '2604.97', 'INITIATED', '2026-10-04 06:21:14'),
  (60005, 150005, 'CREDIT_CARD', 'TX-PAY-202610041151-E04B5B', '1304.98', 'INITIATED', '2026-10-04 06:21:19'),
  (90002, 180002, 'CREDIT_CARD', 'TX-PAY-202610041208-9BDC3A', '1304.98', 'INITIATED', '2026-10-04 06:38:46'),
  (90003, 180003, 'CREDIT_CARD', 'TX-PAY-202610041208-4EB1DE', '1304.98', 'INITIATED', '2026-10-04 06:38:53'),
  (90004, 180004, 'CREDIT_CARD', 'TX-PAY-202610041209-280878', '2604.97', 'INITIATED', '2026-10-04 06:39:01'),
  (90005, 180005, 'CREDIT_CARD', 'TX-PAY-202610041209-25DF13', '1304.98', 'INITIATED', '2026-10-04 06:39:07'),
  (120002, 210002, 'CREDIT_CARD', 'TX-PAY-202610042036-AA42C4', '1304.98', 'INITIATED', '2026-10-04 15:06:56'),
  (120003, 210003, 'CREDIT_CARD', 'TX-PAY-202610042037-3B66B5', '1304.98', 'INITIATED', '2026-10-04 15:07:02'),
  (120004, 210004, 'CREDIT_CARD', 'TX-PAY-202610042037-C592B1', '2604.97', 'INITIATED', '2026-10-04 15:07:09'),
  (120005, 210005, 'CREDIT_CARD', 'TX-PAY-202610042037-34AA9C', '1304.98', 'INITIATED', '2026-10-04 15:07:16'),
  (150002, 240002, 'CREDIT_CARD', 'TX-PAY-202610061907-61C9B5', '1304.98', 'SUCCESS', '2026-10-06 13:37:11'),
  (150003, 240003, 'CREDIT_CARD', 'TX-PAY-202610061907-D98D8A', '1304.98', 'SUCCESS', '2026-10-06 13:37:20'),
  (150004, 240004, 'CREDIT_CARD', 'TX-PAY-202610061907-5E3851', '2604.97', 'SUCCESS', '2026-10-06 13:37:28'),
  (150005, 240005, 'CREDIT_CARD', 'TX-PAY-202610061907-4E25D4', '1304.98', 'SUCCESS', '2026-10-06 13:37:34'),
  (180002, 270002, 'CREDIT_CARD', 'TX-PAY-202610061924-BE7531', '1304.98', 'SUCCESS', '2026-10-06 13:54:38'),
  (180003, 270003, 'CREDIT_CARD', 'TX-PAY-202610061924-D0112E', '1304.98', 'SUCCESS', '2026-10-06 13:54:45'),
  (180004, 270004, 'CREDIT_CARD', 'TX-PAY-202610061924-9FF42A', '2604.97', 'SUCCESS', '2026-10-06 13:54:53'),
  (180005, 270005, 'CREDIT_CARD', 'TX-PAY-202610061927-C63E11', '1304.98', 'SUCCESS', '2026-10-06 13:57:15'),
  (210002, 300002, 'CREDIT_CARD', 'TX-PAY-202610062009-5F6E49', '1304.98', 'SUCCESS', '2026-10-06 14:39:38'),
  (210003, 300003, 'CREDIT_CARD', 'TX-PAY-202610062009-E3DF1C', '1304.98', 'SUCCESS', '2026-10-06 14:39:44'),
  (210004, 300004, 'CREDIT_CARD', 'TX-PAY-202610062009-597021', '2604.97', 'SUCCESS', '2026-10-06 14:39:52'),
  (210005, 300005, 'CREDIT_CARD', 'TX-PAY-202610062009-60F199', '1304.98', 'SUCCESS', '2026-10-06 14:39:57'),
  (240002, 360002, 'CREDIT_CARD', 'TX-PAY-202610071607-8978C5', '1304.98', 'SUCCESS', '2026-10-07 10:37:00'),
  (240003, 360003, 'CREDIT_CARD', 'TX-PAY-202610071607-60C359', '1304.98', 'SUCCESS', '2026-10-07 10:37:07'),
  (240004, 360004, 'CREDIT_CARD', 'TX-PAY-202610071607-EBE4A1', '2604.97', 'SUCCESS', '2026-10-07 10:37:22'),
  (240005, 360005, 'CREDIT_CARD', 'TX-PAY-202610071607-9DC572', '1304.98', 'SUCCESS', '2026-10-07 10:37:28'),
  (270002, 390002, 'CREDIT_CARD', 'TX-PAY-202610071734-F4FB8C', '422.45', 'SUCCESS', '2026-10-07 12:04:12'),
  (300002, 450002, 'COD', 'TX-COD-202610101300-2C28EB', '1522.44', 'INITIATED', '2026-10-10 13:00:16'),
  (330002, 480002, 'CREDIT_CARD', 'TX-CRED-202610131906-A99967', '1171.45', 'SUCCESS', '2026-10-13 13:36:12'),
  (360002, 510002, 'CREDIT_CARD', 'TX-CRED-202610132016-974D6B', '876.45', 'SUCCESS', '2026-10-13 14:47:23'),
  (390002, 540002, 'CREDIT_CARD', 'TX-CRED-202610141239-0B0ADD', '1304.98', 'SUCCESS', '2026-10-14 07:09:27'),
  (390003, 540003, 'CREDIT_CARD', 'TX-CRED-202610141240-5AA456', '1304.98', 'SUCCESS', '2026-10-14 07:10:16'),
  (390004, 540004, 'CREDIT_CARD', 'TX-CRED-202610141240-DCDC68', '2604.97', 'SUCCESS', '2026-10-14 07:10:45'),
  (390005, 540005, 'CREDIT_CARD', 'TX-CRED-202610141241-019442', '1304.98', 'SUCCESS', '2026-10-14 07:11:03');

-- Table structure for `product_variants`
DROP TABLE IF EXISTS `product_variants`;
CREATE TABLE `product_variants` (
  `variant_id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `sku` varchar(64) NOT NULL,
  `attribute_name` varchar(50) NOT NULL,
  `attribute_value` varchar(50) NOT NULL,
  `price_override` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`variant_id`) ,
  UNIQUE KEY `sku` (`sku`),
  KEY `fk_variants_product` (`product_id`),
  CONSTRAINT `fk_variants_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=90002;

-- Dumping data for `product_variants` (77 records)
INSERT INTO `product_variants` (`variant_id`, `product_id`, `sku`, `attribute_name`, `attribute_value`, `price_override`) VALUES
  (1, 1, 'VB-15-16GB-512', 'Configuration', '16GB RAM / 512GB SSD', '1299.99'),
  (2, 1, 'VB-15-32GB-1TB', 'Configuration', '32GB RAM / 1TB SSD', '1599.99'),
  (3, 2, 'ES-ANC-BLK', 'Color', 'Matte Black', '199.99'),
  (4, 2, 'ES-ANC-SLV', 'Color', 'Lunar Silver', '199.99'),
  (5, 3, 'EM-KB-LIN', 'Switch Type', 'Linear Red Switches', '119.50'),
  (6, 3, 'EM-KB-TAC', 'Switch Type', 'Tactile Brown Switches', '119.50'),
  (7, 4, 'QS-NVME-2TB-STD', 'Heatsink Option', 'Standard Heat Spreader', '159.00'),
  (8, 4, 'QS-NVME-2TB-RGB', 'Heatsink Option', 'ARGB Aluminum Armor', '179.00'),
  (60002, 60002, 'IPH-16PM-256-BLK', 'Storage / Color', '256GB / Black Titanium', '1199.99'),
  (60003, 60002, 'IPH-16PM-512-NAT', 'Storage / Color', '512GB / Natural Titanium', '1399.99'),
  (60004, 60002, 'IPH-16PM-1TB-WHT', 'Storage / Color', '1TB / White Titanium', '1599.99'),
  (60005, 60003, 'SAM-S24U-256-GRY', 'Storage / Color', '256GB / Titanium Gray', '1299.99'),
  (60006, 60003, 'SAM-S24U-512-BLK', 'Storage / Color', '512GB / Titanium Black', '1419.99'),
  (60007, 60004, 'GOOG-PX9P-128-OBS', 'Storage / Color', '128GB / Obsidian', '999.99'),
  (60008, 60004, 'GOOG-PX9P-256-POR', 'Storage / Color', '256GB / Porcelain', '1099.99'),
  (60009, 60005, 'IPD-M4-13-256-BLK', 'Capacity / Color', '256GB WiFi / Space Black', '1299.00'),
  (60010, 60005, 'IPD-M4-13-512-SLV', 'Capacity / Color', '512GB WiFi+Cell / Silver', '1699.00'),
  (60011, 60006, 'MBP-16-M3M-36G-1T', 'Specs', '36GB Unified RAM / 1TB SSD Space Black', '3499.00'),
  (60012, 60006, 'MBP-16-M3M-48G-2T', 'Specs', '48GB Unified RAM / 2TB SSD Silver', '3999.00'),
  (60013, 60007, 'DELL-XPS15-I7-16G', 'Configuration', 'Intel i7 / 16GB / 512GB RTX 4060', '2199.99'),
  (60014, 60007, 'DELL-XPS15-I9-32G', 'Configuration', 'Intel i9 / 32GB / 1TB RTX 4070', '2699.99'),
  (60015, 60008, 'LEN-X1C-16G-512G', 'Configuration', 'Core Ultra 7 / 16GB / 512GB SSD', '1749.00'),
  (60016, 60008, 'LEN-X1C-32G-1TB', 'Configuration', 'Core Ultra 7 / 32GB / 1TB SSD', '2049.00'),
  (60017, 60009, 'ROG-G16-RTX4080-BLK', 'Edition', 'Eclipse Gray / 32GB RAM / 1TB', '2399.99'),
  (60018, 60009, 'ROG-G16-RTX4090-WHT', 'Edition', 'Platinum White / 32GB RAM / 2TB', '2899.99'),
  (60019, 60010, 'SNY-XM5-BLK', 'Color', 'Midnight Black', '399.99'),
  (60020, 60010, 'SNY-XM5-SLV', 'Color', 'Platinum Silver', '399.99'),
  (60021, 60010, 'SNY-XM5-BLU', 'Color', 'Midnight Blue', '399.99'),
  (60022, 60011, 'BOSE-QCU-BLK', 'Color', 'Black', '299.00'),
  (60023, 60011, 'BOSE-QCU-WHT', 'Color', 'White Smoke', '299.00'),
  (60024, 60012, 'APP-APP2-USBC', 'Model', 'White / MagSafe USB-C Case', '249.00'),
  (60025, 60013, 'JBL-CHG5-BLK', 'Color', 'Squad Black', '179.95'),
  (60026, 60013, 'JBL-CHG5-BLU', 'Color', 'Ocean Blue', '179.95'),
  (60027, 60013, 'JBL-CHG5-CAM', 'Color', 'Camouflage', '179.95'),
  (60028, 60014, 'AW-U2-49-ORG', 'Band Style', '49mm Titanium / Orange Ocean Band', '799.00'),
  (60029, 60014, 'AW-U2-49-BLU', 'Band Style', '49mm Titanium / Blue Alpine Loop', '799.00'),
  (60030, 60015, 'GAR-FNX7-SOL-BLK', 'Edition', 'Slate Gray DLC Titanium / Black Band', '899.99'),
  (60031, 60016, 'SAM-GWU-47-GRY', 'Color', 'Titanium Gray', '649.99'),
  (60032, 60016, 'SAM-GWU-47-WHT', 'Color', 'Titanium White', '649.99'),
  (60033, 60017, 'SONY-PS5-PRO-2TB', 'Edition', 'PS5 Pro Console 2TB SSD', '699.99'),
  (60034, 60018, 'MS-XBX-1TB-BLK', 'Color', 'Carbon Black 1TB', '499.99'),
  (60035, 60019, 'NTD-SWO-WHT', 'Color', 'White Joy-Con', '349.99'),
  (60036, 60019, 'NTD-SWO-NEON', 'Color', 'Neon Red/Neon Blue Joy-Con', '349.99'),
  (60037, 60020, 'VLV-SDECK-512-OLED', 'Capacity', '512GB NVMe SSD / Carrying Case', '549.00'),
  (60038, 60020, 'VLV-SDECK-1TB-OLED', 'Capacity', '1TB NVMe SSD / Anti-Glare Glass', '649.00'),
  (60039, 60021, 'DJI-M4P-COMBO-RC2', 'Bundle', 'Fly More Combo with DJI RC 2 Remote', '959.00'),
  (60040, 60022, 'SNY-A7IV-BODY', 'Configuration', 'Body Only', '2498.00'),
  (60041, 60022, 'SNY-A7IV-KIT2870', 'Configuration', 'With 28-70mm Zoom Lens', '2698.00'),
  (60042, 60023, 'GOPRO-H12-BLK', 'Bundle', 'Standard Hero12 Camera Pack', '399.99'),
  (60043, 60024, 'DJI-OP3-CREATOR', 'Package', 'Creator Combo with DJI Mic 2', '669.00');
INSERT INTO `product_variants` (`variant_id`, `product_id`, `sku`, `attribute_name`, `attribute_value`, `price_override`) VALUES
  (60044, 60025, 'HUE-START-4B-E26', 'Kit', '4 A19 Bulbs + Smart Hue Bridge', '199.99'),
  (60045, 60026, 'NEST-THERM-POL-SS', 'Finish', 'Polished Silver Stainless', '279.99'),
  (60046, 60026, 'NEST-THERM-POL-OBS', 'Finish', 'Polished Obsidian', '279.99'),
  (60047, 60027, 'RING-VDB-PRO2-NIK', 'Faceplate', 'Satin Nickel Hardwired', '249.99'),
  (60048, 60028, 'ROBO-S8PU-BLK', 'Color', 'Obsidian Black', '1199.99'),
  (60049, 60028, 'ROBO-S8PU-WHT', 'Color', 'Pure White', '1199.99'),
  (60050, 60029, 'LEGO-MIND-5IN1', 'Kit', 'Standard 949-Piece Kit', '359.99'),
  (60051, 60030, 'SPH-BOLT-CLR', 'Shell', 'Clear Waterproof Shell', '179.99'),
  (60052, 60031, 'MBLOCK-MBOT2-BLU', 'Edition', 'Anodized Blue Chassis', '139.99'),
  (60053, 60032, 'DJI-ROBO-S1', 'Model', 'RoboMaster S1 Complete Set', '549.00'),
  (60055, 60034, 'ANK-737-120W-BLK', 'Color', 'Matte Black', '79.99'),
  (60056, 60035, 'BELK-3IN1-WHT', 'Color', 'White', '149.99'),
  (60057, 60035, 'BELK-3IN1-BLK', 'Color', 'Black', '149.99'),
  (60058, 60036, 'LOGI-MXM3S-GRF', 'Color', 'Graphite', '99.99'),
  (60059, 60036, 'LOGI-MXM3S-PLG', 'Color', 'Pale Gray', '99.99'),
  (60060, 60037, 'KEY-Q1P-RED-BLK', 'Switch / Color', 'K Pro Red (Linear) / Carbon Black', '199.00'),
  (60061, 60037, 'KEY-Q1P-BRN-SLV', 'Switch / Color', 'K Pro Brown (Tactile) / Silver Gray', '199.00'),
  (60062, 60038, 'DELL-U3223QE-32', 'Display', '32-inch 4K UHD IPS Black', '799.99'),
  (60063, 60039, 'SAM-990P-2TB-STD', 'Capacity', '2TB NVMe M.2 Standard', '189.99'),
  (60064, 60039, 'SAM-990P-2TB-HSK', 'Capacity', '2TB NVMe M.2 with Heatsink', '209.99'),
  (60065, 60039, 'SAM-990P-4TB-HSK', 'Capacity', '4TB NVMe M.2 with Heatsink', '359.99'),
  (60066, 60040, 'SAND-EXT-1TB', 'Capacity', '1TB USB 3.2 Gen 2x2', '139.99'),
  (60067, 60040, 'SAND-EXT-2TB', 'Capacity', '2TB USB 3.2 Gen 2x2', '219.99'),
  (60068, 60041, 'ASUS-GT-AXE16K', 'Model', 'Quad-Band WiFi 6E Router', '649.99'),
  (60069, 60042, 'VIOFO-A229P-DUAL', 'Channel', '2-Channel Front + Rear 4K/2K', '299.99'),
  (60070, 60043, 'IOT-EOTW-DASH', 'Mounting', 'Suction Cup Dashboard & Windshield', '49.95'),
  (60071, 60043, 'IOT-EOTW-VENT', 'Mounting', 'Air Vent Clip Edition', '44.95');

-- Table structure for `products`
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `product_id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `base_price` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_id`) ,
  KEY `fk_products_category` (`category_id`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=90002;

-- Dumping data for `products` (48 records)
INSERT INTO `products` (`product_id`, `category_id`, `title`, `description`, `image_url`, `base_price`, `is_active`, `created_at`) VALUES
  (1, 1, 'VoltBook Pro 15', 'High-performance 15-inch development workstation with 10-hour battery life.', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80', '1299.99', 1, '2026-01-20 11:00:00'),
  (2, 2, 'EchoSound ANC Headphones', 'Wireless noise-canceling over-ear headphones with 40mm drivers.', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80', '199.99', 1, '2026-01-21 11:30:00'),
  (3, 3, 'ErgoMech Mechanical Keyboard', 'Hot-swappable mechanical keyboard with gasket mount and PBT keycaps.', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80', '119.50', 1, '2026-01-22 13:00:00'),
  (4, 4, 'QuantumSpeed 2TB NVMe SSD', 'PCIe Gen 4.0 M.2 Internal Solid State Drive with read speeds up to 7450 MB/s.', 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80', '159.00', 1, '2026-01-25 15:00:00'),
  (30002, 1, 'Test Product (updated)', 'Created by test_catalog.py - safe to delete', NULL, '19.99', 1, '2026-09-28 17:41:29'),
  (30003, 3, 'Test Product (updated)', 'Created by test_catalog.py - safe to delete', NULL, '19.99', 0, '2026-09-28 17:42:26'),
  (60002, 30002, 'iPhone 16 Pro Max', 'Titanium design with A18 Pro chip, 48MP Fusion camera system, and all-day battery life.', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80', '1199.99', 1, '2026-10-09 07:59:46'),
  (60003, 30002, 'Samsung Galaxy S24 Ultra', 'Galaxy AI-powered smartphone with titanium frame, 200MP camera, and embedded S Pen.', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80', '1299.99', 1, '2026-10-09 07:59:47'),
  (60004, 30002, 'Google Pixel 9 Pro', 'Google Tensor G4 engineered for advanced Gemini AI, triple pro camera, and 7 years of OS updates.', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80', '999.99', 1, '2026-10-09 07:59:48'),
  (60005, 30002, 'Apple iPad Pro 13-inch (M4)', 'Ultra Retina XDR OLED display powered by Apple M4 chip with breakthrough thinness.', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80', '1299.00', 1, '2026-10-09 07:59:49'),
  (60006, 1, 'Apple MacBook Pro 16" (M3 Max)', 'Extreme workstation performance with 16-core CPU, 40-core GPU, and Liquid Retina XDR display.', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80', '3499.00', 1, '2026-10-09 07:59:49'),
  (60007, 1, 'Dell XPS 15 OLED Laptop', 'InfinityEdge 3.5K OLED touchscreen, Intel Core i9 processor, NVIDIA GeForce RTX 4070 graphics.', 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=80', '2199.99', 1, '2026-10-09 07:59:50'),
  (60008, 1, 'Lenovo ThinkPad X1 Carbon Gen 12', 'Ultralight business laptop with Intel Core Ultra 7 processor and legendary spill-resistant keyboard.', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80', '1749.00', 1, '2026-10-09 07:59:51'),
  (60009, 1, 'ASUS ROG Zephyrus G16 Gaming Laptop', 'Slim esports gaming laptop featuring OLED 240Hz Nebula Display and NVIDIA RTX 4080.', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80', '2399.99', 1, '2026-10-09 07:59:52'),
  (60010, 30003, 'Sony WH-1000XM5 Wireless Headphones', 'Industry-leading active noise canceling with Auto NC Optimizer and 30-hour battery life.', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80', '399.99', 1, '2026-10-09 07:59:52'),
  (60011, 30003, 'Bose QuietComfort Ultra Earbuds', 'Spatial audio with world-class noise cancellation and CustomTune personalized sound technology.', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80', '299.00', 1, '2026-10-09 07:59:53'),
  (60012, 30003, 'Apple AirPods Pro (2nd Generation USB-C)', 'Pro-level Active Noise Cancellation with Adaptive Audio and Personalized Spatial Audio.', 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&auto=format&fit=crop&q=80', '249.00', 1, '2026-10-09 07:59:54'),
  (60013, 30003, 'JBL Charge 5 Portable Bluetooth Speaker', 'IP67 waterproof and dustproof speaker with built-in powerbank and 20 hours of playtime.', 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80', '179.95', 1, '2026-10-09 07:59:54'),
  (60014, 30004, 'Apple Watch Ultra 2 Titanium', 'The ultimate sports and adventure watch with aerospace-grade titanium case and precision dual-frequency GPS.', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80', '799.00', 1, '2026-10-09 07:59:55'),
  (60015, 30004, 'Garmin Fenix 7 Pro Solar GPS Watch', 'Multisport GPS smartwatch with Power Sapphire solar charging lens and built-in LED flashlight.', 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80', '899.99', 1, '2026-10-09 07:59:56'),
  (60016, 30004, 'Samsung Galaxy Watch Ultra 47mm', 'Cushion design with Grade 4 titanium frame, dual GPS, and endurance tracking for extreme sports.', 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80', '649.99', 1, '2026-10-09 07:59:57'),
  (60017, 30005, 'PlayStation 5 Pro Digital Edition', 'Next-gen console with PlayStation Spectral Super Resolution (PSSR), advanced ray tracing, and 2TB SSD.', 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80', '699.99', 1, '2026-10-09 07:59:58'),
  (60018, 30005, 'Xbox Series X 1TB Console', 'Fastest and most powerful Xbox with 12 teraflops of raw processing power and 4K gaming at 120fps.', 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800&auto=format&fit=crop&q=80', '499.99', 1, '2026-10-09 07:59:58'),
  (60019, 30005, 'Nintendo Switch OLED Model', 'Vibrant 7-inch OLED screen with wide adjustable stand, wired LAN dock, and 64GB internal storage.', 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800&auto=format&fit=crop&q=80', '349.99', 1, '2026-10-09 07:59:59'),
  (60020, 30005, 'Steam Deck OLED 512GB Handheld', 'HDR OLED display with faster downloads, longer battery life, and portable desktop gaming power.', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', '549.00', 1, '2026-10-09 08:00:00'),
  (60021, 30006, 'DJI Mini 4 Pro Drone Fly More Combo', 'Sub-249g ultra-lightweight drone with omnidirectional obstacle sensing, 4K/60fps HDR, and 20km transmission.', 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800&auto=format&fit=crop&q=80', '959.00', 1, '2026-10-09 08:00:01'),
  (60022, 30006, 'Sony Alpha 7 IV Full-Frame Camera', '33MP Exmor R CMOS sensor with 4K 60p recording and real-time eye autofocus for photo and video creators.', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80', '2498.00', 1, '2026-10-09 08:00:01'),
  (60023, 30006, 'GoPro HERO12 Black Action Camera', 'Rugged waterproof action camera with HyperSmooth 6.0 stabilization and 5.3K60 video capability.', 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&auto=format&fit=crop&q=80', '399.99', 1, '2026-10-09 08:00:02'),
  (60024, 30006, 'DJI Osmo Pocket 3 Creator Combo', 'Pocket-sized 1-inch sensor vlog camera with 3-axis mechanical stabilization and 2-inch rotatable screen.', 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop&q=80', '669.00', 1, '2026-10-09 08:00:03'),
  (60025, 30007, 'Philips Hue Smart LED Starter Kit', 'Millions of colors and warm-to-cool white light controllable via smart assistant and Hue Bridge.', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80', '199.99', 1, '2026-10-09 08:00:04'),
  (60026, 30007, 'Google Nest Learning Thermostat 4th Gen', 'Energy Star smart thermostat that learns your preferred temperatures and adapts for optimal efficiency.', 'https://images.unsplash.com/photo-1558002038-1055907df827?w=800&auto=format&fit=crop&q=80', '279.99', 1, '2026-10-09 08:00:04'),
  (60027, 30007, 'Ring Video Doorbell Pro 2', '1536p HD Head-to-Toe Video with 3D Motion Detection, Bird\'s Eye View, and Two-Way Talk.', 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=800&auto=format&fit=crop&q=80', '249.99', 1, '2026-10-09 08:00:06'),
  (60028, 30007, 'Roborock S8 Pro Ultra Robot Vacuum', 'RockDock Ultra all-in-one docking station with auto-washing, auto-drying, and 6000Pa extreme suction.', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80', '1199.99', 1, '2026-10-09 08:00:06'),
  (60029, 30008, 'LEGO Mindstorms Robot Inventor 5-in-1 Kit', 'Build, code, and play with 5 unique motorized robots using Scratch-based visual coding and Bluetooth hub.', 'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=800&auto=format&fit=crop&q=80', '359.99', 1, '2026-10-09 08:00:07'),
  (60030, 30008, 'Sphero BOLT App-Enabled Robotic Ball', 'Programmable 8x8 LED matrix robot ball for STEM education, robotics learning, and obstacle navigation.', 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=800&auto=format&fit=crop&q=80', '179.99', 1, '2026-10-09 08:00:08'),
  (60031, 30008, 'Makeblock mBot2 STEM Educational Robot', 'Networked robot for computer science education with CyberPi microcontroller and intelligent motor encoders.', 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80', '139.99', 1, '2026-10-09 08:00:08'),
  (60032, 30008, 'DJI RoboMaster S1 Educational Robot', 'Intelligent educational robot equipped with omnidirectional Mecanum wheels, gimbal, and gel-bead blaster.', 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=800&auto=format&fit=crop&q=80', '549.00', 1, '2026-10-09 08:00:08'),
  (60033, 30009, 'Anker Prime 27,650mAh Power Bank (250W)', 'Massive 250W multi-port fast charging power bank with digital smart display and smart app controls.', 'https://images.unsplash.com/photo-1609592424364-16cf9b71ee3f?w=800&auto=format&fit=crop&q=80', '179.99', 0, '2026-10-09 08:00:09'),
  (60034, 30009, 'Anker 737 GaNPrime 120W USB-C Charger', 'Ultra-compact fast wall charger with PowerIQ 4.0 dynamic power distribution for 3 devices simultaneously.', 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80', '79.99', 1, '2026-10-09 08:00:09'),
  (60035, 30009, 'Belkin BoostCharge Pro 3-in-1 MagSafe', '15W fast wireless charging stand for iPhone, Apple Watch, and AirPods with premium stainless steel arm.', 'https://images.unsplash.com/photo-1622445262464-84b14e5ad0c8?w=800&auto=format&fit=crop&q=80', '149.99', 1, '2026-10-09 08:00:09'),
  (60036, 3, 'Logitech MX Master 3S Wireless Mouse', 'Quiet click ergonomic performance mouse with 8K DPI any-surface tracking and MagSpeed electromagnetic scroll.', 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80', '99.99', 1, '2026-10-09 08:00:10'),
  (60037, 3, 'Keychron Q1 Pro Wireless Mechanical Keyboard', 'Full aluminum CNC body 75% layout custom keyboard with hot-swappable switches and QMK/VIA support.', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80', '199.00', 1, '2026-10-09 08:00:11'),
  (60038, 3, 'Dell UltraSharp 32 4K USB-C Hub Monitor', 'IPS Black technology with 2000:1 contrast ratio, 90W power delivery, and built-in RJ45 Ethernet hub.', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80', '799.99', 1, '2026-10-09 08:00:12'),
  (60039, 4, 'Samsung 990 PRO 2TB PCIe 4.0 NVMe SSD', 'Blazing read/write speeds up to 7,450/6,900 MB/s engineered for high-end gaming and 4K/8K video production.', 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80', '189.99', 1, '2026-10-09 08:00:12'),
  (60040, 4, 'SanDisk Extreme PRO 1TB Portable SSD', 'Rugged drop-resistant NVMe portable solid state drive with IP65 dust/water resistance and 2000MB/s speeds.', 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=800&auto=format&fit=crop&q=80', '139.99', 1, '2026-10-09 08:00:13'),
  (60041, 4, 'ASUS ROG Rapture GT-AXE16000 Gaming Router', 'Quad-band WiFi 6E gaming router with dual 10G ports, 2.5G WAN, and Aura RGB customizable lighting.', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80', '649.99', 1, '2026-10-09 08:00:14'),
  (60042, 30010, 'VIOFO A229 Pro 4K Dual Dash Cam', 'Dual Sony STARVIS 2 sensors, 4K front and 2K rear HDR night vision, voice control, and 5GHz Wi-Fi.', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80', '299.99', 1, '2026-10-09 08:00:15'),
  (60043, 30010, 'iOttie Easy One Touch Wireless 2 Car Mount', 'Qi fast wireless charging dash and windshield mount with patented Easy One Touch locking mechanism.', 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=800&auto=format&fit=crop&q=80', '49.95', 1, '2026-10-09 08:00:15');

-- Table structure for `roles`
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`role_id`) ,
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30002;

-- Dumping data for `roles` (4 records)
INSERT INTO `roles` (`role_id`, `role_name`, `description`) VALUES
  (1, 'Customer', 'Standard registered buyer with shopping cart and order history access'),
  (2, 'Store Manager', 'Catalog and inventory administration access'),
  (3, 'Logistics Coordinator', 'Fulfillment, shipping status, and dispatch tracking access'),
  (4, 'Administrator', 'Full system access and audit log inspection');

-- Table structure for `shipments`
DROP TABLE IF EXISTS `shipments`;
CREATE TABLE `shipments` (
  `shipment_id` int NOT NULL AUTO_INCREMENT,
  `tracking_number` varchar(64) NOT NULL,
  `destination_city_id` int NOT NULL,
  `shipping_status` enum('PENDING','DISPATCHED','IN_TRANSIT','DELIVERED') DEFAULT 'PENDING',
  `estimated_arrival` date DEFAULT NULL,
  `dispatched_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `delivery_address` text DEFAULT NULL,
  `recipient_phone` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`shipment_id`) ,
  UNIQUE KEY `tracking_number` (`tracking_number`),
  KEY `fk_shipments_city` (`destination_city_id`),
  KEY `idx_shipments_destination` (`destination_city_id`),
  KEY `idx_shipments_status` (`shipping_status`),
  KEY `idx_shipments_estimated` (`estimated_arrival`),
  CONSTRAINT `fk_shipments_city` FOREIGN KEY (`destination_city_id`) REFERENCES `texas_cities` (`city_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=600002;

-- Dumping data for `shipments` (64 records)
INSERT INTO `shipments` (`shipment_id`, `tracking_number`, `destination_city_id`, `shipping_status`, `estimated_arrival`, `dispatched_at`, `delivered_at`, `delivery_address`, `recipient_phone`) VALUES
  (1, 'TX-TRK-9081241', 3, 'DELIVERED', '2026-03-02', '2026-03-01 09:00:00', '2026-03-02 15:40:00', NULL, NULL),
  (2, 'TX-TRK-9081242', 4, 'IN_TRANSIT', '2026-03-07', '2026-03-05 14:15:00', NULL, NULL, NULL),
  (3, 'TX-TRK-9081243', 1, 'IN_TRANSIT', '2026-03-08', '2026-03-06 08:30:00', NULL, NULL, NULL),
  (30002, 'TX-202609291319-986580', 1, 'IN_TRANSIT', '2026-09-30', NULL, NULL, NULL, NULL),
  (60002, 'TX-202610010927-4CBA1F', 1, 'IN_TRANSIT', '2026-10-02', NULL, NULL, NULL, NULL),
  (90002, 'TX-202610011601-975032', 1, 'DISPATCHED', '2026-10-02', '2026-10-13 16:34:08', NULL, NULL, NULL),
  (90003, 'TX-202610011601-91C78A', 1, 'DISPATCHED', '2026-10-02', '2026-10-01 10:31:35', NULL, NULL, NULL),
  (90004, 'TX-202610011601-5D189F', 1, 'IN_TRANSIT', '2026-10-02', NULL, NULL, NULL, NULL),
  (120002, 'TX-202610041134-A88A24', 1, 'PENDING', '2026-10-05', NULL, NULL, NULL, NULL),
  (120003, 'TX-202610041134-51D641', 1, 'DISPATCHED', '2026-10-05', '2026-10-04 06:04:22', NULL, NULL, NULL),
  (120004, 'TX-202610041134-2C41B6', 1, 'PENDING', '2026-10-05', NULL, NULL, NULL, NULL),
  (120005, 'TX-202610041134-17F663', 1, 'PENDING', '2026-10-05', NULL, NULL, NULL, NULL),
  (150002, 'TX-202610041151-1CCA95', 1, 'PENDING', '2026-10-05', NULL, NULL, NULL, NULL),
  (150003, 'TX-202610041151-88ED3D', 1, 'DISPATCHED', '2026-10-05', '2026-10-04 06:21:09', NULL, NULL, NULL),
  (150004, 'TX-202610041151-5188C4', 1, 'PENDING', '2026-10-05', NULL, NULL, NULL, NULL),
  (150005, 'TX-202610041151-F69945', 1, 'PENDING', '2026-10-05', NULL, NULL, NULL, NULL),
  (150006, 'TX-202610041153-6D8AE8', 1, 'PENDING', '2026-10-05', NULL, NULL, NULL, NULL),
  (150007, 'TX-202610041153-139558', 1, 'PENDING', '2026-10-05', NULL, NULL, NULL, NULL),
  (150008, 'TX-202610041154-29F7F4', 1, 'PENDING', '2026-10-05', NULL, NULL, NULL, NULL),
  (180002, 'TX-202610041208-8BB491', 1, 'PENDING', '2026-10-05', NULL, NULL, NULL, NULL),
  (180003, 'TX-202610041208-2F0580', 1, 'DISPATCHED', '2026-10-05', '2026-10-04 06:38:54', NULL, NULL, NULL),
  (180004, 'TX-202610041209-88889B', 1, 'PENDING', '2026-10-05', NULL, NULL, NULL, NULL),
  (180005, 'TX-202610041209-878271', 1, 'PENDING', '2026-10-05', NULL, NULL, NULL, NULL),
  (210002, 'TX-202610042036-93CB93', 1, 'PENDING', '2026-10-05', NULL, NULL, NULL, NULL),
  (210003, 'TX-202610042037-74C0BB', 1, 'DISPATCHED', '2026-10-05', '2026-10-04 15:07:04', NULL, NULL, NULL),
  (210004, 'TX-202610042037-522323', 1, 'PENDING', '2026-10-05', NULL, NULL, NULL, NULL),
  (210005, 'TX-202610042037-25B210', 1, 'PENDING', '2026-10-05', NULL, NULL, NULL, NULL),
  (270002, 'TX-202610061907-B02864', 1, 'PENDING', '2026-10-07', NULL, NULL, '', ''),
  (270003, 'TX-202610061907-27D5BD', 1, 'DISPATCHED', '2026-10-07', '2026-10-06 13:37:21', NULL, '', ''),
  (270004, 'TX-202610061907-5B33CE', 1, 'PENDING', '2026-10-07', NULL, NULL, '', ''),
  (270005, 'TX-202610061907-96815B', 1, 'PENDING', '2026-10-07', NULL, NULL, '', ''),
  (300002, 'TX-202610061924-C0964E', 1, 'PENDING', '2026-10-07', NULL, NULL, '', ''),
  (300003, 'TX-202610061924-9AC9F6', 1, 'DISPATCHED', '2026-10-07', '2026-10-06 13:54:47', NULL, '', ''),
  (300004, 'TX-202610061924-E5F3CB', 1, 'PENDING', '2026-10-07', NULL, NULL, '', ''),
  (300006, 'TX-202610061927-62CC0F', 1, 'PENDING', '2026-10-07', NULL, NULL, '', ''),
  (330002, 'TX-202610062009-E1FFDD', 1, 'PENDING', '2026-10-07', NULL, NULL, '', ''),
  (330003, 'TX-202610062009-E75ADD', 1, 'DISPATCHED', '2026-10-07', '2026-10-06 14:39:47', NULL, '', ''),
  (330004, 'TX-202610062009-41DB5F', 1, 'PENDING', '2026-10-07', NULL, NULL, '', ''),
  (330005, 'TX-202610062009-AE7543', 1, 'PENDING', '2026-10-07', NULL, NULL, '', ''),
  (360002, 'TX-202610071032-98D0FE', 1, 'PENDING', '2026-10-08', NULL, NULL, NULL, NULL),
  (360003, 'TX-202610071032-CBEEAB', 1, 'DISPATCHED', '2026-10-08', '2026-10-07 05:02:50', NULL, NULL, NULL),
  (360004, 'TX-202610071032-7B5232', 1, 'PENDING', '2026-10-08', NULL, NULL, NULL, NULL),
  (390002, 'TX-202610071607-9A5C8F', 1, 'PENDING', '2026-10-08', NULL, NULL, '', ''),
  (390003, 'TX-202610071607-0A6745', 1, 'DISPATCHED', '2026-10-08', '2026-10-07 10:37:17', NULL, '', ''),
  (390004, 'TX-202610071607-0DB3DC', 1, 'PENDING', '2026-10-08', NULL, NULL, '', ''),
  (390005, 'TX-202610071607-D89C7F', 1, 'PENDING', '2026-10-08', NULL, NULL, '', ''),
  (420002, 'TX-202610071734-1E3C7D', 1, 'PENDING', '2026-10-08', NULL, NULL, 'Shilpa, Gurugammanaya, 5 th mile post, Nannapurawa, Bibila, Dallas, 91500', '0771234567'),
  (450002, 'TX-BRIGHT-20260100', 1, 'DELIVERED', '2026-01-20', '2026-01-15 10:30:00', NULL, NULL, NULL),
  (450003, 'TX-BRIGHT-20260101', 2, 'DELIVERED', '2026-02-15', '2026-02-10 14:15:00', NULL, NULL, NULL),
  (450004, 'TX-BRIGHT-20260102', 3, 'DELIVERED', '2026-04-10', '2026-04-05 09:00:00', NULL, NULL, NULL);
INSERT INTO `shipments` (`shipment_id`, `tracking_number`, `destination_city_id`, `shipping_status`, `estimated_arrival`, `dispatched_at`, `delivered_at`, `delivery_address`, `recipient_phone`) VALUES
  (450005, 'TX-BRIGHT-20260103', 4, 'DELIVERED', '2026-05-25', '2026-05-20 16:45:00', NULL, NULL, NULL),
  (450006, 'TX-BRIGHT-20260104', 5, 'DELIVERED', '2026-07-17', '2026-07-12 11:20:00', NULL, NULL, NULL),
  (450007, 'TX-BRIGHT-20260105', 6, 'DELIVERED', '2026-09-01', '2026-08-25 13:10:00', NULL, NULL, NULL),
  (450008, 'TX-BRIGHT-20260106', 7, 'DISPATCHED', '2026-09-25', '2026-09-18 15:50:00', NULL, NULL, NULL),
  (450009, 'TX-BRIGHT-20260107', 8, 'IN_TRANSIT', '2026-10-09', '2026-10-02 08:30:00', NULL, NULL, NULL),
  (450010, 'TX-BRIGHT-20260108', 1, 'PENDING', '2026-10-13', NULL, NULL, NULL, NULL),
  (450011, 'TX-BRIGHT-20260109', 2, 'PENDING', '2026-10-14', NULL, NULL, NULL, NULL),
  (480002, 'TX-202610101300-C95F90', 1, 'PENDING', '2026-10-11', NULL, NULL, '1201 Elm Street, Suite 450, Dallas, TX 75270, United States', '(214) 555-0199'),
  (510002, 'TX-202610131906-562CB6', 1, 'PENDING', '2026-10-14', NULL, NULL, '1201 Elm Street, Suite 450, Dallas, TX 75270, United States', '(214) 555-0199'),
  (540002, 'TX-202610132016-0D2532', 6, 'PENDING', '2026-10-17', NULL, NULL, 'meeraniya street, El Paso, TX 12345, United States', '12345678910'),
  (570002, 'TX-202610141239-4C6BF1', 1, 'PENDING', '2026-10-15', NULL, NULL, '', ''),
  (570003, 'TX-202610141240-635556', 1, 'DISPATCHED', '2026-10-15', '2026-10-14 07:10:30', NULL, '', ''),
  (570004, 'TX-202610141240-8EA0C5', 1, 'PENDING', '2026-10-15', NULL, NULL, '', ''),
  (570005, 'TX-202610141241-DC7F4B', 1, 'PENDING', '2026-10-15', NULL, NULL, '', '');

-- Table structure for `texas_cities`
DROP TABLE IF EXISTS `texas_cities`;
CREATE TABLE `texas_cities` (
  `city_id` int NOT NULL AUTO_INCREMENT,
  `city_name` varchar(100) NOT NULL,
  `hub_name` varchar(100) NOT NULL,
  `base_lead_time_days` int NOT NULL DEFAULT '2',
  `shipping_fee` decimal(8,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`city_id`) ,
  UNIQUE KEY `city_name` (`city_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30002;

-- Dumping data for `texas_cities` (8 records)
INSERT INTO `texas_cities` (`city_id`, `city_name`, `hub_name`, `base_lead_time_days`, `shipping_fee`) VALUES
  (1, 'Dallas', 'DFW North Distribution Hub', 1, '4.99'),
  (2, 'Fort Worth', 'DFW West Distribution Hub', 1, '4.99'),
  (3, 'Austin', 'Central Texas Hub', 1, '5.49'),
  (4, 'Houston', 'Gulf Coast Logistics Hub', 2, '5.99'),
  (5, 'San Antonio', 'South Texas Metro Hub', 2, '5.99'),
  (6, 'El Paso', 'West Texas Border Gateway', 4, '8.99'),
  (7, 'Arlington', 'Mid-Cities Transit Station', 1, '4.99'),
  (8, 'Plano', 'North Texas Delivery Annex', 1, '4.99');

-- Table structure for `users`
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL DEFAULT '1',
  `full_name` varchar(100) NOT NULL,
  `email` varchar(120) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `is_verified` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`user_id`) ,
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_role` (`role_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=300002;

-- Dumping data for `users` (15 records)
INSERT INTO `users` (`user_id`, `role_id`, `full_name`, `email`, `password_hash`, `created_at`, `is_verified`) VALUES
  (1, 4, 'System Administrator', 'admin@stockflow.internal', '$2b$12$LjPWrHl7VTb4DXufcsfYNuYklwg5r4pzHR.ZdocgBm6wtMBT79JBq', '2026-01-10 08:00:00', 1),
  (2, 2, 'Elena Rostova', 'elena.rostova@brightbuy.com', '$2b$12$e8kG0gq7l7i.oZgI8nNq2.U3GgS7qM/oD1H0Zk8nO8l5P2Q5fV6g2', '2026-01-15 09:30:00', 1),
  (3, 3, 'Marcus Vance', 'marcus.vance@brightbuy.com', '$2b$12$e8kG0gq7l7i.oZgI8nNq2.U3GgS7qM/oD1H0Zk8nO8l5P2Q5fV6g2', '2026-02-01 10:15:00', 1),
  (4, 1, 'Sarah Jenkins', 'sarah.j@example.com', '$2b$12$e8kG0gq7l7i.oZgI8nNq2.U3GgS7qM/oD1H0Zk8nO8l5P2Q5fV6g2', '2026-02-10 14:20:00', 1),
  (5, 1, 'David Miller', 'dmiller@example.com', '$2b$12$e8kG0gq7l7i.oZgI8nNq2.U3GgS7qM/oD1H0Zk8nO8l5P2Q5fV6g2', '2026-02-18 16:45:00', 1),
  (30002, 1, 'Yasiru Sithum', 'yasiru1@email.com', '$2b$12$lR6j17OGIff1cg3ElvAMj.0vuUICFLVdWTAlAzZQ2cNWjxLgrfLVS', '2026-09-17 17:02:18', 1),
  (120002, 1, 'Nipun Sankalana', 'nipunsankalana98@gmail.com', '$2b$12$Fekgmirm9NFBwkoVf0NmHeRh8DE5L3Y4tDPjCuppN1z5G9Yizl1..', '2026-10-01 04:12:08', 1),
  (150002, 1, 'Test Customer', 'customer@stockflow.test', '$2b$12$HYM6cpvs/q4korTKzrC/feDhXhfd8gh9bpqTbGkSmhMsynKeiq3cO', '2026-10-01 10:13:29', 1),
  (150003, 2, 'Warehouse Manager', 'manager@stockflow.test', '$2b$12$Utl5Wd62bcEUH3qKLcUC3uYyRFXPI9SRaAMVAo4U/y.KpaEIum/9K', '2026-10-01 10:13:29', 1),
  (150004, 3, 'System Administrator', 'admin@stockflow.test', '$2b$12$wp2fJ0UHR7E9UpY9FwNdNuH988txk2W9pn.730ETcntP6yJW/Ptda', '2026-10-01 10:13:30', 1),
  (180002, 1, 'Yasiru Sithum2', 'yasirusithum2@gmail.com', '$2b$12$9o8hJWWtSiQlmM61QiFD4uFZgeeBBpLWM5/0FbK3bsvKxOQwoWu86', '2026-10-07 15:25:07', 1),
  (210002, 1, 'TestOTP_100', 'testotp100@example.com', '$2b$12$lpVM.7PTU1pOmCS5/oeQkeoG89EvM.cRoMOguGhkPbk6u8sFpy2Pa', '2026-10-13 06:20:09', 1),
  (210005, 1, 'John Silva', 'john.silva.test@gmail.com', '$2b$12$h.ClNv/Ay2EfKttgyW8b5e9z7KPBw3/TPD7J5U7j.HInYCSivATCe', '2026-10-13 06:24:06', 1),
  (240002, 1, 'Sithum Sanjaya', 'yasiru67gh@gmail.com', '$2b$12$dAKl2NayZrbHnEvwfChFeuCwkcpxl25Mxh94k.qO4Wi60bQ4YP7Lq', '2026-10-13 06:56:11', 1),
  (270002, 1, 'Prageeth Chamuditha', 'prageethchamuditha@gmail.com', '$2b$12$D2z/HBF.Pi.Fg14StPJk3ujLl4shJTK2TYeK8CwAhLQI.jC92fNw.', '2026-10-13 13:19:08', 1);

-- View structure for `v_category_order_totals`
DROP VIEW IF EXISTS `v_category_order_totals`;
CREATE ALGORITHM=UNDEFINED DEFINER=CURRENT_USER SQL SECURITY DEFINER VIEW `v_category_order_totals` (`category_name`, `total_category_revenue`, `total_orders`, `total_units_sold`) AS SELECT COALESCE(`c`.`name`, _UTF8MB4'ALL CATEGORIES (GRAND TOTAL)') AS `category_name`,COALESCE(SUM(`oi`.`quantity`*`oi`.`unit_price`), 0.00) AS `total_category_revenue`,COUNT(DISTINCT `o`.`order_id`) AS `total_orders`,COALESCE(SUM(`oi`.`quantity`), 0) AS `total_units_sold` FROM (((`StockFlow`.`categories` AS `c` LEFT JOIN `StockFlow`.`products` AS `p` ON `p`.`category_id`=`c`.`category_id`) LEFT JOIN `StockFlow`.`product_variants` AS `pv` ON `pv`.`product_id`=`p`.`product_id`) LEFT JOIN `StockFlow`.`order_items` AS `oi` ON `oi`.`variant_id`=`pv`.`variant_id`) LEFT JOIN `StockFlow`.`orders` AS `o` ON `o`.`order_id`=`oi`.`order_id` GROUP BY `c`.`name` WITH ROLLUP;

-- View structure for `v_customer_order_summary`
DROP VIEW IF EXISTS `v_customer_order_summary`;
CREATE ALGORITHM=UNDEFINED DEFINER=CURRENT_USER SQL SECURITY DEFINER VIEW `v_customer_order_summary` (`customer_id`, `customer_name`, `email`, `primary_city`, `total_orders`, `lifetime_spending`, `paid_orders`, `pending_orders`, `paid_order_value`, `pending_order_value`) AS SELECT `u`.`user_id` AS `customer_id`,`u`.`full_name` AS `customer_name`,`u`.`email` AS `email`,COALESCE(`tc`.`city_name`, _UTF8MB4'Texas Regional') AS `primary_city`,COUNT(DISTINCT `o`.`order_id`) AS `total_orders`,COALESCE(SUM(`o`.`total_amount`), 0.00) AS `lifetime_spending`,COALESCE(SUM(CASE WHEN `o`.`payment_status`=_UTF8MB4'Paid' THEN 1 ELSE 0 END), 0) AS `paid_orders`,COALESCE(SUM(CASE WHEN `o`.`payment_status`=_UTF8MB4'Pending' THEN 1 ELSE 0 END), 0) AS `pending_orders`,COALESCE(SUM(CASE WHEN `o`.`payment_status`=_UTF8MB4'Paid' THEN `o`.`total_amount` ELSE 0.00 END), 0.00) AS `paid_order_value`,COALESCE(SUM(CASE WHEN `o`.`payment_status`=_UTF8MB4'Pending' THEN `o`.`total_amount` ELSE 0.00 END), 0.00) AS `pending_order_value` FROM ((`StockFlow`.`users` AS `u` LEFT JOIN `StockFlow`.`orders` AS `o` ON `o`.`user_id`=`u`.`user_id`) LEFT JOIN `StockFlow`.`shipments` AS `s` ON `s`.`shipment_id`=`o`.`shipment_id`) LEFT JOIN `StockFlow`.`texas_cities` AS `tc` ON `tc`.`city_id`=`s`.`destination_city_id` GROUP BY `u`.`user_id`,`u`.`full_name`,`u`.`email`,`tc`.`city_name` ORDER BY `lifetime_spending` DESC;

-- View structure for `v_quarterly_sales_report`
DROP VIEW IF EXISTS `v_quarterly_sales_report`;
CREATE ALGORITHM=UNDEFINED DEFINER=CURRENT_USER SQL SECURITY DEFINER VIEW `v_quarterly_sales_report` (`sales_year`, `sales_quarter`, `total_orders`, `gross_revenue`, `net_collected_revenue`, `total_units_sold`, `moving_avg_quarterly_revenue`) AS SELECT YEAR(`o`.`placed_at`) AS `sales_year`,QUARTER(`o`.`placed_at`) AS `sales_quarter`,COUNT(DISTINCT `o`.`order_id`) AS `total_orders`,COALESCE(SUM(`oi`.`quantity`*`oi`.`unit_price`), 0.00) AS `gross_revenue`,COALESCE(SUM(CASE WHEN `o`.`payment_status`=_UTF8MB4'Paid' THEN `oi`.`quantity`*`oi`.`unit_price` ELSE 0.00 END), 0.00) AS `net_collected_revenue`,COALESCE(SUM(`oi`.`quantity`), 0) AS `total_units_sold`,AVG(COALESCE(SUM(`StockFlow`.`oi`.`quantity`*`StockFlow`.`oi`.`unit_price`), 0.00)) OVER (ORDER BY YEAR(`o`.`placed_at`),QUARTER(`o`.`placed_at`) ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) AS `moving_avg_quarterly_revenue` FROM `StockFlow`.`orders` AS `o` LEFT JOIN `StockFlow`.`order_items` AS `oi` ON `oi`.`order_id`=`o`.`order_id` GROUP BY YEAR(`o`.`placed_at`),QUARTER(`o`.`placed_at`) ORDER BY `sales_year`,`sales_quarter`;

-- View structure for `v_shipment_tracking_overview`
DROP VIEW IF EXISTS `v_shipment_tracking_overview`;
CREATE ALGORITHM=UNDEFINED DEFINER=CURRENT_USER SQL SECURITY DEFINER VIEW `v_shipment_tracking_overview` (`shipment_id`, `tracking_number`, `shipping_status`, `estimated_arrival`, `dispatched_at`, `delivered_at`, `delivery_address`, `recipient_phone`, `city_id`, `city_name`, `hub_name`, `base_lead_time_days`, `shipping_fee`, `order_id`, `user_id`, `order_status`, `total_amount`, `customer_name`) AS SELECT `s`.`shipment_id` AS `shipment_id`,`s`.`tracking_number` AS `tracking_number`,`s`.`shipping_status` AS `shipping_status`,`s`.`estimated_arrival` AS `estimated_arrival`,`s`.`dispatched_at` AS `dispatched_at`,`s`.`delivered_at` AS `delivered_at`,`s`.`delivery_address` AS `delivery_address`,`s`.`recipient_phone` AS `recipient_phone`,`c`.`city_id` AS `city_id`,`c`.`city_name` AS `city_name`,`c`.`hub_name` AS `hub_name`,`c`.`base_lead_time_days` AS `base_lead_time_days`,`c`.`shipping_fee` AS `shipping_fee`,`o`.`order_id` AS `order_id`,`o`.`user_id` AS `user_id`,`o`.`status` AS `order_status`,`o`.`total_amount` AS `total_amount`,`u`.`full_name` AS `customer_name` FROM ((`StockFlow`.`shipments` AS `s` JOIN `StockFlow`.`texas_cities` AS `c` ON `s`.`destination_city_id`=`c`.`city_id`) LEFT JOIN `StockFlow`.`orders` AS `o` ON `o`.`shipment_id`=`s`.`shipment_id`) LEFT JOIN `StockFlow`.`users` AS `u` ON `o`.`user_id`=`u`.`user_id`;

-- View structure for `v_texas_hub_shipment_stats`
DROP VIEW IF EXISTS `v_texas_hub_shipment_stats`;
CREATE ALGORITHM=UNDEFINED DEFINER=CURRENT_USER SQL SECURITY DEFINER VIEW `v_texas_hub_shipment_stats` (`city_id`, `city_name`, `hub_name`, `base_lead_time_days`, `shipping_fee`, `total_shipments`, `pending_count`, `dispatched_count`, `in_transit_count`, `delivered_count`) AS SELECT `c`.`city_id` AS `city_id`,`c`.`city_name` AS `city_name`,`c`.`hub_name` AS `hub_name`,`c`.`base_lead_time_days` AS `base_lead_time_days`,`c`.`shipping_fee` AS `shipping_fee`,COUNT(`s`.`shipment_id`) AS `total_shipments`,COALESCE(SUM(CASE WHEN `s`.`shipping_status`=_UTF8MB4'PENDING' THEN 1 ELSE 0 END), 0) AS `pending_count`,COALESCE(SUM(CASE WHEN `s`.`shipping_status`=_UTF8MB4'DISPATCHED' THEN 1 ELSE 0 END), 0) AS `dispatched_count`,COALESCE(SUM(CASE WHEN `s`.`shipping_status`=_UTF8MB4'IN_TRANSIT' THEN 1 ELSE 0 END), 0) AS `in_transit_count`,COALESCE(SUM(CASE WHEN `s`.`shipping_status`=_UTF8MB4'DELIVERED' THEN 1 ELSE 0 END), 0) AS `delivered_count` FROM `StockFlow`.`texas_cities` AS `c` LEFT JOIN `StockFlow`.`shipments` AS `s` ON `c`.`city_id`=`s`.`destination_city_id` GROUP BY `c`.`city_id`,`c`.`city_name`,`c`.`hub_name`,`c`.`base_lead_time_days`,`c`.`shipping_fee`;

-- View structure for `v_top_selling_products`
DROP VIEW IF EXISTS `v_top_selling_products`;
CREATE ALGORITHM=UNDEFINED DEFINER=CURRENT_USER SQL SECURITY DEFINER VIEW `v_top_selling_products` (`product_id`, `product_name`, `category_name`, `total_units_sold`, `total_revenue`, `revenue_rank`) AS SELECT `product_id` AS `product_id`,`product_name` AS `product_name`,`category_name` AS `category_name`,`total_units_sold` AS `total_units_sold`,`total_revenue` AS `total_revenue`,DENSE_RANK() OVER (ORDER BY `total_revenue` DESC) AS `revenue_rank` FROM (SELECT `p`.`product_id` AS `product_id`,`p`.`title` AS `product_name`,COALESCE(`c`.`name`, _UTF8MB4'Uncategorized') AS `category_name`,COALESCE(SUM(`oi`.`quantity`), 0) AS `total_units_sold`,COALESCE(SUM(`oi`.`quantity`*`oi`.`unit_price`), 0.00) AS `total_revenue` FROM ((`StockFlow`.`products` AS `p` JOIN `StockFlow`.`product_variants` AS `pv` ON `pv`.`product_id`=`p`.`product_id`) JOIN `StockFlow`.`order_items` AS `oi` ON `oi`.`variant_id`=`pv`.`variant_id`) LEFT JOIN `StockFlow`.`categories` AS `c` ON `c`.`category_id`=`p`.`category_id` GROUP BY `p`.`product_id`,`p`.`title`,`c`.`name`) AS `ranked_products` ORDER BY `total_revenue` DESC;

SET FOREIGN_KEY_CHECKS = 1;
