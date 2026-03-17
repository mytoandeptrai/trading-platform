import { useState } from 'react';
import { useOrders, useCancelOrder } from '@/hooks/use-orders';
import { toast } from 'sonner';

export function useDashboardOrdersContainer() {
  const [activeTab, setActiveTab] = useState('all');

  const status = activeTab === 'all' ? undefined : activeTab;
  const { data: orders = [], isLoading } = useOrders(status);
  const { mutate: cancelOrder } = useCancelOrder();

  const handleCancelOrder = (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    cancelOrder(orderId, {
      onSuccess: () => {
        toast.success('Order canceled successfully');
      },
      onError: (error) => {
        toast.error(`Failed to cancel order: ${error.message}`);
      },
    });
  };

  return {
    activeTab,
    orders,
    isLoading,
    onTabChange: setActiveTab,
    onCancelOrder: handleCancelOrder,
  };
}
