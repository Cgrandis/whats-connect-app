'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSocket } from '../src/context/SocketContext';

type CampaignState = 'idle' | 'running' | 'paused' | 'cancelling';

export default function HomePage() { 
  const { socket, isConnected, qrCode, statusMessage, userInfo } = useSocket();
  
  const [campaignStatus, setCampaignStatus] = useState<string>('');
  const [campaignState, setCampaignState] = useState<CampaignState>('idle');

  useEffect(() => {
    if (!socket) return;

    const onCampaignStatus = (message: string) => {
        setCampaignStatus(message);
    };
    
    const onCampaignStateChange = (newState: CampaignState) => {
      console.log("Novo estado da campanha recebido:", newState);
      setCampaignState(newState);
    };
    
    socket.on('campaign-status', onCampaignStatus);
    socket.on('campaign-state-change', onCampaignStateChange);

    return () => {
      socket.off('campaign-status', onCampaignStatus);
      socket.off('campaign-state-change', onCampaignStateChange);
    };
  }, [socket]);

  const handleStart = () => socket?.emit('campaign:start');
  const handlePause = () => socket?.emit('campaign:pause');
  const handleResume = () => socket?.emit('campaign:resume');
  const handleCancel = () => {
    if (window.confirm('Tem certeza que deseja cancelar a campanha? Esta ação não pode ser desfeita.')) {
      socket?.emit('campaign:cancel');
    }
  };

  const renderCampaignControls = () => {
    switch (campaignState) {
      case 'running':
        return (
          <div className="flex justify-center gap-4">
            <button onClick={handlePause} className="bg-yellow-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-yellow-600 transition-all">Pausar Campanha</button>
            <button onClick={handleCancel} className="bg-red-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-red-700 transition-all">Cancelar Campanha</button>
          </div>
        );
      case 'paused':
        return (
          <div className="flex justify-center gap-4">
            <button onClick={handleResume} className="bg-green-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-green-600 transition-all">Continuar Campanha</button>
            <button onClick={handleCancel} className="bg-red-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-red-700 transition-all">Cancelar Campanha</button>
          </div>
        );
      case 'cancelling':
        return <p className="text-lg font-semibold text-red-500">Cancelando campanha, por favor aguarde...</p>;
      case 'idle':
      default:
        return (
          <button onClick={handleStart} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-blue-700 transition-all">
            Iniciar Campanha de Marketing
          </button>
        );
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24 bg-gray-100 text-gray-800">
      <div className="z-10 w-full max-w-2xl items-center flex-col p-8 bg-white shadow-2xl rounded-xl">
        <h1 className="text-3xl font-bold mb-2 text-center">Dashboard de Automação</h1>
        {isConnected && userInfo && (
            <p className="text-center text-gray-500 mb-4">Conectado como: {userInfo.pushname}</p>
        )}
        
        <p className={`text-lg mb-6 p-3 rounded-md text-center font-semibold ${isConnected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          Status: {statusMessage}
        </p>

        {!isConnected && qrCode && (
          <div className="flex flex-col items-center border-t pt-6 mt-6">
            <Image src={qrCode} alt="QR Code do WhatsApp" width={300} height={300} className="border-4 border-gray-300 rounded-lg"/>
          </div>
        )}

        {isConnected && (
          <div className="w-full mt-6 border-t pt-6 text-center">
            
            <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Conexão</h2>
                    <Link href="/conexao" className="text-lg font-semibold text-red-700 hover:text-red-800 bg-red-100 py-3 px-5 rounded-lg inline-block transition-all shadow-sm hover:shadow-md">
                        Gerenciar
                    </Link>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Contatos</h2>
                    <Link href="/grupos" className="text-lg font-semibold text-green-700 hover:text-green-800 bg-green-100 py-3 px-5 rounded-lg inline-block transition-all shadow-sm hover:shadow-md">
                        Sincronizar
                    </Link>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Conteúdo</h2>
                    <Link href="/mensagens" className="text-lg font-semibold text-purple-700 hover:text-purple-800 bg-purple-100 py-3 px-5 rounded-lg inline-block transition-all shadow-sm hover:shadow-md">
                        Mensagens
                    </Link>
                </div>
            </div>
            
            <div className="border-t pt-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Controle da Campanha</h2>
                <div className="min-h-[56px] flex items-center justify-center">
                    {renderCampaignControls()}
                </div>
                {campaignState !== 'idle' && campaignStatus && (
                    <p className="mt-4 text-md text-gray-600 bg-gray-100 p-3 rounded-md">
                        <span className="font-bold">Atualização:</span> {campaignStatus}
                    </p>
                )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
