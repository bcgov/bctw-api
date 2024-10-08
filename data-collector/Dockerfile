FROM cypress/base:12

WORKDIR /app

# update node
RUN npm install -g n
RUN n stable

# check locations and packages are correct
RUN which node; node -v; which npm; npm -v; npm ls -g --depth=0

COPY package*.json ./
RUN npm ci

# confirm cypress can run
RUN ./node_modules/.bin/cypress verify

# should be "root"
RUN whoami
# uid=0(root) gid=0(root) groups=0(root)
RUN id

# give user read access to the "/root" folder where the binary is cached
RUN ls -la /root
RUN chmod 755 /root
# point Cypress at the /root/cache no matter what user account is used
ENV CYPRESS_CACHE_FOLDER=/root/.cache/Cypress
# fix for "failed to get "appData' path' Electron error in OCP environment
ENV XDG_CONFIG_HOME=/app

RUN mkdir /app/downloads
RUN chmod 777 /app /app/downloads

# switch to non-root user "node" that comes from Docker Node image
USER node
# show user effective id and group - it should be non-zero, meaning the current user "node" is not root
RUN id

# user "node" should be able to access the Cypress test runner now
RUN ls -la /root/.cache/Cypress/*/Cypress

# Bundle app source
COPY . .

# add Cypress to path
ENV PATH="/app/node_modules/cypress/bin:${PATH}"

CMD [ "node", "app.js" ]

# compile ts
RUN npm run build
