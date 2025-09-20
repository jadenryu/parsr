#!/bin/bash

# Explicit build script for Railway deployment
echo "Starting build process..."

# Ensure we have Python 3 and install pip if needed
if ! command -v python3 &> /dev/null; then
    echo "Python3 not found, attempting to install..."
    apt-get update && apt-get install -y python3 python3-pip
else
    echo "Python3 found: $(python3 --version)"
fi

# Install pip if not available
if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
    echo "Installing pip..."
    python3 -m ensurepip --upgrade
    python3 -m pip install --upgrade pip
else
    echo "Pip found"
fi

# Use python3 -m pip to ensure we're using the right pip
echo "Installing dependencies..."
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

echo "Build completed successfully!"