import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from routes.catalog import catalog_bp
from routes.auth_cart import auth_cart_bp
from routes.orders import orders_bp
from routes.logistics import logistics_bp
from routes.analytics import analytics_bp

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

# Enable cross-origin requests and cookie forwarding from React
CORS(
    app,
    supports_credentials=True,
    origins=[os.getenv('CORS_ORIGIN', 'http://localhost:5173')]
)

# Mount blueprints to their agreed API prefixes
app.register_blueprint(catalog_bp, url_prefix='/api/catalog')
app.register_blueprint(auth_cart_bp, url_prefix='/api/auth_cart')
app.register_blueprint(orders_bp, url_prefix='/api/orders')
app.register_blueprint(logistics_bp, url_prefix='/api/logistics')
app.register_blueprint(analytics_bp, url_prefix='/api/analytics')

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "brightbuy-api"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)