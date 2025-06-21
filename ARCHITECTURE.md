# 🏗️ NVN Backend - System Architecture

## 📋 Overview

Hệ thống được thiết kế tối ưu cho **1000 users** với nguyên tắc **KISS (Keep It Simple, Stupid)**, tránh over-engineering và tập trung vào hiệu suất & bảo trì.

## 🎯 Architecture Components

### Core Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│  Web App  │  Mobile App  │  Third-party APIs  │  Admin UI   │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                     API GATEWAY & SECURITY                  │
│   Load Balancer  │  Rate Limiter  │  JWT Auth  │  CORS      │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│              NestJS API Server (Single Instance)            │
│   Controllers │ Services │ Guards │ Middlewares │ Filters    │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                     MESSAGE QUEUE                           │
│              RabbitMQ (Background Jobs)                     │
│   Email Queue │ Analytics │ Notifications │ File Processing │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                             │
│   PostgreSQL (Primary)  │  Redis (Cache + Sessions)        │
│   User Data │ Business Logic │ Cache │ Rate Limiting         │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Component Details

| Component         | Technology          | Purpose              | Scale      | Resources        |
| ----------------- | ------------------- | -------------------- | ---------- | ---------------- |
| **API Server**    | NestJS + TypeScript | RESTful APIs         | 1 instance | 2 CPU, 2GB RAM   |
| **Database**      | PostgreSQL (latest) | Primary data store   | 1 instance | 2 CPU, 4GB RAM   |
| **Cache**         | Redis (latest)      | Sessions + Cache     | 1 instance | 1 CPU, 1GB RAM   |
| **Message Queue** | RabbitMQ (latest)   | Background jobs      | 1 instance | 1 CPU, 1GB RAM   |
| **Load Balancer** | Nginx/Traefik       | Traffic distribution | 1 instance | 1 CPU, 512MB RAM |

**Total Resources:** ~6 CPU cores, 8.5GB RAM

## 🚀 What We DON'T Need (for 1000 users)

### ❌ Over-engineered Solutions

- **OpenSearch/Elasticsearch** → PostgreSQL full-text search
- **OPA (Open Policy Agent)** → Simple role-based decorators
- **Microservices** → Monolith easier to maintain
- **ELK Stack** → File logging with rotation
- **Service Mesh** → Direct container communication
- **Kubernetes** → Docker Compose sufficient
- **Complex CI/CD** → Simple deployment pipeline

### ❌ Premature Optimizations

- Multiple database replicas
- Advanced caching strategies (Redis Cluster)
- Complex sharding
- Advanced monitoring (Prometheus + Grafana)
- Multiple environments (staging, QA, etc.)

## 🎯 Docker Compose Setup

### Core Services (Required)

```yaml
version: '3.8'
services:
    # API Server
    api:
        build: .
        ports: ['3000:3000']
        depends_on: [postgres, redis, rabbitmq]

    # Primary Database
    postgres:
        image: postgres:latest
        environment:
            POSTGRES_DB: nvn_backend
            POSTGRES_USER: postgres
            POSTGRES_PASSWORD: postgres
        volumes:
            - postgres_data:/var/lib/postgresql/data
        ports: ['5432:5432']

    # Cache & Sessions
    redis:
        image: redis:latest
        ports: ['6379:6379']
        command: redis-server --appendonly yes
        volumes:
            - redis_data:/data

    # Message Queue
    rabbitmq:
        image: rabbitmq:latest-management
        environment:
            RABBITMQ_DEFAULT_USER: rabbitmq
            RABBITMQ_DEFAULT_PASS: rabbitmq
        ports:
            - '5672:5672' # AMQP
            - '15672:15672' # Management UI
        volumes:
            - rabbitmq_data:/var/lib/rabbitmq

volumes:
    postgres_data:
    redis_data:
    rabbitmq_data:
```

### Optional Services (Development)

