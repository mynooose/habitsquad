FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install --omit=dev --ignore-scripts
RUN npx prisma generate

COPY src ./src
COPY gcs-key.json ./gcs-key.json

EXPOSE 3001

CMD ["node", "src/index.js"]
