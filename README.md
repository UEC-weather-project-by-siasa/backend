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
backend/
├── src/
│ ├── config/
│ ├── modules/
│ │ ├── auth/
│ │ └── admin/
│ ├── mqtt/
│ ├── socket/
│ ├── middleware/
│ ├── utils/
│ ├── app.js
│ └── server.js
├── prisma/
├── docker-compose.yml
└── Dockerfile


---

## ⚙️ Environment Variables

Create a `.env` file in the root:

---

