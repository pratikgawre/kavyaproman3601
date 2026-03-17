# Railway Deployment - Visual Architecture & Reference Guide

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        RAILWAY PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐    ┌──────────────────┐  ┌─────────────┐  │
│  │   FRONTEND       │    │   BACKEND API    │  │  MYSQL DB   │  │
│  │                  │    │                  │  │             │  │
│  │  React + Vite    │    │  Spring Boot 4.0 │  │  Database   │  │
│  │  Port: 3000      │    │  Port: 8080      │  │  Port: 3306 │  │
│  │                  │    │                  │  │             │  │
│  └────────┬─────────┘    └────────┬─────────┘  └──────┬──────┘  │
│           │                       │                    │         │
│           │       API Calls       │                    │         │
│           └──────────────────────►├──────────┬────────►│         │
│                                   │  Queries │        │         │
│  Railway Domain:                  │          │        │         │
│  https://frontend-xxx.railway.app │          └────────┘         │
│                                   │                              │
│  https://backend-xxx.railway.app  │                              │
│                                   ▼                              │
│                         Environment Variables                    │
│                         • MYSQL_HOST                             │
│                         • MYSQL_PORT                             │
│                         • MYSQL_USER                             │
│                         • MYSQL_PASSWORD                         │
│                         • MYSQL_DATABASE                         │
│                         • SENDGRID_API_KEY                       │
│                         • EMAIL_* variables                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

        │
        │ GitHub Push
        ▼
┌─────────────────────────┐
│  GitHub Repository      │
│  New_kavya_360          │
│                         │
│  ├─ backend/            │
│  ├─ frontend/           │
│  └─ sql/                │
└─────────────────────────┘
```

---

## 📊 Deployment Flow

```
1. LOCAL DEVELOPMENT
   ├─ Code changes locally
   ├─ Test backend: mvn spring-boot:run
   ├─ Test frontend: npm run dev
   └─ Commit to GitHub

2. GITHUB PUSH
   └─ git push origin main

3. RAILWAY DETECTION
   ├─ Webhook triggered
   ├─ Clone repository
   └─ Detect Dockerfile

4. BUILD PHASE
   ├─ Backend: Maven build → Docker image
   ├─ Frontend: npm install → npm build → Docker image
   └─ Services ready

5. DEPLOY PHASE
   ├─ Pull Docker images
   ├─ Start containers
   ├─ Environment variables injected
   └─ Health checks

6. RUNNING STATE
   ├─ Frontend: Serving on port 3000
   ├─ Backend: Listening on port 8080
   ├─ MySQL: Running internally
   └─ Communication: API calls via HTTP

7. MONITORING
   ├─ Check logs
   ├─ Monitor metrics
   ├─ Verify connectivity
   └─ Production ready ✓
```

---

## 🔌 Service Connections

### Frontend → Backend
```
Frontend (React)
    │
    ├─ API URL: import.meta.env.VITE_API_BASE_URL
    │           = https://backend-xxx.railway.app/api
    │
    ├─ Axios Instance
    │   .baseURL = API_BASE_URL
    │   .timeout = 10000ms
    │
    └─ HTTP Requests
        GET  /api/users
        POST /api/login
        PUT  /api/projects
        etc.
        
Backend (Spring Boot)
    │
    ├─ CORS Enabled
    │   .allowedOrigins("https://frontend-xxx.railway.app")
    │
    ├─ Controller Endpoints
    │   @RestController
    │   @RequestMapping("/api")
    │
    └─ Response JSON
```

### Backend → MySQL
```
Spring Boot Application
    │
    ├─ DataSource
    │   url: jdbc:mysql://mysql.railway.internal:3306/kavyaprodb
    │   username: root
    │   password: <from env>
    │
    ├─ Connection Pool (HikariCP)
    │   max: 10 connections
    │   min: 5 idle
    │
    ├─ Hibernate ORM
    │   Entity → SQL Query
    │
    └─ MySQL Database
        ├─ Tables (auto-created)
        ├─ Data persistence
        └─ Backups
