# =========================================================================
# BrightBuy / StockFlow - Backend Production Container
# =========================================================================

# 1. Base Image: Lightweight Python 3.11
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000

# Set container working directory
WORKDIR /app

# 2. Install essential system dependencies (for TiDB TLS handshakes & SSL)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 3. Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 4. Copy backend source code
COPY . .

# 5. Expose application port
EXPOSE ${PORT}

# 6. Run production Gunicorn server bound to the dynamic $PORT
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT} --workers 2 --threads 4 --timeout 120 app:app"]
