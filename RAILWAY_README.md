# KavyaProMan300 - Railway Production Deployment

This directory contains everything you need to deploy **KavyaProMan300** to Railway for production.

## 📋 Documentation Files

1. **RAILWAY_DEPLOYMENT.md** - Complete step-by-step deployment guide
2. **RAILWAY_DEPLOYMENT_CHECKLIST.md** - Interactive checklist for deployment phases
3. **RAILWAY_ENV_VARIABLES.md** - Environment variables reference
4. **RAILWAY_TROUBLESHOOTING.md** - Solutions to common issues
5. **railway.json** - Service configuration (reference)

## 🚀 Quick Start

### Prerequisites
- GitHub account with repository pushed
- Railway account (free at railway.app)
- MySQL database knowledge (basic)

### 3-Step Deployment

**Step 1: Create Railway Project**
```
1. Go to railway.app
2. New Project → Deploy from GitHub
3. Connect your repository
```

**Step 2: Add Services**
```
1. Add MySQL from marketplace
2. Add Backend service (set root directory: backend/)
3. Add Frontend service (set root directory: frontend/)
```

**Step 3: Configure & Deploy**
```
1. Set environment variables for each service
2. Link MySQL to Backend
3. Set Frontend API URL
4. Deploy and monitor logs
```

**Full guide:** See `RAILWAY_DEPLOYMENT.md`

## 📦 Project Structure

```
backend/
├── src/main/java/com/team1/backend/
│   ├── config/CorsConfig.java          # CORS configuration for production
│   ├── ...
├── src/main/resources/
│   ├── application.properties           # Default configuration
│   ├── application-prod.properties      # Production overrides
├── sql/                                  # Database initialization scripts
├── Dockerfile                            # Backend containerization
└── pom.xml                              # Java dependencies

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── App.jsx
├── .env.production                       # Production environment variables
├── .env.development                      # Development environment variables
├── Dockerfile                            # Frontend containerization
└── package.json                          # Node.js dependencies
```

## 🔧 Services Overview

### MySQL Database
- **Service:** MySQL 8.0+ (Railway Marketplace)
- **Connection:** Internal to Railway network
- **Auto-configured by Railway:**
  - `MYSQL_HOST`
  - `MYSQL_PORT`
  - `MYSQL_USER`
  - `MYSQL_PASSWORD`
  - `MYSQL_DATABASE`

### Backend API
- **Technology:** Spring Boot 4.0.3 with Java 17
- **Port:** 8080
- **Dockerfile:** `backend/Dockerfile` (multi-stage build)
- **Environment:** Reads from `SPRING_DATASOURCE_*` variables
- **Features:**
  - Auto DDL creation via Hibernate
  - Email notifications via SendGrid
  - CORS configured for production
  - Connection pooling with HikariCP

### Frontend
- **Technology:** React 19 with Vite 7
- **Port:** 3000
- **Dockerfile:** `frontend/Dockerfile` (Node + serve)
- **Environment:** Reads from `VITE_*` variables
- **Features:**
  - Production build optimization
  - API client configuration
  - Health check endpoint

## 🌐 Domain Configuration

### Frontend Domain
- Railway provides: `your-app-frontend-xxxx.railway.app`
- Custom domain: Add via Railway dashboard → Custom Domain

### Backend Domain
- Railway provides: `your-app-backend-xxxx.railway.app`
- Used by frontend in `VITE_API_BASE_URL`

### Database
- Internal hostname: Uses Railway internal network
- Not directly accessible from internet (by design)

## 📝 Environment Variables

### Backend (Spring Boot)
```env
# Database
SPRING_DATASOURCE_URL=jdbc:mysql://mysql.railway.internal:3306/railway
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=xxxxx

# Server
PORT=8080
SPRING_PROFILES_ACTIVE=prod

# Email
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
EMAIL_USER=your-email@gmail.com
```

### Frontend (React/Vite)
```env
VITE_API_BASE_URL=https://backend-domain.railway.app/api
VITE_API_URL=https://backend-domain.railway.app
NODE_ENV=production
```

**Complete reference:** See `RAILWAY_ENV_VARIABLES.md`

## 🔄 Database Initialization

After MySQL is created:

