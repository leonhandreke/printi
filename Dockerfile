# ---- Stage 1: Install dependencies ----
FROM node:24-alpine AS deps

# Build tools + native lib headers needed to compile "canvas" npm package
RUN apk add --no-cache \
    python3 make g++ \
    cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev pixman-dev

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Stage 2: Build the Next.js app ----
FROM node:24-alpine AS builder

# Native lib headers needed because next build imports canvas at build time
RUN apk add --no-cache \
    cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev pixman-dev

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Stage 3: Production runner ----
FROM node:24-alpine AS runner

# Runtime native libraries only (no -dev, no build tools)
RUN apk add --no-cache \
    cairo pango jpeg giflib librsvg pixman

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Standalone output + static assets + public dir
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
