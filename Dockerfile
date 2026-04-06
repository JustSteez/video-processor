# ── Stage 1: deps ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 2: build ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: production image ──────────────────────────────────────────────────
FROM node:20-alpine AS runner
# FFmpeg for video processing
RUN apk add --no-cache ffmpeg
WORKDIR /app

ENV NODE_ENV=production

# Copy only what's needed to run
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public 2>/dev/null || true
COPY --from=builder /app/worker ./worker
COPY --from=builder /app/src ./src
COPY package*.json tsconfig.json next.config.ts ./

EXPOSE 3000
CMD ["npm", "start"]
