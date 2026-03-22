'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { ConnectionStatus, TickerSocketEvent } from '@/types/socket';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6868';

interface TickerSocketContextValue {
  socket: Socket | null;
  status: ConnectionStatus;
  registerListener: <T = any>(event: TickerSocketEvent, callback: (data: T) => void) => () => void;
  unregisterListener: (event: TickerSocketEvent) => void;
}

const TickerSocketContext = createContext<TickerSocketContextValue | null>(null);

interface TickerSocketProviderProps {
  children: ReactNode;
}

export function TickerSocketProvider({ children }: TickerSocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);

  useEffect(() => {
    // Connect to TickerGateway (public, no auth required)
    setStatus(ConnectionStatus.CONNECTING);

    const socket = io(`${SOCKET_URL}/ticker`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[TickerSocket] Connected:', socket.id);
      setStatus(ConnectionStatus.CONNECTED);
    });

    socket.on('disconnect', (reason) => {
      console.log('[TickerSocket] Disconnected:', reason);
      setStatus(ConnectionStatus.DISCONNECTED);
    });

    socket.on('connect_error', (error) => {
      console.error('[TickerSocket] Connection error:', error.message);
      setStatus(ConnectionStatus.ERROR);
    });

    socket.on('connected', (data) => {
      console.log('[TickerSocket] Server connected event:', data);
    });

    // Cleanup on unmount
    return () => {
      console.log('[TickerSocket] Disconnecting...');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  /**
   * Register a listener for a socket event
   * Returns cleanup function to unregister the listener
   */
  const registerListener = useCallback(
    <T = any>(event: TickerSocketEvent, callback: (data: T) => void) => {
      if (!socketRef.current) {
        console.warn('[TickerSocket] Socket not initialized');
        return () => {};
      }

      socketRef.current.on(event, callback);
      console.log('[TickerSocket] Registered listener for:', event);

      // Return cleanup function
      return () => {
        if (socketRef.current) {
          socketRef.current.off(event, callback);
          console.log('[TickerSocket] Unregistered listener for:', event);
        }
      };
    },
    []
  );

  /**
   * Unregister all listeners for a specific event
   */
  const unregisterListener = useCallback((event: TickerSocketEvent) => {
    if (!socketRef.current) {
      console.warn('[TickerSocket] Socket not initialized');
      return;
    }

    socketRef.current.off(event);
    console.log('[TickerSocket] Unregistered all listeners for:', event);
  }, []);

  const value: TickerSocketContextValue = {
    socket: socketRef.current,
    status,
    registerListener,
    unregisterListener,
  };

  return <TickerSocketContext.Provider value={value}>{children}</TickerSocketContext.Provider>;
}

/**
 * Hook to access TickerSocket context
 */
export function useTickerSocket() {
  const context = useContext(TickerSocketContext);
  if (!context) {
    throw new Error('useTickerSocket must be used within TickerSocketProvider');
  }
  return context;
}
