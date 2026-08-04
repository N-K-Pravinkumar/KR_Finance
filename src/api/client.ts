import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('fcms_user')
  if (raw) {
    try {
      const user = JSON.parse(raw)
      if (user?.token) {
        config.headers = config.headers || {}
        config.headers['Authorization'] = `Bearer ${user.token}`
      }
    } catch {
      // ignore
    }
  }
  return config
})
