# 🐳 Docker Management Scripts

## 🚀 Quick Start Commands

### Production Mode

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart specific service
docker-compose restart api
```

### Development Mode

```bash
# Start development environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Start with live reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up api

# Debug mode with port 9229 exposed
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up api-debug
```

## 🛠️ Useful Commands

### Database Management

```bash
# Connect to PostgreSQL
docker exec -it nvn-postgres psql -U postgres -d nvn_backend

# Backup database
docker exec nvn-postgres pg_dump -U postgres nvn_backend > backup.sql

# Restore database
docker exec -i nvn-postgres psql -U postgres nvn_backend < backup.sql

# View database logs
docker logs nvn-postgres
```

### Redis Management

```bash
# Connect to Redis CLI
docker exec -it nvn-redis redis-cli

# Monitor Redis commands
docker exec -it nvn-redis redis-cli monitor

# View Redis logs
docker logs nvn-redis
```

### RabbitMQ Management

```bash
# Access RabbitMQ Management UI
# http://localhost:15672
# Username: rabbitmq
# Password: rabbitmq

# View RabbitMQ logs
docker logs nvn-rabbitmq

# List queues
docker exec nvn-rabbitmq rabbitmqctl list_queues
```

### Application Management

```bash
# View API logs
docker logs nvn-api -f

# Execute commands in API container
docker exec -it nvn-api sh

# Rebuild API container
docker-compose build api

# Run tests in container
docker exec nvn-api pnpm test
```

## 🔍 Health Checks & Monitoring

### Check Service Status

```bash
# All services
docker-compose ps

# Specific health checks
curl http://localhost:3000/health
curl http://localhost:3000/health/db
curl http://localhost:3000/health/redis
curl http://localhost:3000/health/mq
```

### Performance Monitoring

```bash
# Container resource usage
docker stats

# Container processes
docker exec nvn-api ps aux

# Database connections
docker exec nvn-postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

## 🧹 Cleanup Commands

### Remove Everything

```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Remove all containers and volumes
docker-compose down -v --remove-orphans

# Clean up unused images
docker image prune -a

# Clean up everything
docker system prune -a --volumes
```

### Selective Cleanup

```bash
# Remove only containers
docker-compose down

# Remove specific volume
docker volume rm nvn-backend_postgres_data

# Rebuild without cache
docker-compose build --no-cache
```

## 🔄 Environment Switching

### Development → Production

```bash
# Stop development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

# Start production
docker-compose up -d
```

### Production → Development

```bash
# Stop production
docker-compose down

# Start development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

## 🚨 Troubleshooting

### Common Issues

```bash
# Port already in use
sudo lsof -i :3000
sudo kill -9 <PID>

# Database connection failed
docker exec nvn-postgres pg_isready -U postgres

# Redis connection failed
docker exec nvn-redis redis-cli ping

# Container not starting
docker logs <container_name>

# Permission issues
sudo chown -R $USER:$USER ./logs
chmod -R 755 ./logs
```

### Debug Network Issues

```bash
# Check network
docker network ls
docker network inspect nvn-backend_nvn-network

# Test connectivity
docker exec nvn-api ping postgres
docker exec nvn-api nslookup redis
```

## 📊 Service URLs

### Development Environment

- **API**: http://localhost:3000
- **API Debug**: http://localhost:3000 (port 9229 for debugger)
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **RabbitMQ AMQP**: localhost:5672
- **RabbitMQ Management**: http://localhost:15672
- **PgAdmin**: http://localhost:8080

### Production Environment

- **API**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **RabbitMQ AMQP**: localhost:5672
- **RabbitMQ Management**: http://localhost:15672
