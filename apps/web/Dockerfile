# Image de production pour le frontend Next.js. Contexte de build : la
# racine du monorepo (nécessaire pour installer le workspace pnpm et
# compiler packages/shared). Sortie "standalone" (voir next.config.ts) : un
# server.js autonome avec seulement les dépendances réellement utilisées,
# pas un rendu statique — ce frontend fait du SSR/API routes (next-auth),
# contrairement à la SPA Vite du projet de référence.
#
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://votredomaine.com/api/v1 \
#     -t pos-erp-v2-web .

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate
WORKDIR /repo

FROM base AS builder
ENV CI=true
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter=@pos-erp-v2/shared build

# Figées dans le bundle client au build (Next.js les inline à la
# compilation, elles ne sont pas relues au runtime du conteneur) — d'où le
# passage en --build-arg plutôt qu'en seule variable d'environnement
# docker-compose.
ARG NEXT_PUBLIC_API_URL=/api/v1
ARG NEXT_PUBLIC_ABLY_ENABLED=false
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_ABLY_ENABLED=${NEXT_PUBLIC_ABLY_ENABLED}
RUN pnpm --filter=@pos-erp-v2/web build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV PORT=3100
ENV HOSTNAME=0.0.0.0
WORKDIR /repo

COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public

EXPOSE 3100
CMD ["node", "apps/web/server.js"]
