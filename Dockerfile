FROM --platform=linux/amd64 node
WORKDIR /app
COPY . .

RUN npm install

CMD ["nodemon", "app", "--reload"]