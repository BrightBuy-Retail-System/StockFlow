# Stage 1: Build React production bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json* ./

# Install packages
RUN npm install

# Copy application source code
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Serve via lightweight Nginx web server
FROM nginx:alpine

# Copy built dist files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
