# Frontend Integration - Architecture & Flow Diagrams

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTERNET / USERS                             │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
            ┌─────────────────────────┐
            │  Frontend Application   │
            │  (React + Vite)         │
            │  Port: 3000 (dev)       │
            │  URL: Your Railway URL  │
            └────────────┬────────────┘
                         │
                         │ HTTPS Requests
                         │ (JSON API calls)
                         ▼
            ┌─────────────────────────┐
            │  Backend API            │
            │  (Spring Boot Java 17)  │
            │  Port: 8080             │
            │ https://newkavya360-    │
            │ production.up.railway.. │
            └────────────┬────────────┘
                         │
                         │ SQL Queries
                         ▼
            ┌─────────────────────────┐
            │  MySQL Database         │
            │  (Internal to Railway)  │
            │  Port: 3306             │
            └─────────────────────────┘
```

---

## 🔄 Data Flow

### Login Flow
```
User
  │
  ├─ Enters email & password
  │
  ▼
Frontend (React)
  │
  ├─ Validates input (helpers.js)
  │
  ├─ Makes POST request
  │   └─ https://newkavya360-production.up.railway.app/api/auth/login
  │
  ▼
Backend (Spring Boot)
  │
  ├─ Validates credentials
  │
  ├─ Queries MySQL database
  │
  ├─ Sends OTP via email
  │
  ▼
Frontend (React)
  │
  ├─ Stores user ID
  │
  ├─ Redirects to OTP verification page
  │
  ▼
User enters OTP
  │
  ├─ POST request with OTP
  │
  ▼
Backend validates OTP
  │
  ├─ Returns JWT/Session token
  │
  ▼
Frontend stores token
  │
  ├─ Redirects to dashboard
  │
  ▼
✅ Logged In
```

---

## 📁 Frontend File Organization

```
src/
│
├─ config/
│  └─ api.js .......................... API Endpoints Configuration
│     ├─ AUTH endpoints (login, register, verify-otp)
│     ├─ ORGANIZATION endpoints
│     ├─ PROJECT endpoints
│     ├─ ISSUE endpoints
│     ├─ TEAM endpoints
│     ├─ USER endpoints
│     ├─ REPORT endpoints
│     ├─ SUBSCRIPTION endpoints
│     └─ CONTACT endpoints
│
├─ utils/
│  ├─ helpers.js ....................... Helper Functions
│  │  ├─ getAuthToken()
│  │  ├─ getUser()
│  │  ├─ isAuthenticated()
│  │  ├─ handleApiError()
│  │  ├─ formatDate()
│  │  ├─ validateEmail()
│  │  └─ ... more helpers
│  │
│  └─ http.js .......................... HTTP Client
│     ├─ get()
│     ├─ post()
│     ├─ put()
│     ├─ delete()
│     └─ patch()
│
├─ pages/
│  ├─ Login.jsx ....................... Uses API to login
│  ├─ Dashboard.jsx ................... Fetches issues
│  ├─ Project.jsx ..................... Manages projects
│  ├─ Board.jsx ....................... Kanban board
│  ├─ Backlog.jsx ..................... Sprint backlog
│  ├─ Organization.jsx ................ Org settings
│  ├─ Teams.jsx ....................... Team management
│  ├─ Reports.jsx ..................... Analytics
│  ├─ Subscription.jsx ................ Billing
│  └─ ... more pages
│
├─ components/
│  ├─ ProtectedRoute.jsx .............. Auth guard
│  ├─ SidebarController.jsx ........... Navigation
│  └─ CustomDropdown.jsx .............. UI component
│
├─ App.jsx ............................ Main app routing
├─ main.jsx ........................... Entry point
└─ index.css .......................... Global styles
```

---

## 🔌 API Integration Points

### Each API Call Follows This Pattern

```
Frontend Component
    │
    ├─ import { post } from 'src/utils/http.js'
    │
    ├─ const response = await post(
    │   'https://newkavya360-production.up.railway.app/api/auth/login',
    │   { email, password }
    │ )
    │
    ├─ http.js adds token to headers
    │
    ├─ http.js handles errors
    │   ├─ 401 → Clear auth & redirect to login
    │   ├─ 404 → Show error message
    │   ├─ 500 → Show server error
    │   └─ Network error → Show connection error
    │
    ▼
Backend Processing
    │
    ├─ Validates request
    │
    ├─ Queries database
    │
    ▼
Response
    │
    ├─ JSON data returned
    │
    ▼
Frontend Component
    │
    ├─ Updates UI
    │
    ├─ Stores data in state
    │
    ▼
