FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY turbo.json ./
COPY tsconfig.base.json ./
COPY tsconfig.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json

RUN npm install

COPY apps/web apps/web
COPY packages packages

RUN npm run build:web

FROM node:18-alpine
WORKDIR /app

COPY package.json ./
COPY apps/web/package.json apps/web/package.json

RUN npm install --omit=dev

COPY --from=builder /app/apps/web/.next apps/web/.next
COPY --from=builder /app/apps/web/public apps/web/public
COPY --from=builder /app/apps/web/next.config.js apps/web/next.config.js

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "--prefix", "apps/web", "run", "start"]
