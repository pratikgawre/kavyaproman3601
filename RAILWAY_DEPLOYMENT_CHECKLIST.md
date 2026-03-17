# Railway Deployment Quick Start Checklist

## Phase 1: Pre-Deployment (Local Setup)

- [ ] Clone/pull latest code from GitHub
- [ ] Test backend locally: `cd backend && mvn spring-boot:run`
- [ ] Test frontend locally: `cd frontend && npm install && npm run dev`
- [ ] Verify local API connectivity (frontend can call backend)
- [ ] Ensure all code is committed and pushed to GitHub

## Phase 2: Railway Project Setup

- [ ] Sign up/log in to [railway.app](https://railway.app)
- [ ] Create new Railway project
- [ ] Connect GitHub repository (New_kavya_360)
- [ ] Authorize Railway to access GitHub

## Phase 3: MySQL Database Setup

- [ ] Add MySQL service from marketplace
- [ ] Wait for MySQL to be provisioned
- [ ] Note MySQL credentials from service details:
  - [ ] MYSQL_HOST
  - [ ] MYSQL_PORT
  - [ ] MYSQL_USER
  - [ ] MYSQL_PASSWORD
  - [ ] MYSQL_DATABASE

## Phase 4: Backend Deployment

### 4.1 Add Backend Service
- [ ] Click "+ Add Service" → "Deploy from GitHub"
- [ ] Select repository and connect
- [ ] Set root directory to: `backend/`

### 4.2 Configure Backend Environment
- [ ] Go to Backend service → Variables
- [ ] Add all variables from `RAILWAY_ENV_VARIABLES.md` (Backend section)
- [ ] Use Railway's linking syntax: `${{ MySQL.MYSQL_HOST }}` etc.
- [ ] Save variables

### 4.3 Deploy Backend
- [ ] Click "Deploy" button
- [ ] Wait for build to complete (5-10 minutes)
- [ ] Check logs for errors
- [ ] Note the Backend domain: `https://your-backend-xxx.railway.app`

### 4.4 Initialize Database Schema
- [ ] Wait for backend to be running
- [ ] Connect to MySQL via Railway's MySQL service or terminal
- [ ] Run SQL scripts:
  ```bash
  mysql -h <MYSQL_HOST> -u <MYSQL_USER> -p<MYSQL_PASSWORD> -D <MYSQL_DATABASE> < add_difficulty_column.sql
  mysql -h <MYSQL_HOST> -u <MYSQL_USER> -p<MYSQL_PASSWORD> -D <MYSQL_DATABASE> < add_user_profile_columns.sql
  ```
- [ ] Verify database schema created

### 4.5 Test Backend
- [ ] Open browser: `https://your-backend-xxx.railway.app/api/health` (if endpoint exists)
- [ ] Test API endpoints manually
- [ ] Check backend logs for any errors

## Phase 5: Frontend Deployment

### 5.1 Add Frontend Service
- [ ] Click "+ Add Service" → "Deploy from GitHub"
- [ ] Select repository
- [ ] Set root directory to: `frontend/`

### 5.2 Configure Frontend Environment
- [ ] Go to Frontend service → Variables
- [ ] Add variables from `RAILWAY_ENV_VARIABLES.md` (Frontend section)
- [ ] Set `VITE_API_BASE_URL` to backend domain
- [ ] Set `VITE_API_URL` to backend domain
- [ ] Example:
  ```
  VITE_API_BASE_URL=https://your-backend-xxx.railway.app/api
  VITE_API_URL=https://your-backend-xxx.railway.app
  ```
- [ ] Save variables

### 5.3 Deploy Frontend
- [ ] Click "Deploy" button
- [ ] Wait for build to complete (5-10 minutes)
- [ ] Check logs for errors
- [ ] Note the Frontend domain: `https://your-frontend-xxx.railway.app`

### 5.4 Test Frontend
- [ ] Open browser: `https://your-frontend-xxx.railway.app`
- [ ] Verify page loads
- [ ] Check browser console for errors
- [ ] Test API calls from frontend

## Phase 6: Integration Testing

- [ ] Frontend loads without errors ✓
- [ ] Frontend CSS/assets load correctly ✓
- [ ] Can navigate between pages ✓
- [ ] Backend API responds correctly ✓
- [ ] Frontend can fetch data from backend ✓
- [ ] User authentication works ✓
- [ ] Database operations work ✓
- [ ] Email notifications send (if applicable) ✓

## Phase 7: Production Configuration

- [ ] Update CORS allowed origins in backend (add frontend domain)
- [ ] Set up custom domains (if applicable)
- [ ] Enable HTTPS (auto-enabled by Railway)
- [ ] Configure backup for MySQL database
- [ ] Set up monitoring and alerts
- [ ] Document all URLs and credentials

## Phase 8: Post-Deployment

- [ ] Monitor application logs
- [ ] Check performance metrics (CPU, Memory, Network)
- [ ] Verify daily backups are running
- [ ] Test error scenarios
- [ ] Document any issues found
- [ ] Plan regular maintenance schedule

---

## Important Commands & Resources

### Railway CLI Commands
```bash
# Install
npm i -g @railway/cli

# Login
railway login

# List projects
railway list

# Link to project
railway link <project-id>

# View logs
railway logs

# View variables
railway variables

# Deploy
railway up
```

### Quick Troubleshooting

**Backend won't start:**
- Check logs for database connection errors
- Verify environment variables are set correctly
- Check MySQL service is running

**Frontend can't reach backend:**
- Verify VITE_API_BASE_URL is correct
- Check CORS configuration in backend
- Verify backend service is running

**Build fails:**
- Check Dockerfile syntax
- Verify build dependencies are installed
- Check file permissions

---

## Important URLs to Track

| Service | Domain | Notes |
|---------|--------|-------|
| Backend | https://your-backend-xxx.railway.app | Note this for frontend config |
| Frontend | https://your-frontend-xxx.railway.app | Share with users |
| MySQL | Internal connection only | Available via MYSQL_HOST |
| GitHub Repo | https://github.com/Jayashri-05998/New_kavya_360 | For redeploy |

---

## Emergency Contacts & Support

- **Railway Support:** https://docs.railway.app
- **GitHub Issues:** https://github.com/Jayashri-05998/New_kavya_360/issues
- **Application Logs:** Check Railway service logs
- **Database Access:** Use Railway MySQL terminal or external client

---

## Success Criteria

- ✅ Application is live and accessible
- ✅ All three services (Frontend, Backend, MySQL) are running
- ✅ Frontend and Backend can communicate
- ✅ Database queries work correctly
- ✅ No errors in application logs
- ✅ Performance is acceptable
- ✅ HTTPS is working
- ✅ Custom domain (if configured) is accessible
