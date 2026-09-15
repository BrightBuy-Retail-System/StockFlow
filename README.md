# StockFlow - Smart Retail & Logistics Platform (BrightBuy)

[![Database: TiDB Serverless](https://img.shields.io/badge/Database-TiDB%20Serverless%20(MySQL%208.0)-blue?style=flat-square&logo=mysql)](https://tidbcloud.com/)
[![Backend: Flask](https://img.shields.io/badge/Backend-Flask%20(Python)-green?style=flat-square&logo=flask)](https://flask.palletsprojects.com/)
[![Frontend: React + Vite](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=flat-square&logo=react)](https://vitejs.dev/)

**StockFlow (BrightBuy)** is an end-to-end retail and logistics web application developed for **CS3043 - Database Systems**. It features a modern React single-page application (SPA), a modular Python Flask backend, and a cloud-hosted TiDB Serverless (MySQL-compatible) relational engine with strict ACID transactions.

---

## 🏗️ Architecture & Tech Stack

- **Frontend:** React 19, Vite, React Router v7, Axios, Vanilla CSS (custom design system, dark glassmorphism).
- **Backend:** Python Flask, Flask-CORS, `mysql-connector-python`, `certifi` (TLS encryption).
- **Database:** TiDB Serverless (MySQL 8.0 compatible, TLS/SSL connection pooling).
- **Architecture Pattern:** Modular Blueprints & Feature Pages (separated per team member).

---

## 📁 Repository Structure

```text
StockFlow/
├── backend/
│   ├── app.py              # Flask app entrypoint, CORS, blueprint registration
│   ├── db.py               # TiDB connection pool (MySQLConnector + SSL)
│   ├── test_db.py          # Database diagnostic & table inspection tool
│   ├── requirements.txt    # Python backend dependencies
│   ├── .env.example        # Template for DB connection strings
│   ├── routes/             # Backend API routes (1 per member)
│   │   ├── catalog.py      # Member 1: Products, categories & variants
│   │   ├── auth_cart.py    # Member 2: Auth, sessions & shopping cart
│   │   ├── orders.py       # Member 3: Orders, checkout pipeline & payment
│   │   ├── logistics.py    # Member 4: Texas regional hubs & shipment tracking
│   │   └── analytics.py    # Member 5: Admin reports, metrics & audit logs
│   └── sql/                # SQL DDL schemas, stored procedures & dummy seed data
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Client-side router configuration
│   │   ├── main.jsx        # App mounting
│   │   ├── index.css       # Core design system tokens & styling
│   │   ├── api/
│   │   │   └── client.js   # Axios instance configured for http://localhost:5000/api
│   │   ├── components/
│   │   │   ├── DashboardLayout.jsx # Shared navigation header & system status
│   │   │   └── Icons.jsx           # SVG icon library
│   │   └── pages/          # Member-specific frontend views
│   │       ├── OverviewPage.jsx    # Home / Landing page
│   │       ├── CatalogPage.jsx     # Member 1 UI
│   │       ├── AuthCartPage.jsx    # Member 2 UI
│   │       ├── OrdersPage.jsx      # Member 3 UI
│   │       ├── LogisticsPage.jsx   # Member 4 UI
│   │       └── AnalyticsPage.jsx   # Member 5 UI
│   └── package.json
└── README.md
```

---

## 👥 Member Responsibilities & Feature Division

The project foundation is common, but each team member develops and owns their specific route and page:

| Member / Role | Feature Scope | Backend File | Frontend File |
| :--- | :--- | :--- | :--- |
| **Member 1** | **Catalog & Products** | `backend/routes/catalog.py` | `frontend/src/pages/CatalogPage.jsx` |
| **Member 2** | **Auth & Cart** | `backend/routes/auth_cart.py` | `frontend/src/pages/AuthCartPage.jsx` |
| **Member 3** | **Orders & Checkout** | `backend/routes/orders.py` | `frontend/src/pages/OrdersPage.jsx` |
| **Member 4** | **Logistics & Warehouses** | `backend/routes/logistics.py` | `frontend/src/pages/LogisticsPage.jsx` |
| **Member 5** | **Analytics & Reports** | `backend/routes/analytics.py` | `frontend/src/pages/AnalyticsPage.jsx` |

> ⚠️ **Rule of Collaboration:** Avoid editing common files (`app.py`, `db.py`, `App.jsx`, `DashboardLayout.jsx`, `index.css`, `api/client.js`) without team consensus to prevent merge conflicts.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & `npm`
- **Git**

---

### 2. Backend Setup

1. Open a terminal and navigate to the project root:
   ```bash
   cd StockFlow
   ```

2. Create and activate a Python virtual environment:
   ```powershell
   # Windows PowerShell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

3. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. Configure environment variables:
   - Copy `backend/.env.example` to `backend/.env`:
     ```powershell
     copy backend\.env.example backend\.env
     ```
   - Edit `backend/.env` with your TiDB Cloud credentials:
     ```env
     DB_HOST=gateway01.us-east-1.prod.aws.tidbcloud.com
     DB_PORT=4000
     DB_USER=your_prefix.root
     DB_PASSWORD=your_password
     DB_NAME=StockFlow
     DB_USE_SSL=true
     SECRET_KEY=your_secret_key
     CORS_ORIGIN=http://localhost:5173
     ```

5. Verify database connection & inspect tables:
   ```bash
   python backend/test_db.py
   ```

6. Start the Flask API server:
   ```bash
   python backend/app.py
   ```
   Backend will run at: **`http://localhost:5000`**  
   Health check endpoint: **`http://localhost:5000/api/health`**

---

### 3. Frontend Setup

1. Open a second terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Frontend will run at: **`http://localhost:5173`**

---

## 🗄️ Database Tables (TiDB)

The relational database currently holds 14 tables:

- **Catalog & Inventory:** `categories`, `products`, `product_variants`, `inventory`
- **Users & Auth:** `roles`, `users`
- **Shopping Cart:** `carts`, `cart_items`
- **Checkout & Orders:** `orders`, `order_items`, `payments`
- **Fulfillment & Logistics:** `texas_cities`, `shipments`
- **Auditing & Transactions:** `audit_logs`

---

## 🛠️ Contribution & Git Workflow

To keep progress organized and conflict-free:

1. **Pull the latest changes from `main`:**
   ```bash
   git pull origin main
   ```
2. **Create a feature branch for your member part:**
   ```bash
   git checkout -b feature/member-<n>-<feature-name>
   ```
3. **Commit and push your branch:**
   ```bash
   git add .
   git commit -m "feat: implement <feature-description>"
   git push -u origin feature/member-<n>-<feature-name>
   ```
4. **Open a Pull Request (PR)** on GitHub into `main`.