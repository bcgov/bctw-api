FROM cypress/base:10

WORKDIR /app

COPY package*.json ./
RUN npm install

# confirm cypress can run
RUN $(npm bin)/cypress verify

# should be "root"
RUN whoami
# uid=0(root) gid=0(root) groups=0(root)
RUN id

# give user read access to the "/root" folder where the binary is cached
RUN ls -la /root
RUN chmod 755 /root
# point Cypress at the /root/cache no matter what user account is used
ENV CYPRESS_CACHE_FOLDER=/root/.cache/Cypress

RUN chmod 777 /app

# switch to non-root user "node" that comes from Docker Node image
USER node
# show user effective id and group - it should be non-zero, meaning the current user "node" is not root
RUN id

# user "node" should be able to access the Cypress test runner now
RUN ls -la /root/.cache/Cypress/*/Cypress

# Bundle app source
COPY . .

CMD [ "node", "app.js" ]
