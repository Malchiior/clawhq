# ClawHQ Backend - Production Dockerfile
# Multi-stage build for minimal production image

# ── Stage 1: Build ──────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies + OpenSSL 3
RUN apt-get update && apt-get install -y python3 make g++ openssl && rm -rf /var/lib/apt/lists/*

# Copy package files and install ALL dependencies (including devDependencies for build)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Generate Prisma client with correct OpenSSL target
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=library
RUN npx prisma generate

# Copy source and build TypeScript
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# ── Stage 2: Production ────────────────────────────────
FROM node:20-slim AS production

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    curl \
    tini \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 clawhq && \
    useradd -u 1001 -g clawhq -m clawhq

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist/

# Copy Docker templates for agent containers
COPY docker ./docker/

# Set ownership
RUN chown -R clawhq:clawhq /app

USER clawhq

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3001/api/health/ping || exit 1

# Use tini as init process for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the server
CMD ["node", "dist/index.js"]
