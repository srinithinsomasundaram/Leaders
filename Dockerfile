FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json ./
COPY .npmrc ./

RUN npm install

COPY . .

ENV NODE_ENV=production
ENV PORT=8080

RUN npm run build

EXPOSE 8080

CMD ["npm", "run", "start"]
