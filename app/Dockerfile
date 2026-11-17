FROM node:24-alpine3.24

USER 1000

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY .  . 

EXPOSE 3000

CMD ["npm", "run", "start"]