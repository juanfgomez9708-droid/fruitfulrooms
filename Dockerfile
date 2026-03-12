FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN bun run build

# Create data directory for SQLite
RUN mkdir -p data

# Copy static assets for standalone
RUN cp -r public .next/standalone/ 2>/dev/null || true
RUN cp -r .next/static .next/standalone/.next/static 2>/dev/null || true

# Railway sets PORT dynamically
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "cd .next/standalone && bun server.js"]
