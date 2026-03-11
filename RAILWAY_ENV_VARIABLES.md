# Railway Environment Variables Setup Guide

## For Backend Service (Spring Boot)

Copy these variables to your Railway Backend service environment variables:

### Database Configuration
```
SPRING_DATASOURCE_URL=jdbc:mysql://${{ MySQL.MYSQL_HOST }}:${{ MySQL.MYSQL_PORT }}/${{ MySQL.MYSQL_DATABASE }}
SPRING_DATASOURCE_USERNAME=${{ MySQL.MYSQL_USER }}
SPRING_DATASOURCE_PASSWORD=${{ MySQL.MYSQL_PASSWORD }}
```

### Server Configuration
```
PORT=8080
SPRING_PROFILES_ACTIVE=prod
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_JPA_SHOW_SQL=false
```

### Email/SendGrid Configuration
```
SENDGRID_API_KEY=<your_sendgrid_api_key>
SENDGRID_FROM_EMAIL=kavyalearn.info@gmail.com
CONTACT_RECEIVER_EMAIL=kavyalearn.info@gmail.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=kavyalearn.info@gmail.com
EMAIL_PASS=<your_app_password>
```

### Connection Pool
```
SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=10
SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=5
```

---

## For Frontend Service (React + Vite)

### API Configuration
```
VITE_API_BASE_URL=https://${{ Backend.RAILWAY_DOMAIN }}/api
VITE_API_URL=https://${{ Backend.RAILWAY_DOMAIN }}
```

### Build Configuration
```
NODE_ENV=production
```

---

## For MySQL Service

### Standard Variables (Auto-configured by Railway)
- `MYSQL_HOST` - MySQL server hostname
- `MYSQL_PORT` - MySQL port (typically 3306)
- `MYSQL_USER` - Database user
- `MYSQL_PASSWORD` - Database password
- `MYSQL_DATABASE` - Database name

---

## How to Set Variables in Railway UI

1. Go to your Railway project
2. Click on the service (Backend, Frontend, or MySQL)
3. Navigate to **"Variables"** tab
4. Click **"+ New Variable"**
5. Enter the variable name and value
6. Click **"Deploy"** when done

---

## Linking Services in Railway

Railway automatically creates variables from linked services:

1. Go to Backend service
2. Click **"Add Plugin/Service"** or look for linking options
3. Link to MySQL service
4. Railway will create `${{ MySQL.* }}` variables automatically

---

## Important Notes

⚠️ **Before Deploying:**
- Replace placeholder URLs with your actual Railway domains
- Get SendGrid API key from https://sendgrid.com
- Generate Gmail app password for email configuration
- Update CORS allowed origins in backend

⚠️ **After First Deployment:**
- Initialize database schema:
  ```bash
  mysql -h <host> -u <user> -p < backend/sql/add_difficulty_column.sql
  ```
- Test API endpoints
- Verify frontend can connect to backend
- Check application logs for errors

---

## Example Complete Backend Variables

```
# Database
SPRING_DATASOURCE_URL=jdbc:mysql://mysql.railway.internal:3306/railway
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=secretPassword123

# Server
PORT=8080
SPRING_PROFILES_ACTIVE=prod
SPRING_JPA_HIBERNATE_DDL_AUTO=update

# Email
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=kavyalearn.info@gmail.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=kavyalearn.info@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
```

---

## Example Complete Frontend Variables

```
VITE_API_BASE_URL=https://myproject-production.railway.app/api
VITE_API_URL=https://myproject-production.railway.app
NODE_ENV=production
```
