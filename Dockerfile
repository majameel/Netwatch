# Multi-stage Dockerfile for NetPulse Network Monitor

# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the React application
RUN npm run build

# Stage 2: Production image with Node.js and built frontend
FROM node:18-alpine AS production

# Install system dependencies for ping and networking
RUN apk add --no-cache curl iputils

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built frontend from previous stage
COPY --from=frontend-build /app/dist ./dist

# Copy server file
COPY server.js ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S netpulse -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R netpulse:nodejs /app

# Switch to non-root user
USER netpulse

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application
CMD ["node", "server.js"]