```

---

## 🔑 Environment Variable Map

```
┌──────────────────────────────────┐
│  BACKEND ENVIRONMENT             │
├──────────────────────────────────┤
│                                  │
│  SPRING_DATASOURCE_URL           │
│  ├─ jdbc:mysql://               │
│  ├─ ${MYSQL_HOST}:${MYSQL_PORT} │
│  └─ /${MYSQL_DATABASE}           │
│                                  │
│  SPRING_DATASOURCE_USERNAME      │
│  └─ ${{ MySQL.MYSQL_USER }}      │
│                                  │
│  SPRING_DATASOURCE_PASSWORD      │
│  └─ ${{ MySQL.MYSQL_PASSWORD }}  │
│                                  │
│  PORT                            │
│  └─ 8080                         │
│                                  │
│  SENDGRID_API_KEY                │
│  └─ SG.xxxxxxxxxxxxxxxxx         │
│                                  │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  FRONTEND ENVIRONMENT            │
├──────────────────────────────────┤
│                                  │
│  VITE_API_BASE_URL               │
│  └─ https://backend-xxx/api      │
│                                  │
│  VITE_API_URL                    │
│  └─ https://backend-xxx          │
│                                  │
│  NODE_ENV                        │
│  └─ production                   │
│                                  │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  MYSQL ENVIRONMENT               │
├──────────────────────────────────┤
│                                  │
│  MYSQL_HOST                      │
│  └─ mysql.railway.internal       │
│                                  │
│  MYSQL_PORT                      │
│  └─ 3306                         │
│                                  │
│  MYSQL_USER                      │
│  └─ root (or custom)             │
│                                  │
│  MYSQL_PASSWORD                  │
│  └─ (random, auto-generated)     │
│                                  │
│  MYSQL_DATABASE                  │
│  └─ railway (or custom)          │
│                                  │
└──────────────────────────────────┘
```

---

## 📁 File Organization

```
KavyaProMan300/
├── 📋 Documentation (You are here!)
│   ├── RAILWAY_README.md ..................... Main guide
│   ├── RAILWAY_DEPLOYMENT.md ................ Step-by-step
│   ├── RAILWAY_DEPLOYMENT_CHECKLIST.md ...... Interactive checklist
│   ├── RAILWAY_ENV_VARIABLES.md ............. Variable reference
│   ├── RAILWAY_TROUBLESHOOTING.md ........... Common issues
│   └── RAILROAD_ARCHITECTURE.md ............ This file
│
├── backend/
│   ├── pom.xml ........................... Java dependencies
│   ├── Dockerfile ........................ Container definition
│   │
│   ├── src/main/java/com/team1/backend/
│   │   ├── BackendApplication.java
│   │   │
│   │   ├── config/
│   │   │   ├── CorsConfig.java ......... CORS for production ⭐
│   │   │   └── ...
│   │   │
│   │   ├── controller/ ................ API endpoints
│   │   ├── service/ ................... Business logic
│   │   ├── model/ ..................... JPA entities
│   │   ├── repository/ ................ Database queries
│   │   └── dto/ ....................... Data transfer objects
│   │
│   ├── src/main/resources/
│   │   ├── application.properties ...... Default config ⭐
│   │   ├── application-prod.properties . Production overrides ⭐
│   │   └── application-dev.properties .. Development config
│   │
│   └── sql/
│       ├── add_difficulty_column.sql ... Database schema
│       └── add_user_profile_columns.sql  Database schema
│
├── frontend/
│   ├── package.json ...................... Node dependencies
│   ├── Dockerfile ....................... Container definition ⭐
│   ├── vite.config.js ................... Vite configuration
│   │
│   ├── .env.production .................. Production variables ⭐
│   ├── .env.development ................. Development variables ⭐
│   │
│   ├── src/
│   │   ├── main.jsx ..................... Entry point
│   │   ├── App.jsx ....................... Main component
│   │   │
│   │   ├── components/
│   │   │   ├── ProtectedRoute.jsx ....... Auth guard
│   │   │   ├── SidebarController.jsx
│   │   │   └── CustomDropdown.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Auth.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Board.jsx
│   │   │   ├── Backlog.jsx
│   │   │   ├── Project.jsx
│   │   │   ├── Teams.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── Subscription.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js ................... API client ⭐
│   │   │
│   │   └── assets/
│   │
│   └── public/
│       ├── _redirects ................... Vercel/Railway redirect
│       └── vite.svg
│
└── railway.json ......................... Service config reference

⭐ = Important for production deployment
```

---

## ⚙️ Configuration Priority

```
BUILD TIME (When deploying):
    ├─ Dockerfile
    ├─ Environment Variables (from Railway UI)
    └─ Railway Settings (root directory, port)

RUNTIME (When service starts):
    ├─ Environment Variables
    │  ├─ SPRING_DATASOURCE_URL
    │  ├─ VITE_API_BASE_URL
    │  └─ ... other vars
    │
    ├─ application-prod.properties (Backend)
    ├─ .env.production (Frontend)
    │
    └─ Service Defaults
       ├─ PORT: 8080 (Backend), 3000 (Frontend)
       ├─ Database: Connected via URL
       └─ Logging: Configured
```

---

## 🔄 Update & Redeploy Flow

```
Update Code
    │
    ├─ Edit file (e.g., Backend.java)
    │
    ├─ Test locally
    │   └─ mvn spring-boot:run
    │
    ├─ Commit & Push
    │   └─ git push origin main
    │
    └─ GitHub Webhook
        │
        └─ Triggers Railway
            │
            ├─ Pull latest code
            │
            ├─ Rebuild Docker image
            │
            ├─ Inject environment variables
            │
            ├─ Start new container
            │
            ├─ Run health checks
            │
            └─ ✓ Service updated
               (old version stops, new version starts)
```

---

## 📈 Service Health Status Indicators

```
🟢 GREEN (Running, Healthy)
   ├─ Service is running
   ├─ Passes health checks
   ├─ Responding to requests
   └─ No recent errors

🟡 YELLOW (Deploying/Building)
   ├─ Currently building
   ├─ Waiting for resources
   ├─ Starting up
   └─ Give it 5-10 minutes

