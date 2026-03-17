// Utility functions for production frontend

let inMemoryToken = null
let inMemoryUser = null

/**
 * Get authentication token from in-memory store
 */
export const getAuthToken = () => {
  return inMemoryToken
};

/**
 * Get user data from in-memory store
 */
export const getUser = () => {
  return inMemoryUser
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!getAuthToken() && !!getUser();
};

/**
 * Set authentication token
 */
export const setAuthToken = (token) => {
  inMemoryToken = token || null
};

/**
 * Set user data
 */
export const setUser = (user) => {
  inMemoryUser = user || null
};

/**
 * Clear all authentication data
 */
export const clearAuth = () => {
  inMemoryToken = null
  inMemoryUser = null
};

/**
 * Handle API errors in production
 */
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const message = error.response.data?.message || 'An error occurred';
    
    if (status === 401) {
      // Unauthorized - clear auth and redirect to login
      clearAuth();
      window.location.href = '/login';
      return 'Session expired. Please login again.';
    } else if (status === 403) {
      return 'Access denied. You do not have permission to perform this action.';
    } else if (status === 404) {
      return 'The requested resource was not found.';
    } else if (status === 500) {
      return 'Server error. Please try again later.';
    }
    return message;
  } else if (error.request) {
    // Request was made but no response
    return 'Network error. Please check your connection.';
  } else {
    // Other errors
    return error.message || 'An unexpected error occurred.';
  }
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isValidPassword = (password) => {
  return password && password.length >= 8;
};

/**
 * Format date for display
 */
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format datetime for display
 */
export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
