# syntax=docker/dockerfile:1.7
#
# The icon server (icons.jita.space). Build with the REPOSITORY ROOT as the
# context:
#
#   docker build -f apps/icon-server/Dockerfile -t jitaspace-icon-server .
#
# Nothing is needed at build time. At run time it needs DATABASE_URL.

FROM node:24-bookworm-slim AS build
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=1
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable
WORKDIR /repo
# Generating the Prisma client's type declarations needs more heap than Node's
# default allows (it fails with ERR_WORKER_OUT_OF_MEMORY). Raise or lower it
# with --build-arg to suit the build machine's memory.
ARG NODE_MAX_OLD_SPACE_MB=6144
ENV NODE_OPTIONS=--max-old-space-size=${NODE_MAX_OLD_SPACE_MB}
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm db:generate \
 && pnpm exec turbo run build --filter=@jitaspace/icon-server

# Nitro's `node-server` preset traces its dependencies into .output, so the
# runtime image needs nothing else from the workspace.
FROM node:24-bookworm-slim AS runner
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/icon-server/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
