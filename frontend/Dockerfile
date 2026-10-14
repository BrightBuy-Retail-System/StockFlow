# =========================================================================
# BrightBuy / StockFlow - Frontend Production Container (Multi-Stage)
# =========================================================================

# Stage 1: Build React SPA with Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci || npm install

# Copy source code
COPY . .

# Pass backend API URL into Vite build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build static assets to /app/dist
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:alpine

# Clean default Nginx files
RUN rm -rf /usr/share/nginx/html/*

# Copy built static files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with React Router SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
