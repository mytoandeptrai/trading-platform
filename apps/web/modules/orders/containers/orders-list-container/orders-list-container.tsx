'use client';

import { OrdersTable } from '@/components/orders-table';
import { useOrdersListContainer } from '../../hooks/use-orders-list-container';

interface OrdersListContainerProps {
  status?: string;
}

export function OrdersListContainer({ status }: OrdersListContainerProps) {
  const props = useOrdersListContainer(status);
  return <OrdersTable {...props} />;
}
