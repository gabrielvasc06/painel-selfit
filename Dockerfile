# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.mjs tsconfig*.json tailwind.config.js postcss.config.js ./
COPY src ./src
COPY public ./public
# Imagem sempre usa a API na mesma origem; nao recebe arquivos .env do desenvolvedor.
RUN npm run build

FROM node:22-bookworm-slim AS api-dependencies
WORKDIR /app/api-selfit
COPY api-selfit/package.json api-selfit/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=api-dependencies --chown=node:node /app/api-selfit ./api-selfit
COPY --chown=node:node api-selfit/src ./api-selfit/src
COPY --chown=node:node api-selfit/scripts/create-user.js ./api-selfit/scripts/create-user.js
COPY --chown=node:node api-selfit/knexfile.js ./api-selfit/knexfile.js
RUN rm -rf /app/api-selfit/src/docs /app/api-selfit/src/database/seeds
COPY --from=frontend --chown=node:node /build/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=6s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/ready',{signal:AbortSignal.timeout(5000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "api-selfit/src/server.js"]
