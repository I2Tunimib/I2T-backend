FROM node:14-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm ci --production

COPY . .
# explicitly tell docker to copy .env file or it won't be copied to image
COPY .env .

EXPOSE 3003
CMD [ "npm", "run", "start-prod" ]