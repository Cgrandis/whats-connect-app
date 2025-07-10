'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface UserInfo {
  pushname: string;
  wid: {
    user: string;
  };
}

type CampaignState = 'idle' | 'running' | 'paused' | 'cancelling';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  qrCode: string | null;
  statusMessage: string;
  userInfo: UserInfo | null;
  campaignState: CampaignState;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const socketInstance = io('http://localhost:3001', { 
    autoConnect: false,
    reconnection: true,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Conectando ao servidor...');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [campaignState, setCampaignState] = useState<CampaignState>('idle');

  useEffect(() => {
    if (!socketInstance.connected) {
        socketInstance.connect();
    }

    const onReady = (info: UserInfo) => {
        setStatusMessage('Conectado ao WhatsApp!');
        setIsConnected(true);
        setQrCode(null);
        setUserInfo(info);
    };
    const onQr = (qrData: string) => {
        setStatusMessage('Escaneie o QR Code para conectar.');
        setIsConnected(false);
        setQrCode(qrData);
        setUserInfo(null);
    };
    const onDisconnected = (reason: string) => {
        setStatusMessage(`Desconectado: ${reason}`);
        setIsConnected(false);
        setUserInfo(null);
        setCampaignState('idle');
    };
    const onCampaignStateChange = (newState: CampaignState) => {
        console.log("Contexto recebeu novo estado da campanha:", newState);
        setCampaignState(newState);
    };

    socketInstance.on('ready', onReady);
    socketInstance.on('qr', onQr);
    socketInstance.on('disconnected', onDisconnected);
    socketInstance.on('campaign-state-change', onCampaignStateChange);

    return () => {
      socketInstance.off('ready', onReady);
      socketInstance.off('qr', onQr);
      socketInstance.off('disconnected', onDisconnected);
      socketInstance.off('campaign-state-change', onCampaignStateChange); 
    };
  }, []);

  const value = { socket: socketInstance, isConnected, qrCode, statusMessage, userInfo, campaignState };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket deve ser usado dentro de um SocketProvider');
  }
  return context;
}
