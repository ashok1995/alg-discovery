# Multi-stage build - use Dockerfile.production for deploy (envs/, nginx.conf)
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG BUILD_ENV=prod
# Avoid build failure on ESLint warnings (e.g. unused vars); fix lint in CI or pre-commit
ENV DISABLE_ESLINT_PLUGIN=true
RUN if [ "$BUILD_ENV" = "stage" ]; then npm run build:stage; else npm run build:prod; fi

FROM nginx:alpine
RUN apk add --no-cache curl
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/build /usr/share/nginx/html
RUN mkdir -p /var/log/nginx && chown -R nginx:nginx /usr/share/nginx/html /var/log/nginx
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
