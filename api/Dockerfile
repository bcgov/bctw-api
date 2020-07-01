FROM ubuntu:20.10

WORKDIR /usr/src/app

# Copy in all the code
COPY collect ./
COPY dispense ./

# Docs
LABEL maintainer="popkinj@littleearth.ca"
LABEL version="1.0.0"
LABEL description="Custom docker image for collecting and dispensing BC telemetry data"

# Image is always in production
ENV NODE_ENV production

# Pacific time zone
ENV TZ America/Vancouver
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Update Ubuntu Software repository
RUN apt-get update

# Use Aptitude for package management
RUN apt-get -y --no-install-recommends install aptitude

# Install NodeJS
RUN aptitude -y install nodejs

# Install NPM (Node Package Manager)
RUN aptitude -y install npm

# Install Cron
RUN aptitude -y install cron

# Enter the dispense directory
WORKDIR /usr/src/app/dispense

# Install local NodeJS dependencies
RUN npm install

# Run the server
CMD ["npm", "start"]

# API runs on one port
EXPOSE 3000