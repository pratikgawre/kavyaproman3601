# Railway Production Deployment Guide

This guide will help you deploy your KavyaProMan300 application (Frontend, Backend, and MySQL) to Railway.

## Prerequisites

1. **Railway Account** - Sign up at [railway.app](https://railway.app)
2. **GitHub Repository** - Your code must be pushed to GitHub
3. **Docker** - Installed locally (for testing)
4. **Node.js & npm** - For frontend builds
5. **Java & Maven** - For backend builds

## Overview

You'll deploy:
- **MySQL Database** - Railway PostgreSQL or MySQL plugin
- **Backend API** - Spring Boot application (Java 17)
- **Frontend** - React + Vite application

---

## Step 1: Prepare Your Repository

Make sure your code is committed and pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

---

## Step 2: Set Up Railway Project

### 2.1 Create New Project on Railway

1. Visit [railway.app](https://railway.app) and sign in
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your GitHub repository: `New_kavya_360`
4. Connect and authorize Railway to access your GitHub

### 2.2 Add Services

Your Railway project will need 3 services:

1. **MySQL Database**
2. **Backend API**
3. **Frontend**

---

## Step 3: Deploy MySQL Database

### 3.1 Add MySQL Service

1. In your Railway project, click **"+ Add Service"** → **"Add from Marketplace"**
2. Search for **"MySQL"** and click to add it
3. Railway will automatically provision a MySQL instance

### 3.2 Configure MySQL

Once MySQL is added:
- Note the connection details (visible in the service details)
- Railway provides: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- These will be available as environment variables

### 3.3 Initialize Database Schema

Connect to the Railway MySQL instance and run your SQL scripts:

```bash
# Using mysql client
mysql -h <MYSQL_HOST> -u <MYSQL_USER> -p<MYSQL_PASSWORD> -D <MYSQL_DATABASE> < backend/sql/add_difficulty_column.sql
mysql -h <MYSQL_HOST> -u <MYSQL_USER> -p<MYSQL_PASSWORD> -D <MYSQL_DATABASE> < backend/sql/add_user_profile_columns.sql
```

---

## Step 4: Deploy Backend API

### 4.1 Add Backend Service

1. In Railway project, click **"+ Add Service"** → **"Deploy from GitHub repo"**
2. Select the same repository (`New_kavya_360`)
3. Click **"Configure Deployment"**

### 4.2 Configure Build Settings

#### 4.2.1 Update Backend Dockerfile

Ensure `backend/Dockerfile` exists (already present). Railway will auto-detect it.

#### 4.2.2 Set Root Directory

In Railway service settings:
- Set **Root Directory** to: `backend/`

### 4.3 Set Environment Variables

Click on the Backend service and go to **"Variables"**. Add:

```env
# Database Configuration
SPRING_DATASOURCE_URL=jdbc:mysql://${{ MySQL.MYSQL_HOST }}:${{ MySQL.MYSQL_PORT }}/${{ MySQL.MYSQL_DATABASE }}
SPRING_DATASOURCE_USERNAME=${{ MySQL.MYSQL_USER }}
SPRING_DATASOURCE_PASSWORD=${{ MySQL.MYSQL_PASSWORD }}

# Server Configuration
PORT=8080
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_JPA_SHOW_SQL=false

# Email/SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=kavyalearn.info@gmail.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=kavyalearn.info@gmail.com
EMAIL_PASS=your_app_password

# CORS Configuration
SPRING_PROFILES_ACTIVE=prod
```

**Note:** Railway uses `${{ service.variable }}` syntax for referencing other services.

### 4.4 Link MySQL Service

In the Backend service **Variables** tab:
- Railway should auto-link MySQL service variables
- Verify variables are properly interpolated with correct MySQL connection details

### 4.5 Deploy Backend

1. Click **"Deploy"** button
2. Railway will:
   - Clone your repository
   - Navigate to `backend/` directory
   - Build the Docker image using `Dockerfile`
   - Deploy the container

---

## Step 5: Deploy Frontend

### 5.1 Create Dockerfile for Frontend

Create `frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

### 5.2 Create nginx.conf for Frontend (Alternative)

Alternatively, use nginx for better production serving:

Create `frontend/nginx.conf`:

```nginx
server {
    listen 3000;
    
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy to backend
    location /api/ {
        proxy_pass http://${{ Backend.RAILWAY_PUBLIC_DOMAIN }}/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then use nginx Dockerfile:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
```

### 5.3 Add Frontend Service to Railway

1. Click **"+ Add Service"** → **"Deploy from GitHub repo"**
2. Select repository again
3. Set **Root Directory** to: `frontend/`

### 5.4 Set Frontend Environment Variables

Go to **Variables** and add:

```env
# Backend API URL
VITE_API_BASE_URL=https://${{ Backend.RAILWAY_DOMAIN }}/api
VITE_API_URL=https://${{ Backend.RAILWAY_DOMAIN }}
```

### 5.5 Configure Frontend Environment File

Update `frontend/.env.production`:

```env
VITE_API_BASE_URL=https://your-backend-domain.railway.app/api
VITE_API_URL=https://your-backend-domain.railway.app
```

### 5.6 Update Frontend API Calls

Ensure your frontend uses environment variables. Example in `frontend/src/services/api.js`:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export default axiosInstance;
```

### 5.7 Deploy Frontend

1. Click **"Deploy"** button
2. Railway will build and deploy your frontend

---

## Step 6: Update CORS Configuration

Update your Backend `application.properties` to allow frontend domain:

```properties
# CORS Configuration
spring.mvc.cors.allowed-origins=https://your-frontend-domain.railway.app,https://your-domain.com
spring.mvc.cors.allowed-methods=GET,POST,PUT,DELETE,OPTIONS
spring.mvc.cors.allowed-headers=*
spring.mvc.cors.allow-credentials=true
spring.mvc.cors.max-age=3600
```

Or add a CORS configuration class:

Create `backend/src/main/java/com/team1/backend/config/CorsConfig.java`:

```java
package com.team1.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins(
                "https://your-frontend-domain.railway.app",
                "https://your-domain.com",
                "http://localhost:3000"
            )
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600);
    }
}
```

---

## Step 7: Configure Custom Domains (Optional)

### 7.1 Backend Domain

1. Go to Backend service → **"Settings"**
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., `api.yourdomain.com`)
4. Add DNS records as indicated by Railway

### 7.2 Frontend Domain

1. Go to Frontend service → **"Settings"**
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., `www.yourdomain.com` or `yourdomain.com`)

---

## Step 8: Monitoring & Logs

### 8.1 View Logs

1. Click on any service
2. Go to **"Logs"** tab to see real-time logs
3. Use **"Deployments"** tab to see deployment history

### 8.2 Environment Health

1. Check **"Metrics"** for CPU, Memory, and Network usage
2. Monitor database connections in MySQL service

---

## Troubleshooting

### Backend Connection to MySQL Fails

- Verify MySQL service is running
- Check environment variables are properly set
- Ensure database name is created
- Check logs for connection errors

### Frontend Can't Reach Backend

- Verify `VITE_API_BASE_URL` is correct
- Check CORS configuration in backend
- Test API endpoint directly in browser
- Check network tab in browser DevTools

### Build Fails

- Check logs for specific errors
- Verify `Dockerfile` exists in root directory of service
- Ensure all dependencies are available
- Check file permissions

### Database Schema Missing

- Run SQL scripts after MySQL deployment
- Use Railway's MySQL terminal or external client to initialize

---

## Useful Railway CLI Commands

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# List projects
railway list

# Link to project
railway link <project-id>

# View logs
railway logs

# Check variables
railway variables

# Deploy current service
railway up
```

---

## Post-Deployment Checklist

- [ ] MySQL database is accessible
- [ ] Backend API is responding to requests
- [ ] Frontend loads successfully
- [ ] Frontend can make API calls to backend
- [ ] All environment variables are set correctly
- [ ] CORS is properly configured
- [ ] Logs show no errors
- [ ] Database schema is initialized
- [ ] Email service (SendGrid) is working
- [ ] Custom domains are configured (if applicable)

---

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway MySQL](https://docs.railway.app/databases/mysql)
- [Deploying Spring Boot on Railway](https://docs.railway.app/guides/springboot)
- [Deploying Node.js/React on Railway](https://docs.railway.app/guides/nodejs)

---

## Support

For issues, check:
1. Railway service logs
2. Application logs
3. Environment variables configuration
4. Network connectivity between services
