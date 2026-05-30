// Runtime configuration. Overwritten by docker-entrypoint.sh from ENV at container start.
// Local dev (vite): values below are used unless you set window.__APP_CONFIG__ elsewhere.
window.__APP_CONFIG__ = {
  API_BASE_URL: '/api',
  APP_ENV: 'development',
  ACCESS_TOKEN_TTL_MS: 900000,
  MOCK_MODE: false,
};