```yaml
# Database Administration
pgadmin:
    image: dpage/pgadmin4:latest
    environment:
        PGADMIN_DEFAULT_EMAIL: admin@nvn.com
        PGADMIN_DEFAULT_PASSWORD: admin
    ports: ['8080:80']

# Load Balancer (Production)
nginx:
    image: nginx:latest
    ports: ['80:80', '443:443']
    volumes:
        - ./nginx.conf:/etc/nginx/nginx.conf
```

## 📈 Performance Expectations

### Concurrent Users

- **Peak Load:** 200 concurrent users
- **Average Load:** 50-100 concurrent users
- **Daily Active Users:** 500-800 users

### Response Times

- **API Endpoints:** < 200ms (95th percentile)
- **Database Queries:** < 50ms average
- **Cache Hits:** < 5ms
- **Background Jobs:** < 30 seconds

### Resource Usage

- **API Server:** 30% CPU, 1.5GB RAM
- **PostgreSQL:** 40% CPU, 3GB RAM
- **Redis:** 10% CPU, 500MB RAM
- **RabbitMQ:** 15% CPU, 800MB RAM

## 🔧 Environment Configuration

### Development

```bash
# Quick start
docker-compose up -d

# API: http://localhost:3000
# DB: localhost:5432
# Redis: localhost:6379
# RabbitMQ UI: http://localhost:15672
```

### Production

```bash
# With load balancer
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Enable SSL, monitoring, backup
```

## 🛡️ Security Setup

### Basic Security (Required)

- JWT authentication with refresh tokens
- Rate limiting (100 req/15min per IP)
- Input validation (class-validator)
- CORS configuration
- SQL injection protection (TypeORM)
- XSS protection (helmet.js)

### Advanced Security (Optional)

- API key authentication for third-party
- Request/response logging
- IP whitelisting for admin APIs
- Database encryption at rest

## 📊 Monitoring & Health Checks

### Health Endpoints

```
GET /health        - Basic health check
GET /health/db     - Database connectivity
GET /health/redis  - Cache connectivity
GET /health/mq     - Message queue status
```

### Basic Metrics

- Request count & response times
- Database connection pool status
- Cache hit/miss ratios
- Queue message counts
- Memory & CPU usage

### Logging Strategy

```
Levels: ERROR, WARN, INFO, DEBUG
Storage: File rotation (10MB max, 7 days)
Format: JSON for easy parsing
Location: /logs/{service}-{date}.log
```

## 🚀 Deployment Strategy

### Single Server Deployment (Recommended)

```bash
# VPS Requirements
CPU: 4 cores (Intel/AMD)
RAM: 16GB
Storage: 100GB SSD
OS: Ubuntu 22.04 LTS
```

### Scaling Strategy (Future)

1. **Vertical Scaling:** Increase server resources first
2. **Database Optimization:** Query optimization, indexing
3. **Caching:** Add more Redis instances
4. **Load Balancing:** Multiple API instances
5. **Database Replicas:** Read replicas for analytics

## 📋 Setup Checklist

### Initial Setup

- [ ] Docker & Docker Compose installed
- [ ] Environment variables configured
- [ ] SSL certificates (production)
- [ ] Database migrations run
- [ ] Initial admin user created

### Security Setup

- [ ] JWT secrets configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Input validation active
- [ ] Security headers enabled

### Monitoring Setup

- [ ] Health checks working
- [ ] Log rotation configured
- [ ] Basic metrics collection
- [ ] Error alerting (email/Slack)
- [ ] Backup strategy implemented

### Production Readiness

- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Team training completed
- [ ] Rollback plan prepared

---

## 🎯 Next Steps

1. **Setup Development Environment**

    ```bash
    git clone <repo>
    cp .env.example .env
    docker-compose up -d
    ```

2. **Run Migrations & Seed Data**

    ```bash
    npm run migration:run
    npm run seed:dev
    ```

3. **Verify Setup**

    - Check health endpoints
    - Test authentication
    - Verify message queues
    - Run test suite

4. **Production Deployment**
    - Setup domain & SSL
    - Configure monitoring
    - Setup backups
    - Load testing
