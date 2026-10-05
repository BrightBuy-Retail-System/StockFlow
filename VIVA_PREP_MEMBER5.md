# 🎓 CS3043 Database Systems - Member 5 Viva Defense & Technical Reference Manual
**Project:** StockFlow (BrightBuy) - Smart Retail & Texas Logistics Platform  
**Member 5 Scope:** Analytics, Financial Reporting, and Payment Transaction Engine  
**Author:** Prageeth Chamuditha  
**Tech Stack:** Python Flask, TiDB Serverless (MySQL 8.0 ACID), React 19 + Vite, Vanilla CSS  

---

## 📋 Executive Overview & Member Division

| Member | Scope | Backend Route | Frontend View | Primary SQL Objects |
| :--- | :--- | :--- | :--- | :--- |
| **Member 1** | Catalog & Products | `routes/catalog.py` | `CatalogPage.jsx` | `categories`, `products`, `product_variants`, `inventory` |
| **Member 2** | Auth & Cart | `routes/auth_cart.py` | `AuthCartPage.jsx` | `roles`, `users`, `carts`, `cart_items` |
| **Member 3** | Orders & Checkout | `routes/orders.py` | `OrdersPage.jsx` | `orders`, `order_items` |
| **Member 4** | Logistics & Hubs | `routes/logistics.py` | `LogisticsPage.jsx` | `texas_cities`, `shipments`, `fn_calculate_delivery_days` |
| **Member 5 (You)** | **Analytics & Payments** | `routes/analytics.py` | `AnalyticsPage.jsx`, `PaymentPage.jsx` | `PAYMENT_TRANSACTION`, `v_quarterly_sales_report`, `v_top_selling_products`, `v_category_order_totals`, `v_customer_order_summary`, `sp_process_payment`, `trg_after_payment_audit` |

---

## 🔄 The 5-Step End-to-End Retail Flow (Demonstration Storyline)

When the examiner asks: *"Walk me through an order from start to finish across your team's modules,"* use this exact 5-step sequence:

```text
[Step 1: Catalog]      Customer selects hardware SKU -> Live inventory check
       │
[Step 2: Orders]       Member 3 triggers /api/orders/checkout:
                       - Validates customer entity & inventory
                       - Locks inventory row & decrements stock
                       - Creates order in `orders` (status = 'PENDING')
       │
[Step 3: Logistics]    Member 4 links shipment to Texas Hub:
                       - Computes lead-time via `texas_cities`
                       - Inserts record into `shipments` (tracking number generated)
       │
[Step 4: Payment]      Member 5 processes settlement via /api/analytics/payments/process:
                       - Pessimistic lock on order: `SELECT ... FOR UPDATE`
                       - Inserts record into `PAYMENT_TRANSACTION` with unique TXN reference
                       - Updates `orders.payment_status` ('Paid' for Card, 'Pending' for COD)
                       - Atomic COMMIT (or ROLLBACK on failure)
       │
[Step 5: Analytics]    Member 5 analytical engine auto-refreshes:
                       - `v_quarterly_sales_report` recalculates gross & net revenue
                       - `v_top_selling_products` recalculates DENSE_RANK()
                       - `v_category_order_totals` recalculates ROLLUP grand totals
                       - Admin dashboard reflects updated financials instantly without ETL!
```

---

## 🧠 Core CS3043 Viva Topics & Detailed Answers

### 1. Boyce-Codd Normal Form (BCNF) & 3NF
#### ❓ Examiner: *"Is your payment and analytics schema normalized to BCNF? Prove it."*
**Your Answer:**
> *"Yes. A relation is in **BCNF** if for every non-trivial functional dependency $X \to Y$, $X$ is a **superkey**.*
>
> *Let us examine `PAYMENT_TRANSACTION` ($PT$):*
> - *Schema:* `(payment_id, order_id, amount, transaction_reference, processed_at)`
> - *Candidate Keys:* `{payment_id}` and `{transaction_reference}` (both unique).
> - *Functional Dependencies:*
>   1. `payment_id -> {order_id, amount, transaction_reference, processed_at}` (LHS is primary key, hence a superkey).
>   2. `transaction_reference -> {payment_id, order_id, amount, processed_at}` (LHS is candidate key with unique constraint, hence a superkey).
>
> *Notice what is **NOT** in this table:*
> - *Customer address or name is NOT stored in `PAYMENT_TRANSACTION` (that would cause a transitive dependency through `order_id -> user_id -> customer_name`, violating 3NF/BCNF).*
> - *Order total amount is NOT redundantly copied; `amount` here represents the specific settled transaction amount (handling partial payments or currency reconciliation).*
> *Therefore, `PAYMENT_TRANSACTION` satisfies BCNF without update, insertion, or deletion anomalies."*

