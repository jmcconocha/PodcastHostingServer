FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir uploads

EXPOSE 3000

CMD ["npm", "start"]