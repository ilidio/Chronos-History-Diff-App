#!/bin/bash

# This script generates a self-signed certificate for local development.

# Create the certificates directory if it doesn't exist
mkdir -p certificates

# Generate the private key and certificate
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' -keyout certificates/localhost-key.pem -out certificates/localhost.pem

echo "✅ Certificates generated in the 'certificates' directory."