---

### 2. Window Functions: `DENSE_RANK()` vs `RANK()` vs `ROW_NUMBER()`
#### ❓ Examiner: *"Why did you use `DENSE_RANK()` in `v_top_selling_products` instead of standard `RANK()` or `ROW_NUMBER()`?"*
**Your Answer:**
> *"All three are SQL window ranking functions specified using `OVER (ORDER BY ...)`:
> 
> 1. **`ROW_NUMBER()`**: Strictly assigns a continuous sequence $(1, 2, 3, 4\dots)$. If two products generate identical revenue of \$50,000, one gets rank 1 and the other rank 2 arbitrarily. This is unfair for sales rankings.
> 2. **`RANK()`**: Handles ties by assigning the same rank, but **skips subsequent ranks**. If two products tie for #1, the ranking sequence is $(1, 1, 3)$.
> 3. **`DENSE_RANK()` (Our Choice)**: Handles ties with identical rank numbers **without skipping gaps**. If two products tie for #1, the next product is rank #2: $(1, 1, 2, 3\dots)$.
>
> *In an executive Top-10 leaderboard, we need consecutive, gapless tiers so that tying products do not artificially push subsequent high-value products off the board."*

---

### 3. Extended Aggregation: `GROUP BY ... WITH ROLLUP`
#### ❓ Examiner: *"What is `WITH ROLLUP` and how does it differ from `CUBE`?"*
**Your Answer:**
> - *"**`WITH ROLLUP`** is an OLAP aggregation clause that calculates hierarchical subtotals and grand totals in a single query execution from right to left across the grouping list:*
>   - *For `GROUP BY category, brand WITH ROLLUP`, it computes:*
>     1. *`(category, brand)` subtotal*
>     2. *`(category)` subtotal*
>     3. *`()` Grand Total (where both columns return `NULL`).*
> - *"**`CUBE`** computes all $2^N$ possible cross-tabulation combinations:*
>   - *`(category, brand)`, `(category)`, `(brand)`, and `()`.*
> - *In our project, `v_category_order_totals` uses `GROUP BY c.name WITH ROLLUP`. The database engine appends an automatic Grand Total row with `c.name = NULL`. We use `COALESCE(c.name, 'ALL CATEGORIES (GRAND TOTAL)')` to format that row cleanly for executive reports without making two separate API calls."*

---

### 4. Sliding Window Frame (Moving Average)
#### ❓ Examiner: *"Explain the moving average in `v_quarterly_sales_report`."*
**Your Answer:**
> *"The clause is:*
> ```sql
> AVG(SUM(oi.quantity * oi.unit_price)) OVER (
>     ORDER BY YEAR(o.placed_at), QUARTER(o.placed_at)
>     ROWS BETWEEN 1 PRECEDING AND CURRENT ROW
> ) AS moving_avg_quarterly_revenue
> ```
> - *Standard `GROUP BY` collapses individual quarterly records into a single aggregate.*
> - *A **Window Function** preserves each quarterly tuple while applying an aggregate over an ordered sliding window.*
> - *`ROWS BETWEEN 1 PRECEDING AND CURRENT ROW` defines a sliding window of **2 quarters** (the previous quarter plus the current quarter). This smooths seasonal purchasing volatility, allowing retail executives to see whether revenue is genuinely trending upward or downward."*

---

### 5. Virtual Views vs Materialized Views vs Physical Tables
#### ❓ Examiner: *"Why create Virtual Views instead of physical tables or running cron jobs to cache report tables?"*
**Your Answer:**
> *"We analyzed the trade-offs:*
> 1. **Data Freshness (Zero Lag):** Virtual Views store the SQL definition, not the data. The instant a customer pays for an order, querying `v_quarterly_sales_report` immediately includes that payment with 0 seconds latency. A materialized view or physical table requires periodic batch ETL, causing stale metrics.
> 2. **Storage Efficiency:** Views require 0 bytes of disk storage for row data.
> 3. **Security & Abstraction (DCL):** We created a dedicated role `analytics_viewer` and ran `GRANT SELECT ON v_top_selling_products TO analytics_viewer`. Analysts can query top products without possessing permissions to read customer passwords or credit card numbers in the underlying base tables.
> 4. **API Decoupling:** If the schema of `order_items` changes, we update the view definition once, and all backend endpoints continue functioning without code changes."*

