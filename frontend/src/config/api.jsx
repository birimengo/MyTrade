// src/config/api.js

// For development: use localhost:5000
// For production: use your Render URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Socket server URL
const SOCKET_SERVER = import.meta.env.VITE_SOCKET_SERVER;

export { API_BASE_URL, SOCKET_SERVER };