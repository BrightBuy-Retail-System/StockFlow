import os
import certifi
import mysql.connector.pooling
from dotenv import load_dotenv

load_dotenv()

db_host = os.getenv("DB_HOST", "localhost")
use_ssl = os.getenv("DB_USE_SSL", "false").lower() in ("true", "1", "yes")

db_config = {
    "host": db_host,
    "port": int(os.getenv("DB_PORT", 4000 if "tidbcloud" in db_host else 3306)),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "brightbuy_db"),
}

# Apply TLS certificate verification when connecting to TiDB or remote SSL hosts
if use_ssl or "tidbcloud" in db_host:
    db_config["ssl_ca"] = certifi.where()
    db_config["ssl_verify_cert"] = True
    db_config["ssl_verify_identity"] = True

# Shared connection pool
connection_pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="brightbuy_pool",
    pool_size=10,
    pool_reset_session=True,
    **db_config
)

def get_db_connection():
    """Borrow a connection socket from the shared pool."""
    return connection_pool.get_connection()