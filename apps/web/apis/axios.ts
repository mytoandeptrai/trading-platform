import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import qs from "qs";

// API Configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:6868/api";
const API_TIMEOUT = 30000; // 30 seconds

type NonNullableObject<T> = {
  [K in keyof T]: T[K] extends object
    ? NonNullableObject<T[K]>
    : NonNullable<T[K]>;
};

function isEmpty<T>(value: T): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" &&
      value !== null &&
      Object.keys(value).length === 0)
  );
}

function cleanParams<T extends Record<string, unknown>>(
  obj: T,
): NonNullableObject<T> {
  const result: Partial<NonNullableObject<T>> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isEmpty(value)) {
      continue;
    }

    if (typeof value === "object" && !Array.isArray(value) && value !== null) {
      const nested = cleanParams(value as Record<string, unknown>);
      if (Object.keys(nested).length > 0) {
        result[key as keyof T] = nested as NonNullableObject<T>[keyof T];
      }
    } else {
      result[key as keyof T] = value as NonNullableObject<T>[keyof T];
    }
  }

  return result as NonNullableObject<T>;
}

// Create Axios instance
const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for cookie-based auth
  paramsSerializer: (params) => {
    const _params = cleanParams(params);
    return qs.stringify(_params, { arrayFormat: "repeat" });
  },
});

// Request Interceptor
httpClient.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    if (config.method === "get") {
      config.params = {
        ...config.params,
      };
    }

    // Log request in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[API Request] ${config.method?.toUpperCase()} ${config.url}`,
        {
          params: config.params,
          data: config.data,
        },
      );
    }

    return config;
  },
  (error: AxiosError) => {
    console.error("[API Request Error]", error);
    return Promise.reject(error);
  },
);

// Response Interceptor
httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`,
        {
          status: response.status,
          data: response.data,
        },
      );
    }

    // Unwrap backend response wrapper { success: true, data: T, timestamp, path }
    if (
      response.data &&
      typeof response.data === "object" &&
      "success" in response.data &&
      "data" in response.data
    ) {
      response.data = response.data.data;
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Log error
    console.error("[API Response Error]", {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Note: Auth modal will be triggered by Auth Context
      // No redirect here - just reject the error
      return Promise.reject(error);
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error("Access forbidden");
    }

    // Handle 500 Server Error
    if (error.response?.status === 500) {
      console.error("Server error occurred");
    }

    // Handle Network Error
    if (!error.response) {
      console.error("Network error - server might be down");
    }

    return Promise.reject(error);
  },
);

// Export configured instance
export default httpClient;

// Export types
export type { AxiosError, AxiosResponse };
