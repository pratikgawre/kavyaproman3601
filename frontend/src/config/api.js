// API Configuration for frontend
// Automatically switches between development and production URLs

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE}/api/auth/login`,
  REGISTER: `${API_BASE}/api/auth/register`,
  VERIFY_OTP: `${API_BASE}/api/auth/verify-otp`,
  RESEND_OTP: `${API_BASE}/api/auth/resend-otp`,
  FORGOT_PASSWORD: `${API_BASE}/api/auth/forgot-password`,
  RESET_PASSWORD: `${API_BASE}/api/auth/reset-password`,
  
  // Organizations
  GET_ORGANIZATIONS: `${API_BASE}/api/organizations`,
  CREATE_ORGANIZATION: `${API_BASE}/api/organizations`,
  UPDATE_ORGANIZATION: `${API_BASE}/api/organizations`,
  DELETE_ORGANIZATION: `${API_BASE}/api/organizations`,
  
  // Projects
  GET_PROJECTS: `${API_BASE}/api/projects`,
  CREATE_PROJECT: `${API_BASE}/api/projects`,
  UPDATE_PROJECT: `${API_BASE}/api/projects`,
  DELETE_PROJECT: `${API_BASE}/api/projects`,
  
  // Issues
  GET_ISSUES: `${API_BASE}/api/issues`,
  CREATE_ISSUE: `${API_BASE}/api/issues`,
  UPDATE_ISSUE: `${API_BASE}/api/issues`,
  DELETE_ISSUE: `${API_BASE}/api/issues`,
  
  // Teams
  GET_TEAMS: `${API_BASE}/api/teams`,
  CREATE_TEAM: `${API_BASE}/api/teams`,
  UPDATE_TEAM: `${API_BASE}/api/teams`,
  DELETE_TEAM: `${API_BASE}/api/teams`,
  
  // User
  GET_USER: `${API_BASE}/api/user`,
  UPDATE_USER: `${API_BASE}/api/user`,
  
  // Reports
  GET_REPORTS: `${API_BASE}/api/reports`,
  
  // Subscriptions
  GET_SUBSCRIPTIONS: `${API_BASE}/api/subscriptions`,
  CREATE_SUBSCRIPTION: `${API_BASE}/api/subscriptions`,
  
  // Contact
  SEND_CONTACT: `${API_BASE}/api/contact/send-email`,
};

// Axios instance configuration
export const getAxiosConfig = () => ({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default API_BASE;
