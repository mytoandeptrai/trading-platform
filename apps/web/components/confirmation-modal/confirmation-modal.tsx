'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Button } from '@repo/ui/components/button';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export type ConfirmationType = 'success' | 'warning' | 'danger';

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  onConfirm,
  isLoading = false,
}: ConfirmationModalProps) {
  const icons = {
    success: <CheckCircle className="h-6 w-6 text-[#00C087]" />,
    warning: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
    danger: <XCircle className="h-6 w-6 text-[#F6465D]" />,
  };

  const confirmButtonClasses = {
    success: 'bg-[#00C087] hover:bg-[#00C087]/90',
    warning: 'bg-yellow-500 hover:bg-yellow-500/90',
    danger: 'bg-[#F6465D] hover:bg-[#F6465D]/90',
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gray-800 bg-[#161616] text-white sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {icons[type]}
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-gray-400">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={confirmButtonClasses[type]}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
