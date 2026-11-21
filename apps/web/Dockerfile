# syntax=docker/dockerfile:1.7
#
# The web app. Build with the REPOSITORY ROOT as the context:
#
#   docker build -f apps/web/Dockerfile --secret id=env,src=.env -t jitaspace-web .
#
# `next build` prerenders pages from the databases (`cacheComponents`), so the
# build needs the same variables as a real run AND a reachable DATABASE_URL and
# EVE_BUILDS_DATABASE_URL. Supply them either way:
#   - a BuildKit secret named `env`, mounted as the root `.env` that the
#     `with-env` script already reads (nothing is written to an image layer), or
#   - build arguments, for hosts that only offer those. A database URL passed
#     this way is visible in `docker history`, so keep such an image private.
# Credentials that are nothing but a secret (SENTRY_AUTH_TOKEN, for source map
# upload) have no build argument on purpose: pass them in the `env` secret.
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time: a
# different public value needs a new image, not a new container variable.

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
# ca-certificates: TLS to the databases, ESI and Sentry. openssl: Prisma.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable
WORKDIR /repo

FROM base AS build
# CI=1 makes next.config.mjs skip type-checking during the build, as on Vercel;
# types are gated by `pnpm type-check` in CI.
ENV CI=1
# Generating the Prisma client's type declarations needs more heap than Node's
# default allows (it fails with ERR_WORKER_OUT_OF_MEMORY). Raise or lower it
# with --build-arg to suit the build machine's memory.
ARG NODE_MAX_OLD_SPACE_MB=6144
ENV NODE_OPTIONS=--max-old-space-size=${NODE_MAX_OLD_SPACE_MB}
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm db:generate

ARG DATABASE_URL
ARG EVE_BUILDS_DATABASE_URL
ARG EVE_BUILDS_DATABASE_SCHEMA
ARG REDIS_URL
ARG NEXT_PUBLIC_GOOGLE_TAG_ID
ARG NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_DISCORD_INVITE_LINK
ARG SKIP_ENV_VALIDATION
RUN --mount=type=secret,id=env,target=/repo/.env,required=false \
    pnpm exec turbo run build --filter=@jitaspace/web

# Not a `standalone` build: the image carries the whole workspace and its
# node_modules, which is large but runs exactly what Vercel runs. Slimming it
# with `output: "standalone"` is a follow-up.
FROM build AS runner
# NODE_OPTIONS and CI are cleared: they are build settings, and this stage
# inherits the build stage's environment. Left in place, the server would run
# with the build's 6 GB heap limit.
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NODE_OPTIONS= \
    CI=
WORKDIR /repo/apps/web
# `next start` writes regenerated pages and its caches under .next.
RUN chown -R node:node /repo/apps/web/.next
USER node
EXPOSE 3000
CMD ["sh", "-c", "exec node \"$(node -p \"require.resolve('next/dist/bin/next')\")\" start"]
