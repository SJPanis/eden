dockerfile
# Multi-stage build for Eden application

# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Build dependencies
FROM node:20-alpine AS build-dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 3: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY --from=build-dependencies /app/node_modules ./node_modules
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json .
COPY next.config.js .
COPY .env.example .env.local

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Stage 4: Runtime base
FROM node:20-alpine AS runtime-base
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production

# Stage 5: Production runtime
FROM runtime-base AS production

# Copy package files
COPY package*.json ./

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy Prisma schema and migrations
COPY prisma ./prisma

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Entry point
ENTRYPOINT ["/sbin/tini", "--"]

# Start command
CMD ["npm", "start"]

EXPOSE 3000

# Stage 6: Development
FROM runtime-base AS development

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json .
COPY next.config.js .
COPY .env.example .env.local
COPY public ./public

RUN npx prisma generate

USER node

EXPOSE 3000 9229

CMD ["npm", "run", "dev"]

# Stage 7: Testing
FROM build-dependencies AS testing
WORKDIR /app

COPY . .

RUN npm run test -- --coverage

# Stage 8: Linting
FROM build-dependencies AS lint
WORKDIR /app

COPY . .

RUN npm run lint && \
    npm run type-check

# Stage 9: Security scanning
FROM build-dependencies AS security
WORKDIR /app

COPY package*.json ./
RUN npm audit --audit-level=moderate || true && \
    npx snyk test --severity-threshold=high || true