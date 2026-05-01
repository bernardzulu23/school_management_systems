FROM node:20-slim

# 1. Install necessary system dependencies for Prisma 7 WASM/SSL
RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Copy dependency files first (for better caching)
COPY package*.json ./
COPY prisma ./prisma

RUN node -e "const fs=require('fs');const p='prisma/schema.prisma';const b=fs.readFileSync(p);if(b[0]===0xEF&&b[1]===0xBB&&b[2]===0xBF){fs.writeFileSync(p,b.slice(3));}"

# 3. Install dependencies
RUN npm ci --legacy-peer-deps

# 4. Generate Prisma Client early (before copying rest of app)
RUN npx prisma generate

# 5. Copy the rest of the source code
COPY . .

RUN node -e "const fs=require('fs');const p='prisma/schema.prisma';const b=fs.readFileSync(p);if(b[0]===0xEF&&b[1]===0xBB&&b[2]===0xBF){fs.writeFileSync(p,b.slice(3));}"

# 6. Build the Next.js app
RUN npm run build

RUN mkdir -p .next/standalone/node_modules/.prisma && \
    cp -r node_modules/.prisma/* .next/standalone/node_modules/.prisma/ && \
    mkdir -p .next/standalone/.next && \
    cp -r .next/static .next/standalone/.next/static && \
    cp -r public .next/standalone/public

# 7. Production settings
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
EXPOSE 8080

CMD ["sh", "-c", "npx prisma db push && node .next/standalone/server.js"]
