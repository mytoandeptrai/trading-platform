'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { ConnectionStatus, SocketEvent } from '@/types/socket';
import { useAuth } from './auth-context';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6868';

interface SocketContextValue {
  socket: Socket | null;
  status: ConnectionStatus;
  isAuthenticated: boolean;
  registerListener: <T = any>(event: SocketEvent, callback: (data: T) => void) => () => void;
  unregisterListener: (event: SocketEvent) => void;
  subscribeToPair: (pair: string) => void;
  unsubscribeFromPair: (pair: string) => void;
  subscribedPairs: string[];
}

const SocketContext = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

/**
 * UnifiedSocketProvider - Single WebSocket connection for all real-time events
 * Connects to /ws namespace
 *
 * Public Events (broadcast to all):
 * - ticker:update
 * - orderbook:update
 * - orderbook:changed
 *
 * Private Events (only if authenticated):
 * - order:matched
 * - trade:executed
 * - order:filled
 * - order:cancelled
 */
export function SocketProvider({ children }: SocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [subscribedPairs, setSubscribedPairs] = useState<Set<string>>(new Set());
  const [isSocketAuthenticated, setIsSocketAuthenticated] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Connect to UnifiedGateway with cookie-based authentication
    // Note: Authentication is handled via cookies (withCredentials: true)
    // The backend will verify the access_token cookie if present
    setStatus(ConnectionStatus.CONNECTING);

    const socketConfig: any = {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      withCredentials: true, // Send cookies for authentication
    };

    const socket = io(`${SOCKET_URL}/ws`, socketConfig);
    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[UnifiedSocket] Connected:', socket.id);
      setStatus(ConnectionStatus.CONNECTED);
    });

    socket.on('disconnect', (reason) => {
      console.log('[UnifiedSocket] Disconnected:', reason);
      setStatus(ConnectionStatus.DISCONNECTED);
      setSubscribedPairs(new Set()); // Clear subscriptions on disconnect
      setIsSocketAuthenticated(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[UnifiedSocket] Connection error:', error.message);
      setStatus(ConnectionStatus.ERROR);
    });

    socket.on('connected', (data: { message: string; authenticated: boolean; userId?: string; username?: string }) => {
      console.log('[UnifiedSocket] Server connected event:', data);
      setIsSocketAuthenticated(data.authenticated);

      if (data.authenticated) {
        console.log(`[UnifiedSocket] Authenticated as user: ${data.username} (${data.userId})`);
      } else {
        console.log('[UnifiedSocket] Connected as public user');
      }
    });

    // Subscription confirmation events
    socket.on('subscribed', (data: { pair: string }) => {
      console.log('[UnifiedSocket] Subscribed to pair:', data.pair);
      setSubscribedPairs((prev) => new Set(prev).add(data.pair));
    });

    socket.on('unsubscribed', (data: { pair: string }) => {
      console.log('[UnifiedSocket] Unsubscribed from pair:', data.pair);
      setSubscribedPairs((prev) => {
        const next = new Set(prev);
        next.delete(data.pair);
        return next;
      });
    });

    // Cleanup on unmount or auth change
    return () => {
      console.log('[UnifiedSocket] Disconnecting...');
      socket.disconnect();
      socketRef.current = null;
      setStatus(ConnectionStatus.DISCONNECTED);
      setIsSocketAuthenticated(false);
    };
  }, [isAuthenticated]); // Reconnect when auth changes

  /**
   * Register a listener for a socket event
   * Returns cleanup function to unregister the listener
   */
  const registerListener = useCallback(
    <T = any>(event: SocketEvent, callback: (data: T) => void) => {
      if (!socketRef.current) {
        console.warn('[UnifiedSocket] Socket not initialized');
        return () => {};
      }

      socketRef.current.on(event, callback);
      console.log('[UnifiedSocket] Registered listener for:', event);

      // Return cleanup function
      return () => {
        if (socketRef.current) {
          socketRef.current.off(event, callback);
          console.log('[UnifiedSocket] Unregistered listener for:', event);
        }
      };
    },
    []
  );

  /**
   * Unregister all listeners for a specific event
   */
  const unregisterListener = useCallback((event: SocketEvent) => {
    if (!socketRef.current) {
      console.warn('[UnifiedSocket] Socket not initialized');
      return;
    }

    socketRef.current.off(event);
    console.log('[UnifiedSocket] Unregistered all listeners for:', event);
  }, []);

  /**
   * Subscribe to a trading pair to receive updates
   */
  const subscribeToPair = useCallback(
    (pair: string) => {
      if (!socketRef.current || status !== ConnectionStatus.CONNECTED) {
        console.warn('[UnifiedSocket] Cannot subscribe - socket not connected');
        return;
      }

      console.log('[UnifiedSocket] Subscribing to pair:', pair);
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
        console.warn('[UnifiedSocket] Cannot unsubscribe - socket not connected');
        return;
      }

      console.log('[UnifiedSocket] Unsubscribing from pair:', pair);
      socketRef.current.emit('unsubscribe:pair', pair);
    },
    [status]
  );

  const value: SocketContextValue = {
    socket: socketRef.current,
    status,
    isAuthenticated: isSocketAuthenticated,
    registerListener,
    unregisterListener,
    subscribeToPair,
    unsubscribeFromPair,
    subscribedPairs: Array.from(subscribedPairs),
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

/**
 * Hook to access unified Socket context
 */
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}
