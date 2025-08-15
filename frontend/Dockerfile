# Multi-stage build for production React app
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code and environment files
COPY . .

# Build argument for environment
ARG BUILD_ENV=prod:80

# Copy the appropriate environment file to .env for the build
RUN if [ "$BUILD_ENV" = "prod:8080" ]; then \
        cp env.production.8080 .env; \
        echo "Using env.production.8080 for build"; \
    else \
        cp env.production.80 .env; \
        echo "Using env.production.80 for build"; \
    fi

# Build the app for production
RUN if [ "$BUILD_ENV" = "prod:8080" ]; then \
        npm run build:prod:8080; \
    else \
        npm run build:prod:80; \
    fi

# Production stage
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Create nginx user and directories
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Create necessary nginx directories with proper permissions
RUN mkdir -p /run/nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d
RUN chown -R nextjs:nodejs /run/nginx /var/cache/nginx /var/log/nginx

# Copy built app from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/build /usr/share/nginx/html

# Copy nginx configuration files from builder stage
COPY --from=builder /app/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/nginx-8080.conf /etc/nginx/nginx-8080.conf

# Debug: List files to verify they were copied
RUN ls -la /etc/nginx/nginx*

# Copy nginx configuration based on build environment
ARG BUILD_ENV=prod:80
RUN if [ "$BUILD_ENV" = "prod:8080" ]; then \
        echo "Building for prod:8080, copying nginx-8080.conf"; \
        cp /etc/nginx/nginx-8080.conf /etc/nginx/nginx.conf; \
        echo "Configuration copied successfully"; \
    else \
        echo "Building for prod:80, using default nginx.conf"; \
    fi

# Verify final configuration
RUN echo "Final nginx.conf server_name:" && grep "server_name" /etc/nginx/nginx.conf

# Switch to non-root user
USER nextjs

# Expose port 8080 (for internal container communication)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
