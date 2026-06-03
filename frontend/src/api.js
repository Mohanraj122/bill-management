import axios from 'axios';

const api = axios.create({
  baseURL: `http://${window.location.hostname}:8000`, // Dynamically binds to the local host's IP serving the backend
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