```bash
# Connect to Railway MySQL
mysql -h <MYSQL_HOST> -u <MYSQL_USER> -p

# Create database and tables
CREATE DATABASE IF NOT EXISTS kavyaprodb;
USE kavyaprodb;

# Run initialization scripts
SOURCE backend/sql/add_difficulty_column.sql;
SOURCE backend/sql/add_user_profile_columns.sql;

# Verify tables
SHOW TABLES;
```

Or use Railway's web terminal for MySQL management.

## ✅ Post-Deployment Verification

1. **Backend Health Check**
   ```bash
   curl https://backend-xxxx.railway.app/api/health
   ```

2. **Frontend Access**
   - Open browser: `https://frontend-xxxx.railway.app`
   - Should display login page

3. **API Connectivity**
   - Frontend should make API calls to backend
   - Check browser console for network errors

4. **Database Operations**
   - Try logging in
   - Data should be saved to MySQL

5. **Email Service**
   - Test email notifications
   - SendGrid API key must be valid

## 📊 Monitoring

**Railway Dashboard:**
- Service Status → Check all green ✓
- Logs → Review for errors
- Metrics → Monitor CPU, Memory, Network
- Deployments → View deployment history

**Commands:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# View real-time logs
railway logs -f

# Check service status
railway status

# View environment variables
railway variables
```

## 🐛 Troubleshooting

**Backend won't connect to MySQL:**
- Check `SPRING_DATASOURCE_URL` syntax
- Verify MySQL service is running
- Review backend logs for connection errors

**Frontend can't reach backend:**
- Verify `VITE_API_BASE_URL` is set correctly
- Check backend domain is accessible
- Review CORS configuration in backend

**Build fails:**
- Test locally first: `mvn package` (backend) or `npm run build` (frontend)
- Check Dockerfile syntax
- Verify root directory setting in Railway

**See `RAILWAY_TROUBLESHOOTING.md` for detailed solutions**

## 🔐 Security Checklist

- [ ] Environment variables don't contain secrets in code
- [ ] SendGrid API key is from environment variable only
- [ ] Email password is from environment variable
- [ ] Database password is strong
- [ ] CORS allows only necessary origins
- [ ] HTTPS is enabled (auto by Railway)
- [ ] No debug logging in production
- [ ] Database backups are enabled

## 📞 Support Resources

- **Railway Docs:** https://docs.railway.app
- **Spring Boot Guide:** https://docs.railway.app/guides/springboot
- **Node.js/React Guide:** https://docs.railway.app/guides/nodejs
- **Status Page:** https://status.railway.app
- **GitHub Issues:** https://github.com/Jayashri-05998/New_kavya_360/issues

## 🚢 Deployment Workflow

```
Local Development
    ↓
Push to GitHub (main branch)
    ↓
Railway auto-detects changes
    ↓
Builds Docker images
    ↓
Deploys to containers
    ↓
Services start and communicate
    ↓
Monitor via Railway dashboard
```

## 💡 Tips & Best Practices

1. **Always test locally first**
   ```bash
   cd backend && mvn spring-boot:run &
   cd frontend && npm run dev
   ```

2. **Use environment variables**
   - Never hardcode database URLs or API keys
   - Use `.env` files locally, Railway variables in production

3. **Monitor regularly**
   - Check logs daily
   - Watch for performance degradation
   - Review error patterns

4. **Automate backups**
   - Enable MySQL backups in Railway
   - Test restore procedures monthly

5. **Version control everything**
   - Keep all code committed to GitHub
   - Include Dockerfile and configuration files
   - Use meaningful commit messages

## 📈 Performance Optimization

### Backend
```properties
# Connection pooling
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=5

# Caching
spring.cache.type=simple
```

### Frontend
```javascript
// Lazy load components
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

## 🎯 Next Steps

1. Read `RAILWAY_DEPLOYMENT.md` completely
2. Follow `RAILWAY_DEPLOYMENT_CHECKLIST.md` step-by-step
3. Reference `RAILWAY_ENV_VARIABLES.md` when configuring
4. Use `RAILWAY_TROUBLESHOOTING.md` if issues arise

## 📄 Related Files

- `backend/Dockerfile` - Backend containerization
- `frontend/Dockerfile` - Frontend containerization
- `backend/src/main/resources/application-prod.properties` - Production configs
- `frontend/.env.production` - Frontend production environment
- `backend/src/main/java/com/team1/backend/config/CorsConfig.java` - CORS setup

---

**Last Updated:** March 2026
**Project:** KavyaProMan300
**Deployment Target:** Railway
**Status:** ✅ Ready for Production Deployment
