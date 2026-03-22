import httpClient from '../axios';
import type { User, LoginRequest, LoginResponse, RegisterRequest } from '@/types/auth';

export const authAPI = {
  /**
   * Login user
   * Backend: POST /auth/login
   * Sets httpOnly cookies (access_token, refresh_token)
   * Returns user object
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  /**
   * Register new user
   * Backend: POST /auth/register
   * Does NOT set cookies
   * Returns true on success
   */
  async register(data: RegisterRequest): Promise<boolean> {
    const response = await httpClient.post<boolean>('/auth/register', data);
    return response.data;
  },

  /**
   * Logout user
   * Backend: POST /auth/logout
   * Clears httpOnly cookies
   */
  async logout(): Promise<void> {
    await httpClient.post('/auth/logout');
  },

  /**
   * Get current user profile
   * Backend: GET /auth/me
   * Requires access_token cookie
   */
  async me(): Promise<User> {
    const response = await httpClient.get<User>('/auth/me');
    return response.data;
  },
};
