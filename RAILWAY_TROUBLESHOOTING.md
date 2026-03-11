# Railway Deployment Troubleshooting Guide

## Common Issues and Solutions

---

## 1. Backend Won't Connect to MySQL

### Symptoms
- Backend logs show: `Connection refused` or `Access denied`
- Application crashes on startup
- Health check fails

### Solutions

**Check MySQL Service is Running:**
```bash
# In Railway console, verify MySQL service status
railway logs  # Check MySQL logs
```

**Verify Environment Variables:**
- Go to Backend service → Variables
- Confirm these are set correctly:
  - `SPRING_DATASOURCE_URL`
  - `SPRING_DATASOURCE_USERNAME`
  - `SPRING_DATASOURCE_PASSWORD`

**Test MySQL Connection Manually:**
```bash
mysql -h <MYSQL_HOST> -u <MYSQL_USER> -p<MYSQL_PASSWORD> -D <MYSQL_DATABASE>
```

**Common Variable Issues:**
- Missing `${{ }}` syntax for linked services
- Typo in service names (MySQL vs mysql)
- Variables not linked to MySQL service

---

## 2. Frontend Can't Reach Backend API

### Symptoms
- Network errors in browser console
- API calls return 404 or CORS errors
- Frontend loads but can't fetch data

### Solutions

**Check VITE_API_BASE_URL:**
1. Open browser DevTools → Application/Storage
2. Check if environment variables were injected
3. Verify it matches backend domain exactly

**Example in browser console:**
```javascript
// Should show your backend URL
console.log(import.meta.env.VITE_API_BASE_URL)
```

**Fix Frontend Dockerfile Build:**
- Ensure build uses correct environment variables
- Rebuild and redeploy frontend

**Check CORS Configuration:**

Backend `CorsConfig.java` should allow frontend domain:
```java
.allowedOrigins(
    "https://your-frontend-xxx.railway.app",
    "http://localhost:3000"  // for local testing
)
```

**Test API Directly:**
```bash
# From your terminal
curl -X GET https://your-backend-xxx.railway.app/api/health

# Should return 200 OK
```

**Update Application.properties:**
Ensure this line doesn't block CORS:
```properties
server.servlet.context-path=/
```

---

## 3. Database Schema Not Initialized

### Symptoms
- Tables don't exist
- Errors: `Table 'kavyaprodb.users' doesn't exist`
- Application runs but can't save data

### Solutions

**Run SQL Scripts Manually:**
```bash
# Connect to MySQL
mysql -h <MYSQL_HOST> -u <MYSQL_USER> -p

# Use the database
USE kavyaprodb;

# Run SQL files
SOURCE backend/sql/add_difficulty_column.sql;
SOURCE backend/sql/add_user_profile_columns.sql;

# Verify tables created
SHOW TABLES;
```

**Alternative: Use Hibernate DDL**

Ensure in `application-prod.properties`:
```properties
spring.jpa.hibernate.ddl-auto=update
```

