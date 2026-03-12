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

# Railway sets PORT dynamically
ENV PORT=3000
EXPOSE ${PORT}

CMD ["sh", "-c", "bun run next start -p $PORT"]
