# Docker Setup for CollectionBuilder

This directory now includes Docker configuration for easy local development without dealing with Ruby native extensions on Windows.

## Prerequisites

1. **Docker Desktop installed** on Windows with WSL 2 backend
   - Download: https://www.docker.com/products/docker-desktop
   - Make sure to restart your computer after installation

2. **Verify Docker installation:**
   ```powershell
   docker --version
   docker run hello-world
   ```

## Running the Site

Once Docker Desktop is installed and running, use any of these methods:

### Method 1: Docker Compose (Easiest)

```powershell
# From project root directory
docker-compose up

# Or run in background
docker-compose up -d
```

### Method 2: Direct Docker Command

```powershell
docker build -t jekyll-petrosylvania .
docker run -p 4000:4000 -v ${PWD}:/site jekyll-petrosylvania
```

### Method 3: Using PowerShell with full path

```powershell
$projectDir = Get-Location
docker run -it --rm -p 4000:4000 -v "${projectDir}:/site" ruby:3.3-slim bash

# Inside container:
cd /site
bundle install
bundle exec jekyll serve --host 0.0.0.0
```

## Access the Site

Once running, open your browser to:

**http://localhost:4000**

## Stopping the Container

```powershell
# If using docker-compose
docker-compose down

# If using direct docker run, press Ctrl+C in terminal
```

## Troubleshooting

**"Docker daemon not running"**
- Open Docker Desktop from Start Menu
- Wait 30 seconds for it to fully initialize

**"Cannot find Dockerfile"**
- Make sure you're running the command from the project root directory

**Port 4000 already in use**
- Change the port: Replace `4000:4000` with `4001:4000` (access via port 4001)

**Slow first build**
- The initial Docker build takes 2-3 minutes
- Subsequent builds are much faster (cached layers)

## Development Workflow

With docker-compose running:

1. Edit files in your editor normally
2. Jekyll automatically detects changes and rebuilds
3. Refresh browser to see updates (if not using livereload)

## Useful Docker Commands

```powershell
# List running containers
docker ps

# Stop all containers
docker stop $(docker ps -q)

# View container logs
docker logs <container_id>

# Access container shell
docker exec -it <container_id> bash

# Clean up unused Docker resources
docker system prune
```
