import { useOrders, useCancelOrder } from '@/hooks/use-orders';
import { toast } from 'sonner';

export function useOrdersListContainer(status?: string) {
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
    orders,
    isLoading,
    onCancelOrder: handleCancelOrder,
  };
}
