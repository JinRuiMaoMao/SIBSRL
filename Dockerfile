FROM node:24-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY scripts ./scripts
COPY data/daily-challenge-live.example.json ./data/daily-challenge-live.example.json

EXPOSE 8787

CMD ["npm", "run", "bot:daily"]
