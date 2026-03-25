# 🌦️ UEC Weather IoT Platform

A full-stack IoT backend system for collecting, processing, and visualizing weather data using MQTT, InfluxDB, PostgreSQL, and Grafana.

---

## 🚀 Features

- 🔐 Authentication (JWT + Role-based access)
- 👤 User & Admin management
- 📡 MQTT integration (EMQX)
- 📈 Time-series storage (InfluxDB)
- 🗄️ Relational database (PostgreSQL + Prisma)
- 📊 Dashboard visualization (Grafana)
- ⚡ Real-time communication (Socket.io)
- 📄 API Documentation (Swagger)

---

## 🏗️ Tech Stack

- Node.js + Express
- Prisma ORM
- PostgreSQL
- InfluxDB
- EMQX (MQTT Broker)
- Grafana
- Docker & Docker Compose

---

## 📦 Project Structure

```bash
backend/
├── src/
│   ├── config/         # DB & Service configurations
│   ├── modules/        # Domain-driven modules (Auth, Admin, Telemetry)
│   ├── mqtt/           # MQTT Client & Message handlers
│   ├── socket/         # Real-time WebSockets
│   ├── middleware/     # Auth, Role, & Error handlers
│   ├── app.js          # Express app setup
│   └── server.js       # Server entry point
├── prisma/             # Schema & Migrations
├── docker-compose.yml  # Multi-container orchestration
└── Dockerfile          # Backend container definition

```
---

## ⚙️ Environment Variables

Create a `.env` file in the root:

---

## 🐳 Docker Operations
- 🔥 Start all services
```Bash
docker compose up -d --build
```
- 🛑 Stop & Reset
```Bash
docker compose down      # Stop
docker compose down -v   # Reset (Deletes all data volumes!)
```

- 📜 Monitoring
```Bash
docker compose logs -f weather-backend
```

- 📜 Shell
```Bash
docker exec -it weather-backend sh
```

- 📜 Shell prisma studio
```Bash
docker-compose exec backend npx prisma studio --browser none
```


- 📜 prisma db seed
```Bash
docker exec -it weather-backend npx prisma db seed
```


---

## 🧬 Database Management (Prisma)
Run these commands inside the backend container or locally if Node is installed:

```Bash
npx prisma generate     # Generate Prisma Client
npx prisma migrate dev  # Run migrations
npx prisma studio       # GUI for PostgreSQL
```
---

## 🌐 API Documentation
Access the interactive Swagger UI at:
👉 http://localhost:4000/api-docs

---

## 📊 Service Access Control
- Service,URL,Default Credentials
- Backend API,http://localhost:4000,-
- Grafana,http://localhost:3000,admin / admin
- EMQX Dashboard,http://localhost:18083,admin / public
- InfluxDB,http://localhost:8086,admin / admin1234
