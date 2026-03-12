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

EXPOSE 3000

CMD ["bun", "run", "start"]