✅ User Sees Result
```

---

## 🚀 Deployment Architecture

```
┌──────────────────────────────────┐
│      Your Computer               │
│                                  │
│  npm run build                   │
│         │                        │
│         ▼                        │
│  dist/ (optimized code)          │
│         │                        │
│  git push origin main            │
└──────────────────────────────────┘
                │
                │ GitHub Webhook
                ▼
┌──────────────────────────────────┐
│      Railway Cloud               │
│                                  │
│  ├─ Receives push notification   │
│  │                               │
│  ├─ Clones repository            │
│  │                               │
│  ├─ Builds Docker image          │
│  │  ├─ npm install               │
│  │  ├─ npm run build             │
│  │  └─ Creates container         │
│  │                               │
│  ├─ Starts service               │
│  │                               │
│  └─ Allocates URL                │
│     https://your-url.railway.app │
└──────────────────────────────────┘
                │
                ▼
        ✅ Live & Running!
```

---

## 🔐 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                          │
└─────────────────────────────────────────────────────────────────┘

Step 1: User Enters Credentials
├─ Email & Password
└─ Click Login

Step 2: Frontend Validates
├─ Email format check (helpers.js)
├─ Password length check
└─ Submit to backend

Step 3: Backend Authentication
├─ Receives POST /api/auth/login
├─ Finds user in database
├─ Verifies password
├─ Generates OTP
└─ Sends email

Step 4: OTP Verification
├─ Frontend redirects to /verify-otp
├─ User enters OTP from email
├─ Frontend POSTs OTP to backend
├─ Backend verifies OTP
└─ Backend sends token

Step 5: Token Storage
├─ Frontend stores token in localStorage
├─ Frontend stores user info in localStorage
├─ Token added to all API requests
└─ Logged in! ✓

Step 6: Authenticated Requests
├─ Each API call includes token in header
├─ Backend verifies token
├─ If valid → Process request
├─ If invalid → Return 401
└─ Frontend auto-logout on 401

Step 7: Logout
├─ User clicks logout
├─ Frontend clears localStorage
├─ Frontend clears token
└─ Redirects to login page
```

---

## 🔗 Environment Variable Flow

```
┌──────────────────────────────────────────────────┐
│         Environment Variables                    │
└──────────────────────────────────────────────────┘

.env.production:
├─ VITE_API_BASE=https://newkavya360-production...
├─ NODE_ENV=production

.env.development:
├─ VITE_API_BASE=http://localhost:8080
├─ NODE_ENV=development

                    │
                    │
                    ▼
        ┌──────────────────────┐
        │  Vite Build Process  │
        └──────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
    PRODUCTION              DEVELOPMENT
    npm run build           npm run dev
        │                       │
        ▼                       ▼
    .env.production         .env.development
        │                       │
        ├─ API_BASE set to      ├─ API_BASE set to
        │  production URL       │  http://localhost:8080
        │                       │
        ▼                       ▼
    dist/ folder            Live dev server
        │                       │
        ▼                       ▼
    Railway deploy          Local testing
```

---

## 📊 Request/Response Cycle

```
Frontend Makes Request
    │
    ├─ Method: POST, GET, PUT, DELETE, PATCH
    ├─ URL: https://newkavya360-production.up.railway.app/api/{endpoint}
    ├─ Headers:
    │  ├─ Content-Type: application/json
    │  ├─ Authorization: Bearer {token}
    │  └─ (more standard headers)
    ├─ Body: { JSON data } (if POST/PUT/PATCH)
    │
    ▼
Backend Receives Request
    │
    ├─ Validates request
    ├─ Checks authorization token
    ├─ Validates input data
    ├─ Queries database
    ├─ Processes business logic
    │
    ▼
Backend Sends Response
    │
    ├─ Status Code:
    │  ├─ 200 OK
    │  ├─ 201 Created
    │  ├─ 400 Bad Request
    │  ├─ 401 Unauthorized
    │  ├─ 403 Forbidden
    │  ├─ 404 Not Found
    │  ├─ 500 Server Error
    │
    ├─ Headers:
    │  ├─ Content-Type: application/json
    │  ├─ CORS headers
    │
    ├─ Body: { JSON response data }
    │
    ▼
Frontend Receives Response
    │
    ├─ Checks status code
    ├─ Handles errors if needed
    ├─ Parses JSON
    ├─ Updates component state
    ├─ Re-renders UI
    │
    ▼
User Sees Result ✓
```

---

## 🎯 Component Interaction

