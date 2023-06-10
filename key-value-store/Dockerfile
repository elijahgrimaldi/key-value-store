# syntax=docker/dockerfile:1
# Uses Node base image
FROM node:18-alpine
# Sets environment variable to production mode
ENV NODE_ENV=production
# creates working directory in the image to myapp
WORKDIR /myapp
# copies node dependencies into iamge
COPY ["package.json", "package-lock.json*", "./"]
# using node package manager to install dependent packages
RUN npm install --production
# copies source code into working directory
COPY . .
# runs node command on app.js
CMD ["node", "app.js"]