🔴 RED (Failed/Crashed)
   ├─ Service crashed
   ├─ Check logs for errors
   ├─ Common causes:
   │  ├─ Database connection failed
   │  ├─ Port already in use
   │  ├─ Build failed
   │  └─ Out of memory
   └─ Click "Restart" to recover

⚪ GRAY (Paused)
   ├─ Service is paused
   ├─ Click "Resume" to start
   └─ Use to save costs temporarily
```

---

## 🌍 Networking Diagram

```
                    INTERNET
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    ▼                   ▼                   ▼
User Browser      API Client        Mobile App
    │                   │                   │
    └───────────────────┼───────────────────┘
                        │
                 HTTPS (Port 443)
                        │
    ┌───────────────────┼───────────────────┐
    │                                       │
    ▼                                       ▼
FRONTEND                                BACKEND
frontend-xxx.railway.app            backend-xxx.railway.app
    │                                       │
    ├─ React App                            ├─ Spring Boot API
    ├─ Port 3000 (internal)                 ├─ Port 8080 (internal)
    └─ DNS: railway.app                     ├─ Controllers
                                            ├─ Services
                                            └─ DNS: railway.app
                                                    │
                                                    ▼
                                            ┌──────────────┐
                                            │   MYSQL DB   │
                                            │ (Internal)   │
                                            │  Port 3306   │
                                            │ Not exposed  │
                                            │ Only Backend │
                                            │ can access   │
                                            └──────────────┘
```

---

## 🔐 Security Layers

```
LAYER 1: Network Security
├─ HTTPS/TLS: All external communication encrypted
├─ Internal networking: MySQL not exposed to internet
└─ Firewall: Railway manages infrastructure

LAYER 2: Application Security
├─ CORS: Only allowed origins can make API calls
├─ Authentication: JWT/Session validation
└─ Input validation: Backend validates all requests

LAYER 3: Data Security
├─ Database encryption: At rest
├─ Password hashing: For user credentials
├─ API keys: Stored in environment variables
└─ Connection pooling: Secure database access

LAYER 4: Deployment Security
├─ No secrets in code: Use environment variables
├─ Docker security: Container isolation
├─ Railway security: Infrastructure monitoring
└─ Access control: Only you can manage services
```

---

## 📊 Resource Allocation

```
FRONTEND SERVICE
├─ CPU: ~0.1 - 0.5 cores (React serving static files)
├─ Memory: ~256 MB - 512 MB
├─ Disk: ~100 MB (Node modules + build)
└─ Network: Low bandwidth (static assets)

BACKEND SERVICE
├─ CPU: ~0.5 - 2 cores (Processing requests)
├─ Memory: ~512 MB - 1 GB (JVM + database connections)
├─ Disk: ~500 MB (Java runtime + dependencies)
└─ Network: Moderate bandwidth (API traffic)

MYSQL SERVICE
├─ CPU: ~0.5 - 1 core (Database queries)
├─ Memory: ~256 MB - 512 MB (Buffer pool)
├─ Disk: ~5 GB - 50 GB (Data storage)
└─ Network: Low bandwidth (Local requests only)

TOTAL ESTIMATE:
├─ Free tier: Works for small projects
├─ Paid tier: ~$5-15/month total
└─ Scale up as needed
```

---

## 🔍 Monitoring Dashboard Metrics

```
┌─────────────────────────────────────────┐
│        BACKEND SERVICE METRICS          │
├─────────────────────────────────────────┤
│                                         │
│ CPU Usage         ▂▄▆█▆▄▂              │ Should: < 80%
│ Memory Usage      ▅▅▆▆█▆▅▄             │ Should: < 85%
│ Network In        ▁▂▁▃▂▁▂▁             │ Monitor trends
│ Network Out       ▂▂▃▂▂▃▂▁             │ Normal activity
│ Requests/sec      ▃▄▃▅▄▃▄▂             │ Track load
│ Error Rate        ▁▁▁▁▁▁▁▁ (low)       │ Should: near 0%
│                                         │
│ Status: 🟢 HEALTHY                     │
│ Uptime: 99.9% (15 days)                │
│                                         │
└─────────────────────────────────────────┘

High CPU/Memory = Need to optimize or scale up
High Error Rate = Check logs for issues
Network spikes = Analyze peak usage
```

---

## 🎯 Quick Reference Checklist

During Deployment:
- [ ] MySQL service status: 🟢
- [ ] Backend service status: 🟢
- [ ] Frontend service status: 🟢
- [ ] Environment variables: Set correctly
- [ ] Database initialized: Tables created
- [ ] API responding: Check backend health
- [ ] Frontend accessible: Load without errors
- [ ] API connectivity: Frontend calling backend
- [ ] No error logs: Application running clean

---

**This architecture is optimized for:**
- ✅ Scalability - Easy to add more resources
- ✅ Reliability - Redundancy and backups
- ✅ Security - Multiple protection layers
- ✅ Monitoring - Full visibility into operations
- ✅ Maintenance - Simple deployment process
