# Stage 1: Build Environment
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Install build dependencies (python3/make/g++ needed for some native modules like 'pg' or 'canvas' if added later)
RUN apk add --no-cache python3 make g++

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies (clean install for consistency)
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Stage 2: Production Environment (Smaller & Secure)
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install only production runtime dependencies (if any system-level deps are needed)
# 'tini' is a tiny init process that handles signals properly (Ctrl+C, etc.)
RUN apk add --no-cache tini

# Copy artifacts from the builder stage
COPY --from=builder /usr/src/app ./

# Use Tini as the entry point
ENTRYPOINT ["/sbin/tini", "--"]

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]