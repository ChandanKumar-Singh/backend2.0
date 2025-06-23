✅ **Multi-client support**: APIs for `admin`, `app`, etc.
✅ **Versioning**: e.g., `/api/v1/admin/`, `/api/v1/app/`
✅ Modular and scalable routing with **clean separation**.

---

# ✅ Node.js + MongoDB Backend with Multi-Client API & Versioning (JavaScript)

> A **modular, enterprise-grade Node.js backend in JavaScript** using Express, Mongoose, Redis, BullMQ, and Docker.
>
> The system must support **multi-client APIs** (like admin panel, mobile app, etc.) with **versioned routes**, clean modular structure, strong security, testing, background jobs, and deployment readiness.

---

## 📁 Final Directory Structure

```
project-root/
├── src/
│   ├── config/                 # DB, Redis, ENV configs
│   ├── core/                   # Logger, response, base error, handlers
│   ├── middlewares/           # Auth, RBAC, validators, cache, error
│   ├── utils/                 # Helper functions (queryParser, validators)
│   ├── jobs/                  # BullMQ queues & workers
│   ├── routes/
│   │   ├── v1/
│   │   │   ├── admin/
│   │   │   │   ├── users.routes.js
│   │   │   │   ├── orders.routes.js
│   │   │   │   └── index.js         # Combines all admin routes
│   │   │   ├── app/
│   │   │   │   ├── auth.routes.js
│   │   │   │   ├── products.routes.js
│   │   │   │   └── index.js         # Combines all app routes
│   │   │   └── index.js             # Combines all v1 routes
│   │   └── index.js                 # Mounts /api/v1/ etc.
│   ├── modules/               # Business logic (controller, service, model)
│   │   ├── auth/
│   │   ├── users/
│   │   ├── orders/
│   │   ├── products/
│   │   └── notifications/
│   ├── app.js                 # Express app (middlewares, routes, etc.)
│   └── server.js              # Server bootstrap & DB init
├── tests/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── .env
├── package.json
├── README.md
└── nginx.conf
```

---

## 🌐 Route Design

All routes must be **versioned** and **namespace-separated**:

```
/api/v1/admin/users
/api/v1/admin/orders
/api/v1/app/auth/login
/api/v1/app/products
```

🛠️ Use **route folders per version + client**, and automatically mount them via `routes/index.js`.

---

## 🧠 Smart Features to Include

### 🔐 Auth & Security

* JWT auth with refresh tokens
* Role-based access control (admin, user)
* Rate limiting, Helmet, CORS, CSRF
* Bcrypt for password hashing

### 📦 API System

* Standard CRUD
* Rich filters: `?status=active&sort=createdAt:-1&page=2`
* Central response formatter

### ⚙️ Core Features

* Redis-based cache
* BullMQ for background jobs (e.g. email queue)
* Winston or Pino logging
* .env-configured secrets
* Query Parser helper
* Soft delete & timestamps
* Health check endpoint

### 🧪 Testing

* Jest + Supertest
* Coverage setup

### 🚀 Deployment

* Docker + Docker Compose
* PM2 process config
* Nginx reverse proxy
* `.env.template` for CI/CD

### 📚 Docs

* Swagger (OpenAPI)
* README with API, setup, deploy instructions

---

## ✅ Output Requirements

* Full backend code in JavaScript
* Complete folder structure as above
* `package.json` with run scripts:

  * `npm run dev`, `start`, `test`, `lint`, `format`
* Docker support
* Redis & MongoDB integration
* Swagger/OpenAPI
* Auto-mounting versioned routes for admin/app

---

## 💬 Final Note to AI

💡 Code in JavaScript (no TypeScript).
💡 Clean, scalable, SOLID-friendly structure.
💡 Every route must be modular, well-documented, and versioned.
💡 No hardcoded configs — use `.env`.
💡 Responses and errors must follow a standard format.

