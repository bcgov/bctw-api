FROM cypress/base:10
# FROM centos/nodejs-12-centos7
# USER root
# RUN yum install -y xorg-x11-server-Xvfb gtk2-devel gtk3-devel libnotify-devel GConf2 nss libXScrnSaver alsa-lib
# USER 10001
# Create app directory
# WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

# "root"
RUN whoami

# there is a built-in user "node" that comes from the very base Docker Node image
# move test runner binary folder to the non-root's user home directory
RUN mv -v /root/.cache /home/node/.cache

USER node
# show user effective id and group - it should be non-zero
# meaning the current user "node" is not root
RUN id

# EXPOSE 8080
CMD [ "node", "app.js" ]