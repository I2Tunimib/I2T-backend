FROM node:20-slim

# install zip
RUN apt-get update && apt-get install -y zip && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
RUN DISABLE_ESLINT_PLUGIN=true npm install --production

COPY . .
# explicitly tell docker to copy .env file or it won't be copied to image
# COPY .env .

EXPOSE 3004
CMD [ "npm", "run", "start-prod" ]
