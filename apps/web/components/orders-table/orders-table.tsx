'use client';

import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
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

interface OrdersTableProps {
  orders: Order[];
  isLoading: boolean;
  onCancelOrder: (orderId: string) => void;
}

export function OrdersTable({ orders, isLoading, onCancelOrder }: OrdersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

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
              onClick={() => onCancelOrder(row.original.id)}
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
    [onCancelOrder]
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
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-400">No orders found</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
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
            <TableRow key={row.id}>
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
