#!/bin/bash

# Set default Redis port
REDIS_PORT=${1:-6379}

# Check if Docker is installed
if ! [ -x "$(command -v docker)" ]; then
  echo 'Error: Docker is not installed.' >&2
  exit 1
fi

# Check if Redis container is already running
if [ "$(docker ps -q -f name=redis_container)" ]; then
  echo "Redis container is already running."
else
  # Run Redis container
  echo "Starting Redis container on port $REDIS_PORT..."
  docker run -d --name redis_container -p $REDIS_PORT:6379 redis:latest

  if [ $? -eq 0 ]; then
    echo "Redis is running on port $REDIS_PORT."
  else
    echo "Failed to start Redis container." >&2
    exit 1
  fi
fi

# Print Redis container status
docker ps -f name=redis_container
