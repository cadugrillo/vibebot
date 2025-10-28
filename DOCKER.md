# Docker Deployment Guide

This guide explains how to deploy VibeBot using Docker for a fully self-contained, production-ready setup.

## Prerequisites

- Docker Engine 20.10 or higher
- Docker Compose 2.0 or higher
- At least 2GB of available RAM
- At least 10GB of available disk space

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/cadugrillo/vibebot.git
cd vibebot
```

### 2. Configure Environment Variables

Copy the Docker environment template and update with your values:

```bash
cp .env.docker .env
```

**Important:** Edit `.env` and update these critical values:

- `POSTGRES_PASSWORD` - Set a strong database password
- `REDIS_PASSWORD` - Set a strong Redis password
- `JWT_SECRET` - Set a secure random string (at least 32 characters)
- `CORS_ORIGIN` - Set to your domain (e.g., `https://vibebot.yourdomain.com`)

### 3. Start All Services

```bash
docker-compose up -d
```

This single command will:
- Build the backend and frontend Docker images
- Start PostgreSQL database
- Start Redis cache
- Run database migrations
- Start the backend API server
- Start the frontend web server

### 4. Access the Application

- **Frontend:** http://localhost (or your configured domain)
- **Backend API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

### 5. Seed the Database (Optional)

To populate the database with test data:

```bash
docker-compose exec backend npm run db:seed
```

**Test credentials:**
- Admin: `admin@vibebot.local` / `password123`
- User: `user@vibebot.local` / `password123`

## Architecture

The Docker setup includes the following services:

### Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| **frontend** | Custom (Node 20 + Nginx) | 80 | React SPA with Nginx reverse proxy |
| **backend** | Custom (Node 20 Alpine) | 3000 | Express.js API server |
| **postgres** | postgres:16-alpine | 5432 | PostgreSQL database |
| **redis** | redis:7-alpine | 6379 | Redis cache and session store |

### Volumes

| Volume | Purpose |
|--------|---------|
| `postgres_data` | PostgreSQL database files |
| `redis_data` | Redis persistence files |
| `backend_uploads` | User uploaded files (future) |

### Network

All services communicate on a private bridge network (`vibebot-network`).

## Configuration

### Environment Variables

#### Application Settings

```env
NODE_ENV=production          # Environment (development/production)
BACKEND_PORT=3000           # Backend API port
FRONTEND_PORT=80            # Frontend web server port
```

#### Database Settings

```env
POSTGRES_DB=vibebot         # Database name
POSTGRES_USER=vibebot       # Database user
POSTGRES_PASSWORD=***       # Database password (CHANGE THIS!)
POSTGRES_PORT=5432          # PostgreSQL port
```

#### Redis Settings

```env
REDIS_PASSWORD=***          # Redis password (CHANGE THIS!)
REDIS_PORT=6379            # Redis port
```

#### Security Settings

```env
JWT_SECRET=***             # JWT signing secret (CHANGE THIS!)
JWT_EXPIRES_IN=7d          # JWT token expiration
CORS_ORIGIN=***            # Allowed CORS origin
```

#### Frontend Settings

```env
VITE_API_URL=http://localhost:3000    # Backend API URL
VITE_WS_URL=ws://localhost:3000       # WebSocket URL
```

## Docker Commands

### Starting Services

```bash
# Start all services in background
docker-compose up -d

# Start and view logs
docker-compose up

# Start specific service
docker-compose up -d backend
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data!)
docker-compose down -v
```

### Viewing Logs

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f postgres
```

### Managing Services

```bash
# Restart a service
docker-compose restart backend

# Rebuild a service
docker-compose up -d --build backend

# Execute command in running container
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed
docker-compose exec backend sh
```

### Database Management

```bash
# Run migrations
docker-compose exec backend npm run db:migrate

# Seed database
docker-compose exec backend npm run db:seed

# Reset database (WARNING: deletes all data!)
docker-compose exec backend npm run db:reset

# Open Prisma Studio
docker-compose exec backend npm run db:studio
```

### Health Checks

```bash
# Check service status
docker-compose ps

# Backend health
curl http://localhost:3000/health

# Frontend health
curl http://localhost/health

# Database health
docker-compose exec postgres pg_isready -U vibebot

# Redis health
docker-compose exec redis redis-cli ping
```

## Production Deployment

### Security Hardening

1. **Use Strong Secrets**
   ```bash
   # Generate secure JWT secret
   openssl rand -base64 48

   # Generate secure passwords
   openssl rand -base64 32
   ```

2. **Enable HTTPS**
   - Use a reverse proxy (Nginx, Traefik, or Caddy)
   - Configure SSL certificates (Let's Encrypt recommended)
   - Update `CORS_ORIGIN` and `VITE_API_URL` to use HTTPS

3. **Restrict Network Access**
   - Only expose necessary ports (80, 443)
   - Keep PostgreSQL and Redis internal (remove `ports` from docker-compose.yml)

4. **Regular Updates**
   ```bash
   # Update Docker images
   docker-compose pull
   docker-compose up -d
   ```

### Backup and Restore

#### Backup Database

```bash
# Create backup
docker-compose exec -T postgres pg_dump -U vibebot vibebot > backup_$(date +%Y%m%d_%H%M%S).sql

# Create backup with compression
docker-compose exec -T postgres pg_dump -U vibebot vibebot | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

#### Restore Database

```bash
# Restore from backup
docker-compose exec -T postgres psql -U vibebot vibebot < backup.sql

# Restore from compressed backup
gunzip < backup.sql.gz | docker-compose exec -T postgres psql -U vibebot vibebot
```

#### Backup Volumes

```bash
# Backup all Docker volumes
docker run --rm \
  -v vibebot_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data_backup.tar.gz /data
```

### Monitoring

#### Resource Usage

```bash
# View container stats
docker stats

# View specific container
docker stats vibebot-backend
```

#### Disk Usage

```bash
# Check Docker disk usage
docker system df

# Check volume sizes
docker volume ls
docker volume inspect vibebot_postgres_data
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker-compose logs backend

# Check container status
docker-compose ps

# Restart specific service
docker-compose restart backend
```

### Database Connection Issues

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test connection manually
docker-compose exec backend npm run db:migrate
```

### Port Conflicts

If ports are already in use, update `.env`:

```env
BACKEND_PORT=3001
FRONTEND_PORT=8080
POSTGRES_PORT=5433
REDIS_PORT=6380
```

### Reset Everything

```bash
# Stop and remove everything (WARNING: deletes all data!)
docker-compose down -v
docker system prune -a

# Start fresh
docker-compose up -d
```

## Performance Tuning

### PostgreSQL

Edit `docker-compose.yml` to add PostgreSQL performance settings:

```yaml
postgres:
  command:
    - "postgres"
    - "-c"
    - "max_connections=200"
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "effective_cache_size=1GB"
```

### Redis

Configure Redis memory limit:

```yaml
redis:
  command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/cadugrillo/vibebot/issues
- Documentation: See README.md and CLAUDE.md

## License

ISC - See LICENSE file for details
