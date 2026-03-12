FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install

# Copy source
COPY . .

# Build the app
RUN bun run build

# Create data directory for SQLite
RUN mkdir -p data

# Railway injects PORT env var
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "bun next start -H 0.0.0.0 -p ${PORT:-3000}"]
