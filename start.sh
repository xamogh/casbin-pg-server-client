#!/bin/bash

# Create necessary directory if it doesn't exist
CASBIN_CONFIG_DIR="$(pwd)/casbin-config"
echo "Setting up Casbin config directory at: $CASBIN_CONFIG_DIR"

if [ ! -d "$CASBIN_CONFIG_DIR" ]; then
    echo "Creating casbin-config directory..."
    mkdir -p "$CASBIN_CONFIG_DIR"
    
    # Create a sample connection_config.json if it doesn't exist
    if [ ! -f "$CASBIN_CONFIG_DIR/connection_config.json" ]; then
        echo "Creating sample connection_config.json..."
        cat > "$CASBIN_CONFIG_DIR/connection_config.json" << EOF
{
    "driverName": "postgres",
    "dataSourceName": "user=postgres password=mysecretpassword host=casbin-postgres port=5432 dbname=casbin sslmode=disable"
}
EOF
    fi
fi

# Stop and remove all running containers
echo "Stopping and removing all Docker containers..."
sudo docker stop $(sudo docker ps -a -q) || true
sudo docker rm $(sudo docker ps -a -q) || true

# Start PostgreSQL container
echo "Starting PostgreSQL container..."
sudo docker run --name casbin-postgres \
    -p 5432:5432 \
    -e POSTGRES_PASSWORD=mysecretpassword \
    -d postgres

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to start..."
sleep 5

# Connect to PostgreSQL and create database if it doesn't exist
echo "Creating casbin database if it doesn't exist..."
sudo docker exec -i casbin-postgres psql -U postgres << EOF
CREATE DATABASE casbin;
\q
EOF

# Start Casbin server
echo "Starting Casbin server..."
sudo docker run -d -p 50051:50051 \
    -e CONNECTION_CONFIG_PATH=/data/connection_config.json \
    -v "$CASBIN_CONFIG_DIR:/data" \
    --name my-casbin-server \
    --network="host" \
    casbin/casbin-server

echo "Setup complete!"
echo "Casbin config directory is at: $CASBIN_CONFIG_DIR"