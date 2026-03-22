'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import type { Order } from '@/types/trading';
import { formatPriceNumber, formatNumber, cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Skeleton } from '@repo/ui/components/skeleton';
import { ConfirmationModal } from '@/components/confirmation-modal';

interface OrdersTableProps {
  orders: Order[];
  isLoading: boolean;
  onCancelOrder: (orderId: string) => void;
  // Pagination
  total?: number;
  limit?: number;
  offset?: number;
  onPageChange?: (offset: number) => void;
}

export function OrdersTable({
  orders,
  isLoading,
  onCancelOrder,
  total = 0,
  limit = 50,
  offset = 0,
  onPageChange,
}: OrdersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleCancelClick = (orderId: string) => {
    setOrderToCancel(orderId);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = () => {
    if (orderToCancel) {
      onCancelOrder(orderToCancel);
      setOrderToCancel(null);
    }
  };

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        accessorKey: 'pair',
        header: 'Pair',
        cell: ({ row }) => (
          <span className="font-medium text-white">{row.original.pair}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <span className="text-gray-300">{row.original.type}</span>
        ),
      },
      {
        accessorKey: 'side',
        header: 'Side',
        cell: ({ row }) => (
          <span
            className={cn(
              'font-medium',
              row.original.side === 'BUY' ? 'text-[#00C087]' : 'text-[#F6465D]'
            )}
          >
            {row.original.side}
          </span>
        ),
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: ({ row }) => (
          <span className="text-gray-300">
            {row.original.price ? formatPriceNumber(row.original.price) : 'Market'}
          </span>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="text-gray-300">
            {formatNumber(row.original.amount, 6)}
          </span>
        ),
      },
      {
        accessorKey: 'filled',
        header: 'Filled',
        cell: ({ row }) => (
          <span className="text-gray-300">
            {formatNumber(row.original.filled, 6)}
          </span>
        ),
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ row }) => {
          const total = row.original.price
            ? row.original.price * row.original.amount
            : 0;
          return (
            <span className="text-gray-300">
              {total > 0 ? formatPriceNumber(total) : '-'}
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'action',
        header: 'Action',
        cell: ({ row }) => {
          if (row.original.status !== 'PENDING') return null;
          return (
            <Button
              onClick={() => handleCancelClick(row.original.id)}
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-[#F6465D] hover:text-[#F6465D]/80"
            >
              Cancel
            </Button>
          );
        },
      },
    ],
    [handleCancelClick]
  );

  const table = useReactTable({
    data: orders,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center bg-[#161616] py-12">
        <div className="text-sm text-gray-400">No orders found</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#161616]">
      <div className="flex-1 overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#0D0D0D]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-gray-800 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-gray-400">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="border-gray-800 hover:bg-gray-800/30">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between border-t border-gray-800 bg-[#0D0D0D] px-4 py-3">
          <div className="text-sm text-gray-400">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total} orders
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="h-8 border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-50"
            >
              Previous
            </Button>
            <div className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              onClick={() => onPageChange(offset + limit)}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
              className="h-8 border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        title="Cancel Order"
        description="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Yes, Cancel Order"
        cancelText="No, Keep Order"
        type="danger"
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    PENDING: 'default',
    FILLED: 'default',
    PARTIALLY_FILLED: 'default',
    CANCELED: 'destructive',
  } as const;

  const colors = {
    PENDING: 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30',
    FILLED: 'bg-green-500/20 text-green-500 hover:bg-green-500/30',
    PARTIALLY_FILLED: 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30',
    CANCELED: 'bg-red-500/20 text-red-500 hover:bg-red-500/30',
  };

  return (
    <Badge
      variant={variants[status as keyof typeof variants] || 'default'}
      className={cn(
        colors[status as keyof typeof colors] || 'bg-gray-500/20 text-gray-500'
      )}
    >
      {status.replace('_', ' ')}
    </Badge>
  );
}
