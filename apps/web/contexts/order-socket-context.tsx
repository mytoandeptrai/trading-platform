'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { ConnectionStatus, OrderSocketEvent } from '@/types/socket';
import { useAuth } from './auth-context';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6868';

interface OrderSocketContextValue {
  socket: Socket | null;
  status: ConnectionStatus;
  registerListener: <T = any>(event: OrderSocketEvent, callback: (data: T) => void) => () => void;
  unregisterListener: (event: OrderSocketEvent) => void;
  subscribeToPair: (pair: string) => void;
  unsubscribeFromPair: (pair: string) => void;
  subscribedPairs: string[];
}

const OrderSocketContext = createContext<OrderSocketContextValue | null>(null);

interface OrderSocketProviderProps {
  children: ReactNode;
}

export function OrderSocketProvider({ children }: OrderSocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [subscribedPairs, setSubscribedPairs] = useState<Set<string>>(new Set());
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Only connect if authenticated
    // Note: Authentication is handled via cookies (withCredentials: true)
    // The backend OrderGateway will verify the access_token cookie
    if (!isAuthenticated) {
      console.log('[OrderSocket] Not authenticated, skipping connection');
      setStatus(ConnectionStatus.DISCONNECTED);
      return;
    }

    // Connect to OrderGateway with cookie-based authentication
    setStatus(ConnectionStatus.CONNECTING);

    const socket = io(`${SOCKET_URL}/orders`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      withCredentials: true, // Send cookies for authentication
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[OrderSocket] Connected:', socket.id);
      setStatus(ConnectionStatus.CONNECTED);
    });

    socket.on('disconnect', (reason) => {
      console.log('[OrderSocket] Disconnected:', reason);
      setStatus(ConnectionStatus.DISCONNECTED);
      setSubscribedPairs(new Set()); // Clear subscriptions on disconnect
    });

    socket.on('connect_error', (error) => {
      console.error('[OrderSocket] Connection error:', error.message);
      setStatus(ConnectionStatus.ERROR);
    });

    socket.on('connected', (data) => {
      console.log('[OrderSocket] Server connected event:', data);
    });

    // Subscription confirmation events
    socket.on('subscribed', (data: { pair: string }) => {
      console.log('[OrderSocket] Subscribed to pair:', data.pair);
      setSubscribedPairs((prev) => new Set(prev).add(data.pair));
    });

    socket.on('unsubscribed', (data: { pair: string }) => {
      console.log('[OrderSocket] Unsubscribed from pair:', data.pair);
      setSubscribedPairs((prev) => {
        const next = new Set(prev);
        next.delete(data.pair);
        return next;
      });
    });

    // Cleanup on unmount or auth change
    return () => {
      console.log('[OrderSocket] Disconnecting...');
      socket.disconnect();
      socketRef.current = null;
      setStatus(ConnectionStatus.DISCONNECTED);
    };
  }, [isAuthenticated]); // Reconnect when auth changes

  /**
   * Register a listener for a socket event
   * Returns cleanup function to unregister the listener
   */
  const registerListener = useCallback(
    <T = any>(event: OrderSocketEvent, callback: (data: T) => void) => {
      if (!socketRef.current) {
        console.warn('[OrderSocket] Socket not initialized');
        return () => {};
      }

      socketRef.current.on(event, callback);
      console.log('[OrderSocket] Registered listener for:', event);

      // Return cleanup function
      return () => {
        if (socketRef.current) {
          socketRef.current.off(event, callback);
          console.log('[OrderSocket] Unregistered listener for:', event);
        }
      };
    },
    []
  );

  /**
   * Unregister all listeners for a specific event
   */
  const unregisterListener = useCallback((event: OrderSocketEvent) => {
    if (!socketRef.current) {
      console.warn('[OrderSocket] Socket not initialized');
      return;
    }

    socketRef.current.off(event);
    console.log('[OrderSocket] Unregistered all listeners for:', event);
  }, []);

  /**
   * Subscribe to a trading pair to receive order updates
   */
  const subscribeToPair = useCallback(
    (pair: string) => {
      if (!socketRef.current || status !== ConnectionStatus.CONNECTED) {
        console.warn('[OrderSocket] Cannot subscribe - socket not connected');
        return;
      }

      console.log('[OrderSocket] Subscribing to pair:', pair);
      socketRef.current.emit('subscribe:pair', pair);
    },
    [status]
  );

  /**
   * Unsubscribe from a trading pair
   */
  const unsubscribeFromPair = useCallback(
    (pair: string) => {
      if (!socketRef.current || status !== ConnectionStatus.CONNECTED) {
        console.warn('[OrderSocket] Cannot unsubscribe - socket not connected');
        return;
      }

      console.log('[OrderSocket] Unsubscribing from pair:', pair);
      socketRef.current.emit('unsubscribe:pair', pair);
    },
    [status]
  );

  const value: OrderSocketContextValue = {
    socket: socketRef.current,
    status,
    registerListener,
    unregisterListener,
    subscribeToPair,
    unsubscribeFromPair,
    subscribedPairs: Array.from(subscribedPairs),
  };

  return <OrderSocketContext.Provider value={value}>{children}</OrderSocketContext.Provider>;
}

/**
 * Hook to access OrderSocket context
 */
export function useOrderSocket() {
  const context = useContext(OrderSocketContext);
  if (!context) {
    throw new Error('useOrderSocket must be used within OrderSocketProvider');
  }
  return context;
}
