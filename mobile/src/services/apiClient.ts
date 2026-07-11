import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/api';

let apiClientInstance: AxiosInstance | null = null;

/**
 * Get the singleton Axios instance for API calls.
 * Includes request/response interceptors for logging and error handling.
 */
export function getApiClient(): AxiosInstance {
  if (!apiClientInstance) {
    apiClientInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor: log in dev
    apiClientInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (__DEV__) {
          console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor: global error handling
    apiClientInstance.interceptors.response.use(
      (response) => {
        if (__DEV__) {
          console.log(`[API] ${response.status} ${response.config.url}`);
        }
        return response;
      },
      (error) => {
        if (__DEV__) {
          console.error(
            `[API Error] ${error.config?.url}:`,
            error.message,
            error.response?.data ?? '',
          );
        }
        // Could integrate Sentry/Crashlytics here for production
        return Promise.reject(error);
      },
    );
  }
  return apiClientInstance;
}

/**
 * Reset the singleton — useful for tests.
 */
export function resetApiClient(): void {
  apiClientInstance = null;
}