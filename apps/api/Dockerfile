FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY turbo.json ./
COPY tsconfig.base.json ./
COPY tsconfig.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json

RUN npm install

COPY apps/api apps/api
COPY packages packages

RUN npm --workspace @signalcraft/database run prisma:generate
RUN npm run build:api

FROM node:18-alpine
WORKDIR /app

COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages packages
COPY --from=builder /app/apps/api/dist apps/api/dist

RUN npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
