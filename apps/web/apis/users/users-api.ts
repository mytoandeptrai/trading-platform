import httpClient from '../axios';
import type { Balance } from '@/types/trading';

interface AccountInfo {
  id: number;
  email: string;
  username: string;
  createdAt: string;
}

export const usersAPI = {
  /**
   * Get account balance
   */
  async getBalance(): Promise<Balance[]> {
    const response = await httpClient.get<Balance[]>('/account/balance');
    return response.data;
  },

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<AccountInfo> {
    const response = await httpClient.get<AccountInfo>('/account/info');
    return response.data;
  },
};
