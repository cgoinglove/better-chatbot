FROM node:23-alpine AS builder
ARG DOCKER_BUILD="1"
WORKDIR /app

COPY . . 

# Install pnpm
RUN npm install -g pnpm

RUN pnpm install --frozen-lockfile

RUN pnpm build

FROM node:23-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm

RUN apk add --no-cache curl bash \
    && curl -fsSL https://bun.sh/install | bash \
    && ln -s /root/.bun/bin/bun /usr/local/bin/bun

# Add the UV installation steps
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy the build output from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public/
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/scripts/db-migrate.ts ./scripts/db-migrate.ts
COPY --from=builder /app/src/lib/db/pg/migrate.pg.ts ./src/lib/db/pg/migrate.pg.ts
COPY --from=builder /app/src/lib/utils.ts ./src/lib/utils.ts
COPY --from=builder /app/src/lib/load-env.ts ./src/lib/load-env.ts
COPY --from=builder /app/src/lib/db/migrations ./src/lib/db/migrations
COPY --from=builder /app/src/types/chat.ts ./src/types/chat.ts
COPY --from=builder /app/messages ./messages
EXPOSE 3000

CMD pnpm start