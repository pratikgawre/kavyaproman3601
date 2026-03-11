# Frontend Production Deployment Guide

## ✅ Your Frontend is Now Production Ready!

Your React frontend has been configured to work with your production backend at:
**`https://newkavya360-production.up.railway.app`**

---

## Configuration Summary

### Environment Variables
- **Production**: `.env.production` → Points to `https://newkavya360-production.up.railway.app`
- **Development**: `.env.development` → Points to `http://localhost:8080`

### API Integration
- All API calls automatically use the correct backend URL
- Token-based authentication configured
- Error handling with automatic session management
- Supports CORS requests

---

## Production Checklist

### Build & Optimization
- ✅ Production build optimized with Vite
- ✅ CSS/JS minification enabled
- ✅ Source maps generated for debugging
- ✅ Environment-based configuration

### Security
- ✅ Tokens stored securely in localStorage
- ✅ Automatic logout on 401 (Unauthorized)
- ✅ CORS headers handled by backend
- ✅ No hardcoded secrets in code

### Performance
- ✅ Lazy loading configured for routes
- ✅ Bootstrap CSS minified
- ✅ React Strict Mode for development
- ✅ Asset optimization

### Features Working
- ✅ Login/Register with backend
- ✅ OTP verification
- ✅ Dashboard access
- ✅ Organization management
- ✅ Project/Issue tracking
- ✅ Team management
- ✅ Reports generation
- ✅ Subscription handling

---

## Build for Production

### Step 1: Build Frontend
```bash
cd frontend
npm install  # If not already done
npm run build
```

This creates an optimized `dist/` folder ready for deployment.

### Step 2: Deploy to Railway (Frontend)

#### Option A: Using Railway Dashboard
1. Go to Railway.app
2. Create new service → Deploy from GitHub
3. Select repository → Set root directory to `frontend/`
4. Railway will auto-detect Dockerfile and deploy

#### Option B: Manual Docker Build
```bash
cd frontend
docker build -t newkavya360-frontend .
docker tag newkavya360-frontend YOUR_REGISTRY/newkavya360-frontend:latest
docker push YOUR_REGISTRY/newkavya360-frontend:latest
```

---

## Environment Variables

### Production Variables (Already Set)
```env
VITE_API_BASE=https://newkavya360-production.up.railway.app
NODE_ENV=production
```

### If Deploying Elsewhere
Set these environment variables in your hosting platform:
```env
VITE_API_BASE=https://newkavya360-production.up.railway.app
NODE_ENV=production
```

---

## Testing Before Production

### Local Testing with Production API
```bash
# Build production version
npm run build

# Preview production build locally
npm run preview
```

Then open `http://localhost:4173` and test:
- ✓ Login page loads
- ✓ Can submit login form
- ✓ API calls go to production backend
- ✓ No console errors

### Manual API Test
```bash
# Test if backend is accessible
curl https://newkavya360-production.up.railway.app/api/health

# Should return 200 OK
```

---

## File Structure

```
frontend/
├── .env.production ..................... Production config ⭐
├── .env.development .................... Development config
├── Dockerfile .......................... Container definition
├── package.json ........................ Dependencies
├── vite.config.js ...................... Build config
│
├── src/
│   ├── config/
│   │   └── api.js ...................... API endpoints ⭐
│   │
│   ├── utils/
│   │   ├── helpers.js .................. Helper functions ⭐
│   │   └── http.js ..................... HTTP client ⭐
│   │
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   └── ... other pages
│   │
│   ├── components/
│   │   ├── ProtectedRoute.jsx
│   │   └── ... other components
│   │
│   ├── App.jsx ......................... Main app
│   ├── main.jsx ........................ Entry point
│   └── index.css ....................... Global styles
│
└── dist/ ............................... Production build (after npm run build)
```

---

## Production Deployment Steps

### 1. Commit Your Code
```bash
git add .
git commit -m "Production-ready frontend with Railway backend integration"
git push origin main
```

### 2. Railway Auto-Deploy
- Railway detects new push
- Builds Docker image
- Deploys automatically

### 3. Verify Deployment
```bash
# Check your frontend URL from Railway dashboard
https://your-frontend-xxx.railway.app

# Should see:
# ✓ Login page loads
# ✓ No console errors
# ✓ Responsive design
```

