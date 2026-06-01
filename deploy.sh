#!/bin/bash
# PicDefense.io MCP Server — deployment helper.
# Clone the repo on your host and run ./deploy.sh to build and start the container.
# Update later with: git pull && ./deploy.sh

set -e

PRUNE=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --prune) PRUNE=true ;;
        -h|--help)
            echo "Usage: $0 [--prune]"
            echo "  --prune    Clean up dangling Docker resources before building"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Use Compose v2 ("docker compose") if available, else fall back to the legacy
# standalone v1 ("docker-compose"). v1 is EOL — prefer installing docker-compose-plugin.
if sudo docker compose version >/dev/null 2>&1; then
    DC="sudo docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DC="sudo docker-compose"
else
    echo "❌ Neither 'docker compose' (plugin) nor 'docker-compose' (standalone) is installed."
    echo "   Ubuntu archive:     sudo apt-get install docker-compose-v2"
    echo "   Docker's apt repo:  sudo apt-get install docker-compose-plugin"
    exit 1
fi
echo "🧩 Using compose command: $DC"

echo "🚀 Deploying PicDefense.io MCP Server..."

echo "🛑 Stopping existing container..."
$DC down || true

if [ "$PRUNE" = true ]; then
    echo "🧹 Pruning dangling Docker resources..."
    sudo docker container prune -f
    sudo docker image prune -f
    sudo docker builder prune -f
fi

echo "🔨 Building and starting container..."
if [ "$PRUNE" = true ]; then
    $DC build --no-cache
else
    $DC build
fi
$DC up -d

echo "⏳ Waiting for service to start..."
sleep 5

echo "🏥 Checking service health..."
if curl -s http://localhost:6910/health > /dev/null; then
    echo "✅ Service healthy!"
    echo "   🩺 Health: http://localhost:6910/health"
    echo "   📖 Docs:   http://localhost:6910/docs"
    echo "   📡 SSE:    http://localhost:6910/sse?token=USERID:APIKEY"
else
    echo "❌ Health check failed. Logs:"
    echo "   $DC logs -f"
    exit 1
fi

echo "🎉 Deployment complete!"
