# backend/Dockerfile
# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && \
    cp -r node_modules /tmp/node_modules && \
    npm ci

COPY tsconfig.json nest-cli.json ./
COPY src/ ./src/

RUN npm run build && \
    rm -rf node_modules && \
    mv /tmp/node_modules node_modules

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

RUN addgroup --system --gid 1001 app && \
    adduser --system --uid 1001 app

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

EXPOSE 3000

USER app

CMD ["node", "dist/main.js"]