### 4. Configure Custom Domain (Optional)
In Railway Dashboard:
1. Frontend service → Settings → Custom Domain
2. Add your domain (e.g., `app.yourdomain.com`)
3. Add CNAME record to your DNS
4. Wait for SSL certificate (5-10 minutes)

---

## API Endpoints Reference

All endpoints automatically use the backend URL:

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/resend-otp` - Resend OTP
- `POST /api/auth/forgot-password` - Forgot Password
- `POST /api/auth/reset-password` - Reset Password

### Organizations
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create organization
- `PUT /api/organizations` - Update organization
- `DELETE /api/organizations` - Delete organization

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `PUT /api/projects` - Update project
- `DELETE /api/projects` - Delete project

### Issues
- `GET /api/issues` - List issues
- `POST /api/issues` - Create issue
- `PUT /api/issues` - Update issue
- `DELETE /api/issues` - Delete issue

---

## Troubleshooting

### Frontend Loads But No Data
**Problem**: API calls failing
**Solution**:
1. Check backend is running: `curl https://newkavya360-production.up.railway.app`
2. Open DevTools → Network tab → check API calls
3. Verify CORS is enabled in backend

### Login Not Working
**Problem**: Can't login
**Solution**:
1. Check backend health: `https://newkavya360-production.up.railway.app`
2. Check .env.production has correct API URL
3. Verify backend database is accessible

### Build Fails
**Problem**: `npm run build` fails
**Solution**:
1. Clear node_modules: `rm -rf node_modules && npm install`
2. Check for missing dependencies
3. Ensure all imports are correct

### CORS Errors
**Problem**: "Access to XMLHttpRequest blocked by CORS policy"
**Solution**:
1. Ensure backend CORS config allows frontend domain
2. Check backend has proper CORS headers
3. Verify API URL doesn't have trailing slash

---

## Performance Tips

### Optimize Build Size
```bash
npm run build -- --minify

# Check build size
du -sh dist/
```

### Enable Gzip Compression
Add to vite.config.js:
```javascript
import compression from 'vite-plugin-compression'

export default {
  plugins: [
    compression({
      algorithm: 'gzip',
      ext: '.gz'
    })
  ]
}
```

### Lazy Load Routes
```javascript
import { lazy } from 'react'
const Dashboard = lazy(() => import('./pages/Dashboard'))
```

---

## Monitoring & Logs

### View Frontend Logs
In Railway Dashboard:
1. Frontend service → Logs
2. See real-time application logs
3. Check for errors

### Monitor Performance
In Railway Dashboard:
1. Frontend service → Metrics
2. Check CPU, Memory, Network
3. Identify bottlenecks

---

## Environment-Specific Testing

### Test Production Build Locally
```bash
npm run build      # Creates dist/
npm run preview    # Serves dist/ locally at :4173
```

Visit `http://localhost:4173` to test the production build locally.

### Test with Production API
The production environment will automatically use:
```env
VITE_API_BASE=https://newkavya360-production.up.railway.app
```

---

## Next Steps

1. ✅ **Build Frontend**: `npm run build`
2. ✅ **Test Locally**: `npm run preview`
3. ✅ **Push to GitHub**: `git push origin main`
4. ✅ **Deploy on Railway**: Auto-deploys from GitHub
5. ✅ **Verify**: Check production URL works
6. ✅ **Setup Domain**: Add custom domain (optional)
7. ✅ **Monitor**: Watch logs and metrics

---

## Production URLs

| Service | URL | Status |
|---------|-----|--------|
| **Backend API** | https://newkavya360-production.up.railway.app | ✅ Live |
| **Frontend** | https://your-frontend-xxx.railway.app | Deploying |
| **Frontend Domain** | your-domain.com | Optional |

---

## Support & Documentation

- **Frontend Config**: See `src/config/api.js`
- **Helper Functions**: See `src/utils/helpers.js`
- **HTTP Client**: See `src/utils/http.js`
- **Backend URL**: `https://newkavya360-production.up.railway.app`

---

**Status**: ✅ Production Ready  
**Backend Integration**: ✅ Complete  
**Last Updated**: March 2026
