/**
 * API configuration.
 * For GitHub Pages: set API_BASE_URL to your deployed backend (Railway, etc.).
 * During local UI demo without backend, set USE_LOCAL_FALLBACK to true.
 */
const CONFIG = {
  API_BASE_URL: window.API_BASE_URL || "http://localhost:3000",
  USE_LOCAL_FALLBACK: window.USE_LOCAL_FALLBACK ?? false,
};
