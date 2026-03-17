import httpClient from '../axios';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

interface AuthResponse {
  user: {
    id: number;
    email: string;
    username: string;
  };
}

export const authAPI = {
  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await httpClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await httpClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await httpClient.post('/auth/logout');
  },

  /**
   * Get current user profile
   */
  async getProfile(): Promise<AuthResponse['user']> {
    const response = await httpClient.get<AuthResponse['user']>('/auth/profile');
    return response.data;
  },
};
