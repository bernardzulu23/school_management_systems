FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm","run","start"]
