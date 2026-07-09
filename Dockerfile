# ============ Build Stage ============
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --registry=https://registry.npmmirror.com

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# ============ Production Stage ============
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ONLY production dependencies
RUN npm ci --omit=dev --registry=https://registry.npmmirror.com

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy backend source (needs tsx to run .ts files)
COPY api ./api
COPY tsconfig.json ./

# Install tsx for running TypeScript backend
RUN npm install -g tsx

# Create data and uploads directories
RUN mkdir -p /app/data /app/uploads

# Environment
ENV NODE_ENV=production
ENV PORT=3001
ENV UPLOAD_DIR=/app/uploads
ENV DB_PATH=/app/data/seedance.db

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

# Start backend (serves API + static frontend)
CMD ["sh", "-c", "tsx api/server.ts"]