---

### 6. ACID Implementation & Banking-Grade Integrity in `analytics.py`
#### ❓ Examiner: *"How does your payment endpoint ensure ACID properties?"*
**Your Answer:**
> *"In [backend/routes/analytics.py](file:///e:/github%20projects/bright-by-db/StockFlow/backend/routes/analytics.py):
> 
> 1. **Atomicity:**
>    - We set `conn.autocommit = False`.
>    - Both `INSERT INTO PAYMENT_TRANSACTION` and `UPDATE orders SET payment_status = ...` run in the same transaction block.
>    - If the server crashes or an exception occurs, `conn.rollback()` executes, guaranteeing that a payment record is never created without updating the order, and an order is never marked paid without a payment record.
> 2. **Consistency:**
>    - Guarded by schema constraints: `chk_payment_amount CHECK (amount > 0)` and `fk_payment_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE RESTRICT ON UPDATE CASCADE`.
> 3. **Isolation:**
>    - We execute `SELECT order_id, total_amount FROM orders WHERE order_id = %s FOR UPDATE`.
>    - This acquires an exclusive pessimistic row lock in InnoDB / TiDB, preventing race conditions (e.g., concurrent double-billing or two cashiers paying the same order simultaneously).
> 4. **Durability:**
>    - `conn.commit()` writes the transaction to the database engine's Write-Ahead Log (WAL) and Raft consensus log before returning HTTP 200."*

---

### 7. Parameterized Queries & Prepared Statements
#### ❓ Examiner: *"Why use `%s` parameterization instead of Python string formatting?"*
**Your Answer:**
> *"Lecture Note #7 covers Prepared Statements. If we wrote:*
> ```python
> cursor.execute(f"UPDATE orders SET payment_status = '{status}' WHERE order_id = {order_id}")
> ```
> *An attacker could supply an `order_id` containing `' OR '1'='1; DROP TABLE orders; --`. This is SQL Injection.*
>
> *By passing parameters as a tuple `cursor.execute(sql, (status, order_id))`, the driver uses parameterized prepared statements. The query blueprint is parsed and compiled first; all parameters are transferred separately and treated purely as literal string/numeric values, completely preventing SQL code injection."*

---

### 8. Database Triggers
#### ❓ Examiner: *"What is the purpose of `trg_after_payment_audit`?"*
**Your Answer:**
> *"Lecture Note #5 covers Row-Level Triggers (`FOR EACH ROW`).*
> *Our trigger executes `AFTER INSERT ON PAYMENT_TRANSACTION`. It reads transition values from the pseudo-record `NEW` (such as `NEW.payment_id`, `NEW.transaction_reference`, `NEW.amount`) and writes an immutable record to `audit_logs`.*
> *Because this logic resides inside the database engine, an audit entry is guaranteed even if a DBA performs an insert directly via SQL CLI or a third-party microservice, bypassing application code."*

---

## 🎯 3-Minute Viva Live Demonstration Script

1. **Open Frontend:** Navigate to `http://localhost:5173/payment`.
2. **Explain Payment Flow:**
   - Select quick preset: **Order #1 · $1,299.00**.
   - Show choice between **Card Payment** (instant status `Paid`) and **Cash on Delivery** (`Pending`).
   - Click **Pay Now**.
   - Show the generated **Transaction Receipt** with reference `TXN-...` and status `Paid`.
3. **Open Analytics Dashboard:** Click **View Updated Analytics Dashboard** (or navigate to `/analytics`).
4. **Show 4 Views:**
   - Point to **Gross vs Net Collected Revenue**: Explain that Net Revenue increased by $1,299.00 due to the card payment.
   - Point to **Quarterly Sales**: Explain the **2-Quarter Moving Average** window function.
   - Click **Top 10 Selling Products**: Point out the **`DENSE_RANK()`** badge #1.
   - Click **Category Revenue**: Point out the **`WITH ROLLUP`** Grand Total row.
   - Click **Customer Spending**: Show the Texas customer ranking with settled vs pending balances.
5. **Conclude:** *"All of these calculations run directly inside the TiDB relational engine via Virtual Views, adhering to strict BCNF normalization and ACID transaction isolation."*
