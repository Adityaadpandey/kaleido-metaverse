#!/bin/bash

# Navigate to your repo if needed
pwd

# Start processes in the background
(cd apps/ws-server && bun start) &
(cd apps/https-server && bun start) &
(cd apps/web && bun dev) &
(docker compose up) &

# Wait for all processes to complete
wait
