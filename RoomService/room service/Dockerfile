# Use an official Node.js image as the base image
FROM node:14-alpine

# Create a directory for the service
RUN mkdir -p /usr/src/room-service

# Set the working directory
WORKDIR /usr/src/room-service

# Copy the service's source code into the image
COPY . .

# Install the service's dependencies
RUN npm ci

# Expose port 3001
EXPOSE 3001

# Specify the command to run the service
CMD ["npm", "start"]
