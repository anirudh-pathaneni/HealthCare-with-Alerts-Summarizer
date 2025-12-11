#!/bin/bash
docker network ls
# Find and inspect the healthcare network (name varies by project folder)
NETWORK=$(docker network ls --format '{{.Name}}' | grep healthcare-network | head -1)
if [ -n "$NETWORK" ]; then
    echo "Found network: $NETWORK"
    docker network inspect "$NETWORK"
else
    echo "No healthcare-network found, skipping inspection"
fi
