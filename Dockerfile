FROM node:18

WORKDIR /usr/src/app

# install app dependencies
COPY package*.json ./
RUN [ "npm", "ci" ]

# copy source (includes .env file)
COPY ./ ./

# set non-root user and run
#RUN adduser -D myuser
#USER myuser
CMD [ "npm", "run", "serve" ]