This will auto-create tables from JPA entities (but won't run custom SQL scripts).

**Verify Database Name:**
- Check MySQL service → Variables
- Confirm `MYSQL_DATABASE` matches your application database name

---

## 4. Build Fails During Deployment

### Symptoms
- Deployment fails with build error
- Logs show compilation errors
- Service stays in "Building" state

### Solutions

**Check Backend Build:**
```bash
# Test locally
cd backend
mvn clean package
```

**Check Frontend Build:**
```bash
# Test locally
cd frontend
npm install
npm run build
```

**Common Issues:**

**Backend:**
- Missing dependencies in pom.xml
- Java compilation errors
- Missing files or resources

**Frontend:**
- Missing npm packages
- Node version mismatch
- Build script errors

**Fix & Redeploy:**
1. Fix the issue locally
2. Push to GitHub
3. Railway should auto-redeploy

**Check Root Directory Setting:**
- Backend service → Root Directory should be: `backend/`
- Frontend service → Root Directory should be: `frontend/`

---

## 5. Application Runs But No Logs

### Symptoms
- Service is "Running" but no logs visible
- Can't debug issues
- Application seems stuck

### Solutions

**Check Logging Configuration:**

In `application-prod.properties`:
```properties
logging.level.root=INFO
logging.level.com.team1.backend=INFO
logging.pattern.console=%d{yyyy-MM-dd HH:mm:ss} - %msg%n
```

**Enable More Verbose Logging (temporary):**
```properties
logging.level.org.springframework=DEBUG
logging.level.org.hibernate=DEBUG
```

**View Real-time Logs:**
```bash
# Using Railway CLI
railway logs -f  # Follow logs

# Or in Railway UI: Service → Logs tab
```

**Check Service Status:**
- Is service actually running? (green status)
- Does it have any errors? (red status)
- Check "Metrics" for CPU/Memory usage

---

## 6. Port Already in Use

### Symptoms
- Error: `Address already in use :8080`
- Backend won't start
- Multiple services conflict

### Solutions

**Verify PORT Variable:**
In Backend service → Variables:
```
PORT=8080
```

**Railway auto-assigns ports, usually no conflict, but ensure:**
```bash
# Check what's running
lsof -i :8080  # On local machine
```

**For multi-instance setups:**
- Each service gets unique port automatically
- Don't manually set conflicting ports

---

## 7. Memory or CPU Issues

### Symptoms
- Application crashes frequently
- Service restarts repeatedly
- Slow performance

### Solutions

**Check Resource Usage:**
- Go to service → Metrics
- Look at CPU and Memory usage graphs

**Increase Memory (if on paid plan):**
1. Service settings
2. Adjust RAM allocation
3. Redeploy

**Optimize Application:**
- Add connection pooling in `application-prod.properties`
- Reduce logging verbosity
- Check for memory leaks in code

**Example optimization:**
```properties
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.connection-timeout=30000
```

---

## 8. Email Service Not Working

### Symptoms
- SendGrid API not found
- Gmail authentication fails
- Emails not sending

### Solutions

**Verify SendGrid Configuration:**
```properties
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx  # Must start with SG.
SENDGRID_FROM_EMAIL=kavyalearn.info@gmail.com
```

**Get SendGrid API Key:**
1. Sign up at https://sendgrid.com
2. Go to Settings → API Keys
3. Create new API key
4. Copy and paste into Railway variables

**Gmail App Password:**
1. Enable 2-factor authentication on Gmail
2. Generate app password at https://myaccount.google.com/apppasswords
3. Copy 16-character password
4. Use as `EMAIL_PASS` variable

**Test Email Service:**
```bash
# Check logs for email sending attempts
railway logs | grep -i mail
```

---

## 9. Deployment Stuck or Takes Too Long

### Symptoms
- Deployment in progress for 30+ minutes
- No error messages
- Unknown status

### Solutions

**Common Causes:**
- Large build (try splitting code)
- Slow GitHub clone
- Network issues

**Wait for Completion:**
- Builds can take 10-15 minutes
- Be patient before canceling

**If Really Stuck:**
1. Cancel deployment (service settings)
2. Check build logs for errors
3. Fix and retry

**Speed Up Builds:**
- Use Docker layer caching
- Remove unnecessary dependencies
- Optimize Docker build stages

---

## 10. Custom Domain Not Working

### Symptoms
- Domain shows error
- DNS not resolving
- SSL certificate issues

### Solutions

**Verify Domain Configuration:**
1. Service → Settings → Custom Domain
2. Note the CNAME record Railway provides
3. Add to your domain's DNS settings

**Check DNS Propagation:**
```bash
# Check if DNS is configured
nslookup yourdomain.com
dig yourdomain.com
```

**Allow Time for Propagation:**
- DNS changes take 15 minutes to 48 hours
- Check again later if not working immediately

**SSL Certificate Issues:**
- Railway auto-provisions HTTPS certificates
- Wait 5-10 minutes after adding domain
- Certificate should auto-issue

---

## 11. Railway CLI Issues

### Symptoms
- Commands not recognized
- Authentication fails
- Can't link projects

### Solutions

**Install/Update Railway CLI:**
```bash
npm install -g @railway/cli@latest

# Or using Homebrew (Mac)
brew install railway
```

**Login Issues:**
```bash
# Clear old credentials
railway logout

# Login again
railway login
```

**Project Linking:**
```bash
# List projects
railway list

# Link correct project
railway link <project-id>

# Verify linked
railway whoami
```

---

## 12. Emergency Actions

### Rollback to Previous Version
1. Go to Deployment History
2. Select previous successful deployment
3. Click "Redeploy"

### Stop Service Temporarily
1. Service settings
2. Click "Pause" (to save costs)
3. Resume when ready

### Restart Service
1. Service settings
2. Click "Restart"
3. Wait for restart to complete

### Delete and Recreate
```bash
# Last resort - recreate service
railway remove <service-name>
railway add  # Re-add service
```

---

## Quick Reference Commands

```bash
# View real-time logs
railway logs -f

# Check service status
railway status

# View environment variables
railway variables

# Check current project
railway whoami

# List all projects
railway list

# Link to specific project
railway link <project-id>

# Deploy current service
railway up

# Check available services
railway services
```

---

## When to Contact Support

- Railway is down (check https://status.railway.app)
- Strange infrastructure errors
- Network connectivity issues between services
- Billing or account issues

**Contact:** https://railway.app/support

---

## Monitoring Checklist

Daily:
- [ ] Application is responding
- [ ] No errors in logs
- [ ] Database backups completed
- [ ] Performance is acceptable

Weekly:
- [ ] Review logs for patterns
- [ ] Check resource usage trends
- [ ] Verify backups are working
- [ ] Test critical workflows

Monthly:
- [ ] Review costs
- [ ] Optimize resource allocation
- [ ] Update dependencies if needed
- [ ] Review security settings

---

## Debug Mode

**Enable Debug Logging:**
```properties
logging.level.root=DEBUG
logging.level.org.springframework.web=DEBUG
```

**View Full Stack Traces:**
```properties
server.error.include-stacktrace=always
server.error.include-message=always
```

⚠️ Remember to disable DEBUG logging in production after troubleshooting.
