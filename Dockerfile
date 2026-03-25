FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install

# Copy source
COPY . .

# Build-time args for Next.js (NEXT_PUBLIC_* must be available at build time)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG ADMIN_EMAIL
ARG ADMIN_PASSWORD
ARG AUTH_SECRET

# Build the app
RUN bun run build

# Create data directory (legacy — can be removed after SQLite is fully retired)
RUN mkdir -p data

# Railway injects PORT env var
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "bun next start -H 0.0.0.0 -p ${PORT:-3000}"]
