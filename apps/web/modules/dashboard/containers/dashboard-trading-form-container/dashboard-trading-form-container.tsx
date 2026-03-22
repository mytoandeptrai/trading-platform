'use client';

import { useState } from 'react';
import { TradingForm } from '@/components/trading-form';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { useDashboardTradingFormContainer } from '../../hooks/use-dashboard-trading-form-container';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@repo/ui/components/button';
import { LogIn } from 'lucide-react';

export function DashboardTradingFormContainer() {
  const { isAuthenticated, isLoading, openAuthModal } = useAuth();
  const props = useDashboardTradingFormContainer();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const handleSubmitClick = () => {
    setConfirmModalOpen(true);
  };

  const handleConfirmOrder = () => {
    props.onSubmit();
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#161616]">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#161616] p-8 text-center">
        <LogIn className="h-12 w-12 text-gray-600" />
        <div>
          <h3 className="text-lg font-semibold text-white">Login to Trade</h3>
          <p className="mt-2 text-sm text-gray-400">
            Please login to start placing orders
          </p>
        </div>
        <Button onClick={openAuthModal} className="mt-2">
          Login
        </Button>
      </div>
    );
  }

  const orderTypeText = props.orderType === 'MARKET' ? 'Market' : 'Limit';
  const sideColor = props.orderSide === 'BUY' ? '#00C087' : '#F6465D';

  return (
    <>
      <TradingForm {...props} onSubmit={handleSubmitClick} />

      {/* Place Order Confirmation Modal */}
      <ConfirmationModal
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        title={`Confirm ${props.orderSide} Order`}
        description={
          <>
            You are about to place a <strong style={{ color: sideColor }}>{props.orderSide}</strong>{' '}
            <strong>{orderTypeText}</strong> order:
            <br />
            <br />
            Amount: <strong>{props.amount} {props.symbol.replace('USDT', '')}</strong>
            {props.orderType === 'LIMIT' && (
              <>
                <br />
                Price: <strong>{props.price} USDT</strong>
              </>
            )}
            <br />
            Total: <strong>{props.total} USDT</strong>
          </>
        }
        confirmText="Place Order"
        cancelText="Cancel"
        type={props.orderSide === 'BUY' ? 'success' : 'warning'}
        onConfirm={handleConfirmOrder}
        isLoading={props.isSubmitting}
      />
    </>
  );
}
