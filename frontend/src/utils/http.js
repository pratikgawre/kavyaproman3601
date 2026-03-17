// HTTP Client for API calls
import API_BASE, { getAxiosConfig } from '../config/api';
import { clearAuth, handleApiError, getAuthToken } from './helpers';

/**
 * Make HTTP request with error handling
 */
const makeRequest = async (url, options = {}) => {
  try {
    const token = getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
      method: options.method || 'GET',
      headers,
      ...options,
    };
    
    if (options.body) {
      config.body = JSON.stringify(options.body);
    }
    
    const response = await fetch(url, config);
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      clearAuth();
      window.location.href = '/login';
      throw new Error('Unauthorized. Please login again.');
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP Error: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * GET request
 */
export const get = (url) => {
  return makeRequest(url, { method: 'GET' });
};

/**
 * POST request
 */
export const post = (url, body) => {
  return makeRequest(url, { method: 'POST', body });
};

/**
 * PUT request
 */
export const put = (url, body) => {
  return makeRequest(url, { method: 'PUT', body });
};

/**
 * DELETE request
 */
export const del = (url) => {
  return makeRequest(url, { method: 'DELETE' });
};

/**
 * PATCH request
 */
export const patch = (url, body) => {
  return makeRequest(url, { method: 'PATCH', body });
};

export default {
  get,
  post,
  put,
  delete: del,
  patch,
};
