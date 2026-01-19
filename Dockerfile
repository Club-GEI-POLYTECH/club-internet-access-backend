# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Configure npm for better network handling
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev) for build
RUN if [ -f package-lock.json ]; then \
      npm ci --prefer-offline --no-audit || npm ci --prefer-offline --no-audit || npm ci; \
    else \
      npm install --prefer-offline --no-audit || npm install; \
    fi

# Copy source code (including migrations directory)
COPY . .

# Build the application
# Note: postbuild script runs build:migrations and build:seeds automatically
# With webpack enabled, NestJS creates dist/main.js (bundled)
RUN echo "🔨 Building application..." && \
    npm run build && \
    echo "✅ Application build completed" && \
    echo "📦 Verifying migrations compilation (postbuild)..." && \
    ls -la dist/migrations/ 2>/dev/null || echo "⚠️  dist/migrations/ not found yet" && \
    if [ ! -f dist/main.js ]; then \
      echo "❌ ERROR: dist/main.js not found after build!"; \
      echo "Contents of dist/:"; \
      ls -la dist/ || echo "dist/ directory does not exist"; \
      exit 1; \
    fi && \
    if [ ! -d dist/migrations ] || [ -z "$(ls -A dist/migrations/*.js 2>/dev/null)" ]; then \
      echo "⚠️  WARNING: No compiled migrations found, running build:migrations manually..." && \
      npm run build:migrations || echo "❌ build:migrations failed"; \
    fi && \
    echo "✅ dist/main.js exists" && \
    echo "✅ Migrations compilation verified"

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Configure npm for better network handling
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies with retry logic
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --prefer-offline --no-audit || npm ci --omit=dev --prefer-offline --no-audit || npm ci --omit=dev; \
    else \
      npm install --production --prefer-offline --no-audit || npm install --production; \
    fi && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Vérifier que main.js existe après la copie (avec webpack, NestJS crée dist/main.js)
RUN if [ ! -f dist/main.js ]; then \
      echo "ERROR: dist/main.js not found after copy!"; \
      echo "Contents of dist/:"; \
      ls -la dist/ || echo "dist/ directory does not exist"; \
      exit 1; \
    fi && \
    echo "✅ dist/main.js exists in production stage"

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
# With webpack enabled, NestJS creates dist/main.js (bundled)
CMD ["node", "dist/main.js"]
