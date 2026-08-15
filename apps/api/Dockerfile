# Image de production pour l'API NestJS. Contexte de build : la racine du
# monorepo (nécessaire pour installer le workspace pnpm et compiler
# packages/shared).
#
#   docker build -f apps/api/Dockerfile -t pos-erp-v2-api .

FROM node:22-alpine AS base
RUN corepack enable
# Épingle pnpm@10 pour ce build uniquement, sans toucher au champ
# "packageManager" (pnpm@11.20.0) du dépôt utilisé en dev. pnpm@11 a changé
# sa stratégie de résolution de node_modules (plus de symlinks .bin
# classiques) : les scripts "build"/"prisma:generate" (tsc, prisma) ne se
# résolvent alors plus dans ce contexte Docker. pnpm@10 lit le même format
# de lockfile (lockfileVersion 9.0) et produit un node_modules standard,
# résoluble par n'importe quel runtime Node — confirmé en reproduisant
# l'échec (`MODULE_NOT_FOUND` sur tsc/prisma) avant ce correctif.
RUN printf '#!/bin/sh\nexec corepack pnpm@10.34.5 "$@"\n' > /usr/local/bin/pnpm && \
    chmod +x /usr/local/bin/pnpm
WORKDIR /repo

# ---- installation complète (dev incluses) + compilation ----
FROM base AS builder
ENV CI=true
# python3/make/g++ : requis pour compiler les modules natifs (bcrypt) via
# node-gyp. openssl : sans lui, `prisma generate` ne peut pas détecter la
# version réelle d'OpenSSL de cette image et se rabat sur un binaire moteur
# de requêtes qui ne correspond pas à l'exécution réelle (Alpine/musl) —
# `@prisma/client did not initialize yet` au démarrage, confirmé en
# reproduisant l'échec avant ce correctif.
RUN apk add --no-cache python3 make g++ openssl
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/api/prisma/schema.prisma apps/api/prisma/schema.prisma
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter=@pos-erp-v2/shared build
RUN pnpm --filter=@pos-erp-v2/api prisma:generate
RUN pnpm --filter=@pos-erp-v2/api build

# ---- dépendances de production uniquement ----
FROM base AS prod-deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/api/prisma/schema.prisma apps/api/prisma/schema.prisma
# Le script racine "prepare": "husky" échoue sous --prod (devDependency non
# installée) — retiré, inutile dans l'image (husky ne sert qu'en dev, aux
# hooks git locaux).
RUN node -e "\
  const fs = require('node:fs'); \
  const p = JSON.parse(fs.readFileSync('package.json', 'utf-8')); \
  delete p.scripts.prepare; \
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2)); \
"
RUN pnpm install --frozen-lockfile --prod
# `prisma` (le CLI) est une devDependency, absente de cette installation
# --prod — le client déjà généré dans le stage "builder" est copié tel quel
# plutôt que régénéré ici. Le suffixe de hash du dossier @prisma+client@...
# dans le store virtuel pnpm dépend des packages effectivement installés à
# ses côtés (donc potentiellement différent entre "builder", qui a `prisma`,
# et cette installation --prod, qui ne l'a pas) — la source est donc
# localisée par motif générique côté "builder", puis déposée dans le VRAI
# dossier local (déterminé ici, pas supposé identique) plutôt que par un
# chemin recopié en dur des deux côtés.
COPY --from=builder /repo/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma /tmp/generated-prisma-client
RUN target=$(find node_modules/.pnpm -maxdepth 1 -iname '@prisma+client@*' -type d | head -1) && \
    rm -rf "$target/node_modules/.prisma" && \
    mv /tmp/generated-prisma-client "$target/node_modules/.prisma"

# packages/shared expose ses sources TypeScript brutes via main/types en dev
# (tsx/Next.js les consomment directement, sans étape de build) — au
# runtime, seul dist/ existe encore utilement. Cette réécriture ne touche
# que la copie de l'image, jamais le package.json du dépôt.
RUN node -e "\
  const fs = require('node:fs'); \
  const p = JSON.parse(fs.readFileSync('packages/shared/package.json', 'utf-8')); \
  p.main = './dist/index.js'; \
  p.types = './dist/index.d.ts'; \
  fs.writeFileSync('packages/shared/package.json', JSON.stringify(p, null, 2)); \
"

# ---- exécution ----
FROM node:22-alpine AS runner
# docker-cli : apps/api/src/backups/pg-dump.service.ts exécute `docker exec
# <conteneur postgres> pg_dump/pg_restore` — nécessite le binaire client
# docker ainsi que le socket Docker de l'hôte monté au démarrage (voir
# docker-compose.prod.yml). Seule une route Super Admin déclenche ce chemin.
RUN apk add --no-cache docker-cli openssl
ENV NODE_ENV=production
WORKDIR /repo

COPY --from=prod-deps /repo/package.json /repo/pnpm-workspace.yaml ./
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=prod-deps /repo/packages/shared/package.json packages/shared/package.json
COPY --from=prod-deps /repo/packages/shared/node_modules packages/shared/node_modules
COPY --from=builder /repo/packages/shared/dist packages/shared/dist
COPY --from=prod-deps /repo/apps/api/package.json apps/api/package.json
COPY --from=prod-deps /repo/apps/api/node_modules apps/api/node_modules
COPY --from=builder /repo/apps/api/dist apps/api/dist
COPY --from=builder /repo/apps/api/prisma apps/api/prisma

WORKDIR /repo/apps/api
EXPOSE 4100
# nest-cli.json déclare sourceRoot: "src" — le compilateur préserve donc ce
# préfixe dans dist/ (dist/src/main.js), pas dist/main.js.
CMD ["node", "dist/src/main.js"]
