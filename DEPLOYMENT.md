# Deployment Guide — Docker Compose

This document guides you through deploying the CRM application using **Docker Compose**. This is the recommended deployment pattern because it packages the Next.js server and the PostgreSQL database into isolated, connected containers with persistent data volumes.

---

## Prerequisites
* **Docker** installed on the host system.
* **Docker Compose** installed.

---

## Deployment Steps

### 1. Build and Start the Application
Run the following command from the root of the project directory to build the web container and start the services in the background:
```bash
docker-compose up --build -d
```

### 2. Verify Services are Running
Check the status of the running containers:
```bash
docker-compose ps
```
You should see:
* `crm_postgres` running on port `5432`
* `crm_web` running on port `3000`

### 3. Review Container Logs
To inspect container startup logs (database initialization and seeding validation):
```bash
docker-compose logs -f web
```

---

## Production Volumes
The configuration creates two persistent volumes to ensure data is never lost during container restarts or updates:
1. **`postgres_data`**: Stores the actual PostgreSQL database files.
2. **`uploads_secure`**: Stores uploaded query email attachments and reply documents securely on the host system.

---

