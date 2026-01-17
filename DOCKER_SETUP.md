# Docker Setup & Autoscaling Guide for AshtaPashaka

This document provides comprehensive instructions for running AshtaPashaka with Docker and Docker Compose, including autoscaling, health checks, resource limits, and troubleshooting.

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │ (Port 3000)
│  (React/Vite)   │
└────────┬────────┘
         │
┌────────▼────────┐
│   Nginx         │ (Port 8080)
│  Load Balancer  │
└────────┬────────┘
         │
    ┌────┴─────┬──────────┐
    │           │          │
┌───▼──┐   ┌───▼──┐  ┌───▼──┐
│Backend│   │Backend│  │Backend│
│  #1   │   │  #2   │  │  #3  │ (Scalable)
└───────┘   └───────┘  └───────┘
    (Port 3001)

Optional:
┌──────────────────┐
│  Prometheus      │ (Port 9090)
└──────────────────┘
```

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- 2GB RAM minimum (4GB+ recommended)

## Quick Start

```bash
# Clone and navigate to project
cd /path/to/AshtaPashaka

# Build and start services
docker-compose up -d --scale backend=2

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Accessing Services

- **Frontend**: http://localhost:3000
- **Backend (Direct)**: ws://localhost:3001
- **Backend (Via Nginx)**: http://localhost:8080
- **Prometheus Metrics**: http://localhost:9090

## Scaling & Load Balancing

To scale backend replicas:

```bash
docker-compose up -d --scale backend=5
```

Nginx load balances using the `least_conn` algorithm. Update `nginx.conf` to add more backend servers if needed.

## Health Checks

All services include health checks. View status:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

## Resource Limits

Resource constraints are set in `docker-compose.yml`. Adjust as needed for your hardware.

## Monitoring & Metrics

Prometheus is included for monitoring (optional). Access at http://localhost:9090

## Production Deployment

- Use Docker Swarm or Kubernetes for production autoscaling and orchestration.
- See [Docker Documentation](https://docs.docker.com/) and [Kubernetes Documentation](https://kubernetes.io/docs/).

## Environment Variables

Create a `.env` file for configuration. See examples in the original compose file.

## Common Commands

```bash
# Start services
docker-compose up -d

# Scale backend
docker-compose up -d --scale backend=5

# View running containers
docker-compose ps

# View logs
docker-compose logs -f

# Stop and remove
docker-compose down -v
```

## Troubleshooting

- Check logs: `docker-compose logs`
- Verify ports: `lsof -i :3000`, `lsof -i :3001`, etc.
- Restart: `docker-compose restart`

## Cleanup

```bash
docker-compose down
docker image prune
docker system prune --all --volumes
```
