import { useQuery } from '@tanstack/react-query';
import { usersAPI } from '@/apis/users';
import { POLLING_INTERVALS } from '@/constants/trading';

// Query Keys
export const balanceKeys = {
  all: ['balance'] as const,
  list: () => [...balanceKeys.all, 'list'] as const,
};

/**
 * Fetch account balance
 */
export function useBalance() {
  return useQuery({
    queryKey: balanceKeys.list(),
    queryFn: () => usersAPI.getBalance(),
    staleTime: POLLING_INTERVALS.BALANCE,
    refetchInterval: POLLING_INTERVALS.BALANCE, // Poll every 10 seconds
  });
}