```
┌─────────────────────────────────────────────────┐
│              React Components                    │
└─────────────────────────────────────────────────┘

App.jsx (Main)
    │
    ├─ Routing
    │  ├─ / → Login/Dashboard based on auth
    │  ├─ /login → Login.jsx
    │  ├─ /register → Register.jsx
    │  ├─ /dashboard → Dashboard.jsx
    │  ├─ /projects → Project.jsx
    │  ├─ /projects/:id/board → Board.jsx
    │  ├─ /projects/:id/backlog → Backlog.jsx
    │  ├─ /teams → Teams.jsx
    │  ├─ /reports → Reports.jsx
    │  ├─ /subscription → Subscription.jsx
    │  └─ /organization → OrganizationPage.jsx
    │
    ├─ ProtectedRoute Component
    │  ├─ Checks if user is authenticated
    │  ├─ Redirects to login if not
    │  └─ Allows access if logged in
    │
    └─ SidebarController Component
       ├─ Navigation menu
       ├─ User info
       └─ Logout button
```

---

## 📱 State Management Flow

```
┌──────────────────────────────────┐
│        localStorage              │
│  (Persistent Storage)            │
└──────────────────────────────────┘
    │
    ├─ token (JWT or Session ID)
    ├─ user { id, email, name }
    ├─ pendingUserId
    └─ theme (light/dark)
    
    │
    ▼
┌──────────────────────────────────┐
│     Component State (React)      │
│     (Temporary)                  │
└──────────────────────────────────┘
    │
    ├─ Form inputs
    ├─ API responses
    ├─ Loading states
    ├─ Error messages
    └─ UI state
    
    │
    ▼
┌──────────────────────────────────┐
│        API Responses             │
│        (from Backend)            │
└──────────────────────────────────┘
    │
    ├─ User data
    ├─ Organization data
    ├─ Projects list
    ├─ Issues list
    ├─ Team members
    └─ Reports data
```

---

## 🔄 Build & Deployment Cycle

```
Local Development
    │
    ├─ Code changes
    ├─ npm run dev
    ├─ Test locally
    │
    ▼
Production Build
    │
    ├─ npm run build
    ├─ Creates dist/ folder
    ├─ Minifies & optimizes
    │
    ▼
Version Control
    │
    ├─ git add .
    ├─ git commit -m "message"
    ├─ git push origin main
    │
    ▼
GitHub
    │
    ├─ Receives push
    ├─ Triggers webhook
    ├─ Sends update to Railway
    │
    ▼
Railway
    │
    ├─ Receives notification
    ├─ Clones updated code
    ├─ Builds Docker image
    ├─ Runs health checks
    ├─ Starts new service
    ├─ Stops old service (zero downtime)
    │
    ▼
✅ Production Live!
    │
    └─ Available at your Railway URL
```

---

## 🎨 UI/UX Flow

```
Landing Page
    │
    ├─ Not authenticated?
    │  └─ Redirect to /login
    │
    ├─ Login page
    │  ├─ Email input
    │  ├─ Password input
    │  ├─ Submit button
    │  │
    │  ▼
    │  Backend validates
    │  │
    │  ├─ Success → OTP sent
    │  └─ Error → Show error message
    │
    ├─ Verify OTP page
    │  ├─ OTP input
    │  ├─ Submit
    │  │
    │  ▼
    │  Backend validates OTP
    │  │
    │  ├─ Success → Token received
    │  └─ Error → Show error message
    │
    ▼
Dashboard (Authenticated)
    │
    ├─ Show user name
    ├─ List issues
    ├─ Show organization
    ├─ Navigation sidebar
    │  ├─ Dashboard
    │  ├─ Projects
    │  ├─ Issues
    │  ├─ Teams
    │  ├─ Reports
    │  ├─ Organization
    │  ├─ Settings
    │  └─ Logout
    │
    ▼
✅ Full Access to Features
```

---

## 🏁 Summary

```
Your Setup:
├─ Frontend: React + Vite (production optimized)
├─ Backend: https://newkavya360-production.up.railway.app
├─ Database: MySQL (Railway internal)
├─ Hosting: Railway (auto-deployed from GitHub)
├─ Security: Token-based authentication
└─ Features: Full-stack project management

Deployment Flow:
Code Push → GitHub → Railway → Build → Deploy → 🚀 Live!

Features Working:
✅ Authentication
✅ Organization Management
✅ Project Tracking
✅ Issue Management
✅ Team Collaboration
✅ Reports & Analytics
✅ Subscription Management
```

---

**Status**: ✅ Production Ready  
**Backend**: ✅ Live  
**Frontend**: 🚀 Ready to Deploy
