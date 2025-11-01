import axios from 'axios'

// Determine API URL based on environment
const getApiUrl = () => {
  // If running in browser, check for environment variable
  if (typeof window !== 'undefined') {
    // For local development, use relative path so Vite proxy handles it
    const hostname = window.location.hostname
    
    // For local development - use relative path
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '/api'
    }
    
    // For Vercel deployment - use Railway API
    if (hostname.includes('vercel.app')) {
      return 'https://cursor-production-1d92.up.railway.app/api'
    }
    
    // Default: use Railway API
    return 'https://cursor-production-1d92.up.railway.app/api'
  }
  
  // Server-side fallback
  return 'https://cursor-production-1d92.up.railway.app/api'
}

const API_URL = getApiUrl()

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // If data is FormData, remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api


