FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund || true

COPY . .

ENV NODE_ENV=production
ENV PORT=8745

EXPOSE 8745

CMD ["node", "server.js"]
