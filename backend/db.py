import os
import certifi
import mysql.connector.pooling
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)
load_dotenv()

from urllib.parse import urlparse

db_url = os.getenv("MYSQL_URL") or os.getenv("DATABASE_URL")
if db_url:
    parsed = urlparse(db_url)
    db_host = parsed.hostname or "localhost"
    db_port = parsed.port or 3306
    db_user = parsed.username or "root"
    db_password = parsed.password or ""
    db_name = parsed.path.lstrip('/') or "railway"
    use_ssl = os.getenv("DB_USE_SSL", "false").lower() in ("true", "1", "yes")
else:
    db_host = os.getenv("DB_HOST") or os.getenv("MYSQLHOST") or "localhost"
    db_port = int(os.getenv("DB_PORT") or os.getenv("MYSQLPORT") or (4000 if "tidbcloud" in db_host else 3306))
    db_user = os.getenv("DB_USER") or os.getenv("MYSQLUSER") or "root"
    db_password = os.getenv("DB_PASSWORD") or os.getenv("MYSQLPASSWORD") or ""
    db_name = os.getenv("DB_NAME") or os.getenv("MYSQLDATABASE") or "brightbuy_db"
    use_ssl = os.getenv("DB_USE_SSL", "false").lower() in ("true", "1", "yes")

db_config = {
    "host": db_host,
    "port": db_port,
    "user": db_user,
    "password": db_password,
    "database": db_name,
}

# Apply TLS certificate verification when connecting to TiDB or remote SSL hosts
if use_ssl or "tidbcloud" in db_host:
    db_config["ssl_ca"] = certifi.where()
    db_config["ssl_verify_cert"] = True
    db_config["ssl_verify_identity"] = True
else:
    db_config["ssl_disabled"] = True

# Shared connection pool (lazily initialized on first request)
_connection_pool = None

def get_db_connection():
    """Borrow a connection socket from the shared pool."""
    global _connection_pool
    if _connection_pool is None:
        _connection_pool = mysql.connector.pooling.MySQLConnectionPool(
            pool_name="brightbuy_pool",
            pool_size=10,
            pool_reset_session=True,
            **db_config
        )
    return _connection_pool.get_connection()
