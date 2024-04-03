FROM --platform=linux/amd64 node

RUN mkdir /app

WORKDIR /app

COPY . .

RUN npm install

CMD ["node", "bin/www"]