import os
import mysql.connector.pooling
from dotenv import load_dotenv

load_dotenv()

db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "database": os.getenv("DB_NAME", "brightbuy_db")
}

# Pre-allocated pool shared across all worker threads
connection_pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="brightbuy_pool",
    pool_size=10,
    pool_reset_session=True,
    **db_config
)

def get_db_connection():
    """Borrow a connection socket from the shared pool."""
    return connection_pool.get_connection()