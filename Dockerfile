# syntax=docker/dockerfile:1

# --- base: Node 22 + pnpm via corepack -------------------------------------
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
# wget is used by the compose healthcheck; ca-certificates for TLS to APIs.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates wget \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable
WORKDIR /app

# --- deps: install ALL dependencies (devDeps included: tsx/prisma needed at runtime) ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- build: compile Next.js + Payload --------------------------------------
FROM base AS build
# Build-time-only placeholders. `prisma generate` (Prisma 7 prisma.config.ts)
# and Payload config init require these vars to RESOLVE, but never connect to
# the DB at build. They do NOT reach the runtime image — the runtime stage
# copies files, not ENV, and injects real values via env_file at start.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
ENV PAYLOAD_SECRET="build-only-placeholder-not-used-at-runtime"
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Call binaries directly (project `pnpm <script>` hits a deps-status precheck).
RUN node_modules/.bin/prisma generate \
 && node_modules/.bin/next build \
 && node_modules/.bin/payload generate:importmap

# --- runtime: run the built app as non-root --------------------------------
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
COPY --from=build /app ./
# public/media is a mounted volume at runtime; ensure the dir exists and is owned.
RUN mkdir -p /app/public/media \
 && chown -R node:node /app/public/media \
 && chmod +x docker/entrypoint.sh
USER node
EXPOSE 3000
ENTRYPOINT ["docker/entrypoint.sh"]
