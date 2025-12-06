# ============================================================================
# Kampus+ Frontend Dockerfile
# Multi-stage build: development and production
# ============================================================================

# ============================================================================
# Stage 1: Dependencies (Base)
# ============================================================================
FROM node:20-alpine AS base

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# ============================================================================
# Stage 2: Development (Hot Reload)
# ============================================================================
FROM base AS development

WORKDIR /app

# Copy all source files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ============================================================================
# Stage 3: Builder (Production Build)
# ============================================================================
FROM base AS builder

WORKDIR /app

# Copy source code
COPY . .

# Build application
RUN npm run build

# ============================================================================
# Stage 4: Production (Nginx)
# ============================================================================
FROM nginx:1.25-alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S kampus && \
    adduser -S -D -H -u 1001 -h /usr/share/nginx/html -s /sbin/nologin -G kampus -g kampus kampus && \
    chown -R kampus:kampus /usr/share/nginx/html && \
    chown -R kampus:kampus /var/cache/nginx && \
    chown -R kampus:kampus /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R kampus:kampus /var/run/nginx.pid

USER kampus

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
