FROM ubuntu:20.10

# Copy in all the code
COPY . /collect
COPY . /dispense

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

# Install Cron
RUN aptitude -y install cron

# API runs on one port
EXPOSE 3000

