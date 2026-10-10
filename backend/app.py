import os
from datetime import timedelta
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

from routes.catalog import catalog_bp
from routes.auth_cart import auth_cart_bp
from routes.orders import orders_bp
from routes.logistics import logistics_bp
from routes.analytics import analytics_bp

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', app.config['SECRET_KEY'])
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=8)

jwt = JWTManager(app)

import re

# Enable cross-origin requests and cookie forwarding from React
cors_origins_env = os.getenv('CORS_ORIGIN', 'http://localhost:5173')
env_origins = [o.strip() for o in cors_origins_env.split(',') if o.strip() and o.strip() != '*']

# Allow localhost, Cloudflare Pages (*.pages.dev), and Vercel (*.vercel.app)
allowed_origins = [
    re.compile(r"^https://.*\.pages\.dev$"),
    re.compile(r"^https://.*\.vercel\.app$"),
    "http://localhost:5173",
    "http://localhost:3000"
] + env_origins

CORS(
    app,
    supports_credentials=True,
    origins=allowed_origins
)

# Mount blueprints to their agreed API prefixes
app.register_blueprint(catalog_bp, url_prefix='/api/catalog')
app.register_blueprint(auth_cart_bp, url_prefix='/api/auth_cart')
app.register_blueprint(orders_bp, url_prefix='/api/orders')
app.register_blueprint(logistics_bp, url_prefix='/api/logistics')
app.register_blueprint(analytics_bp, url_prefix='/api/analytics')

@app.route('/', methods=['GET'])
def root_status():
    return jsonify({
        "status": "healthy",
        "service": "StockFlow Backend API",
        "endpoints": ["/api/health", "/api/catalog", "/api/auth_cart", "/api/orders", "/api/logistics", "/api/analytics"]
    }), 200

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "brightbuy-api"}), 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)