# syntax=docker/dockerfile:1
#
# Reusable-template Dockerfile — safe to publish to a PUBLIC registry.
#
# What crosses the build boundary (and is therefore IN the image):
#   * NEXT_PUBLIC_* branding/SITE_NAME vars — inlined into the client JS bundle
#     by Next.js at BUILD time. They are public by definition, so baking them in
#     is fine. They arrive as build-args with generic defaults, so `docker build .`
#     works with no .env. Override with --build-arg to brand the image.
#   * NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_SITE_URL are NOT set at build time —
#     they would freeze the domain into the client bundle. Instead, use the
#     runtime APP_URL env var (see below) so a single image works on any host.
#
# What NEVER enters any layer (runtime-only, supplied via env_file / -e at start):
#   DATABASE_URL, PAYLOAD_SECRET, AUTH_SECRET, AUTH_GOOGLE_SECRET, PAYOS_*,
#   PAYMENT_SECRETS_KEY, OPENROUTER_API_KEY, PREVIEW_SECRET, APP_URL.
#   APP_URL is the canonical base URL read at runtime (deliberately NOT a
#   NEXT_PUBLIC_* var, which Next.js would inline at build time). Setting it at
#   start re-points the admin panel, SEO URLs, and admin cookies to any domain,
#   so a SINGLE prebuilt image runs on any host (localhost, LAN IP, real domain)
#   without rebuild.
#   The build stage uses FAKE placeholders for the two vars that must merely
#   RESOLVE during `prisma generate` / Payload config init / `next build` — they
#   never connect to anything, and the runtime stage copies files, not ENV.

# --- base: Node 22 + pnpm via corepack -------------------------------------
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
# wget: compose healthcheck. ca-certificates: TLS to external APIs.
# openssl: Prisma's query engine links libssl at runtime; without it a fresh
# deploy fails to load the engine. Pin pnpm so the image matches the version
# that generated pnpm-lock.yaml — corepack's bundled default is pnpm 9.x, which
# ignores the `allowBuilds:` key in pnpm-workspace.yaml (a pnpm 10+ feature) and
# would silently change which dependency build scripts run.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates wget openssl \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable \
 && corepack prepare pnpm@11.5.0 --activate
WORKDIR /app

# --- deps: install ALL dependencies (devDeps included: tsx/prisma needed at runtime) ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- build: compile Next.js + Payload --------------------------------------
FROM base AS build
# Build-time-only FAKE placeholders. `prisma generate` (Prisma 7 prisma.config.ts)
# and Payload config init require these vars to RESOLVE, but never connect to
# the DB at build. They do NOT reach the runtime image — the runtime stage
# copies files, not ENV, and injects real values via env_file at start.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
ENV PAYLOAD_SECRET="build-only-placeholder-not-used-at-runtime"
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* URL vars (APP_URL, SITE_URL) are deliberately NOT set here — they
# would be inlined by Next.js at build time, freezing one domain into the image.
# A single prebuilt image should serve any host (localhost, LAN IP, real domain)
# by setting the runtime `APP_URL` at container start. The branding vars below
# (SITE_NAME, etc.) are safe to bake: they describe the store, not the domain,
# so they stay generic. Override any with --build-arg; the ENV lines export them
# to `next build`.
ARG NEXT_PUBLIC_SITE_NAME=Shop
ARG NEXT_PUBLIC_BRAND_TAGLINE=""
ARG NEXT_PUBLIC_CONTACT_EMAIL=""
ARG NEXT_PUBLIC_CONTACT_PHONE=""
ARG NEXT_PUBLIC_CONTACT_ADDRESS=""
ENV NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME \
    NEXT_PUBLIC_BRAND_TAGLINE=$NEXT_PUBLIC_BRAND_TAGLINE \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_PUBLIC_CONTACT_PHONE=$NEXT_PUBLIC_CONTACT_PHONE \
    NEXT_PUBLIC_CONTACT_ADDRESS=$NEXT_PUBLIC_CONTACT_ADDRESS
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
# .next/cache is written at runtime (image optimization, fetch/prerender cache);
# the build runs as root, so hand .next to the non-root runtime user or those
# writes fail with EACCES (broken images + cache).
RUN mkdir -p /app/public/media /app/.next/cache \
 && chown -R node:node /app/public/media /app/.next \
 && chmod +x docker/entrypoint.sh
USER node
EXPOSE 3000
ENTRYPOINT ["docker/entrypoint.sh"]
