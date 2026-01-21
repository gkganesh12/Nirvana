'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth, useUser } from '@clerk/nextjs';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinWorkspace: (workspaceId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinWorkspace: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { getToken, isSignedIn } = useAuth();
  const { user: _user } = useUser();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let socketInstance: Socket | null = null;

    const connectSocket = async () => {
      if (!isSignedIn) return;

      const token = await getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // Remove /api if present at the end for socket URL (socket usually on root or specific path)
      // NestJS gateway namespace is /events
      const socketUrl = `${apiUrl}`; 

      socketInstance = io(`${socketUrl}/events`, {
        auth: {
          token,
        },
        transports: ['websocket'],
      });

      socketInstance.on('connect', () => {
        setIsConnected(true);
        console.log('Socket connected:', socketInstance?.id);
      });

      socketInstance.on('disconnect', () => {
        setIsConnected(false);
        console.log('Socket disconnected');
      });

      socketInstance.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
      });

      setSocket(socketInstance);
    };

    connectSocket();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [isSignedIn, getToken]);

  const joinWorkspace = (workspaceId: string) => {
    if (socket && isConnected) {
      socket.emit('join_workspace', { workspaceId });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinWorkspace }}>
      {children}
    </SocketContext.Provider>
  );
};
