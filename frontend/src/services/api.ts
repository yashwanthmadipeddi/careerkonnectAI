import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Token storage helpers
// ---------------------------------------------------------------------------

const getAccessToken = () =>
  localStorage.getItem('access_token') || sessionStorage.getItem('access_token');

const getRefreshToken = () =>
  localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');

const setTokens = (access: string, refresh?: string) => {
  const refreshInLocal =
    localStorage.getItem('refresh_token') !== null;

  if (refreshInLocal) {
    localStorage.setItem('access_token', access);
    if (refresh) {
      localStorage.setItem('refresh_token', refresh);
    }
  } else {
    sessionStorage.setItem('access_token', access);
    if (refresh) {
      sessionStorage.setItem('refresh_token', refresh);
    }
  }
};

const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
};

// ---------------------------------------------------------------------------
// Refresh lock / queue
// ---------------------------------------------------------------------------

let isRefreshing = false;

let refreshQueue: Array<{
  resolve: (value?: string) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (
  error: any,
  accessToken: string | null = null
) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(accessToken ?? undefined);
    }
  });

  refreshQueue = [];
};

// ---------------------------------------------------------------------------
// Request interceptor
// ---------------------------------------------------------------------------

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response interceptor
// ---------------------------------------------------------------------------

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearTokens();
      window.location.href = '/login?session_expired=true';
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      })
        .then((accessToken) => {
          if (originalRequest.headers && accessToken) {
            originalRequest.headers.Authorization =
              `Bearer ${accessToken}`;
          }

          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/token/refresh/`,
        {
          refresh: refreshToken,
        }
      );

      const { access, refresh } = data;

      setTokens(access, refresh);

      processQueue(null, access);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization =
          `Bearer ${access}`;
      }

      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearTokens();
      window.location.href = '/login?session_expired=true';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
