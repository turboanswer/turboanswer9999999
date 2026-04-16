FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:20-slim AS production

WORKDIR /app

ENV NODE_ENV=production
# Default port — overridden automatically by Cloud Run, Railway, etc.
# For Azure App Service: set WEBSITES_PORT=8080 in App Settings
ENV PORT=8080

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN chown -R appuser:nodejs /app
USER appuser

EXPOSE 8080

CMD ["node", "dist/index.js"]
