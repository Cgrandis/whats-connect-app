// app/page.tsx (Final, Responsivo e com Controles de Campanha)
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSocket } from '../src/context/SocketContext';

// Define os possíveis estados da campanha para um código mais limpo e seguro
type CampaignState = 'idle' | 'running' | 'paused' | 'cancelling';

export default function HomePage() { 
  // Consome o estado global da conexão e do usuário do nosso hook customizado
  const { socket, isConnected, qrCode, statusMessage, userInfo } = useSocket();
  
  // Estados locais, específicos desta página
  const [campaignStatus, setCampaignStatus] = useState<string>('');
  const [campaignState, setCampaignState] = useState<CampaignState>('idle');

  // useEffect para ouvir os eventos específicos da campanha
  useEffect(() => {
    if (!socket) return;

    const onCampaignStatus = (message: string) => setCampaignStatus(message);
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

  // Funções para emitir os comandos de controle da campanha
  const handleStart = () => socket?.emit('campaign:start');
  const handlePause = () => socket?.emit('campaign:pause');
  const handleResume = () => socket?.emit('campaign:resume');
  const handleCancel = () => {
    if (window.confirm('Tem certeza que deseja cancelar a campanha?')) {
      socket?.emit('campaign:cancel');
    }
  };

  // Função que decide quais botões mostrar com base no estado atual da campanha
  const renderCampaignControls = () => {
    switch (campaignState) {
      case 'running':
        return (
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={handlePause} className="bg-yellow-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-yellow-600 transition-all transform hover:scale-105">Pausar Campanha</button>
            <button onClick={handleCancel} className="bg-red-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-red-700 transition-all transform hover:scale-105">Cancelar Campanha</button>
          </div>
        );
      case 'paused':
        return (
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={handleResume} className="bg-green-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-green-600 transition-all transform hover:scale-105">Continuar Campanha</button>
            <button onClick={handleCancel} className="bg-red-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-red-700 transition-all transform hover:scale-105">Cancelar Campanha</button>
          </div>
        );
      case 'cancelling':
        return <p className="text-lg font-semibold text-red-500 animate-pulse">Cancelando campanha...</p>;
      case 'idle':
      default:
        return (
          <button onClick={handleStart} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-blue-700 transition-all transform hover:scale-105">
            Iniciar Campanha de Marketing
          </button>
        );
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-gray-100 text-gray-800">
      <div className="w-full max-w-3xl items-center flex-col p-6 sm:p-8 bg-white shadow-2xl rounded-xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-center">Dashboard de Automação</h1>
        {isConnected && userInfo && (
            <p className="text-center text-gray-500 mb-4">Conectado como: {userInfo.pushname}</p>
        )}
        
        <p className={`text-base sm:text-lg mb-6 p-3 rounded-md text-center font-semibold ${isConnected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          Status: {statusMessage}
        </p>

        {!isConnected && qrCode && (
          <div className="flex flex-col items-center border-t pt-6 mt-6">
            <div className="w-64 h-64 sm:w-72 sm:h-72">
                <Image src={qrCode} alt="QR Code do WhatsApp" width={300} height={300} className="border-4 border-gray-300 rounded-lg w-full h-full"/>
            </div>
          </div>
        )}

        {isConnected && (
          <div className="w-full mt-6 border-t pt-6 text-center">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <Link href="/conexao" className="p-4 bg-gray-50 rounded-lg hover:bg-red-50 hover:shadow-lg transition-all transform hover:-translate-y-1">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-1">Conexão</h2>
                    <p className="text-sm text-red-600">Gerenciar</p>
                </Link>
                <Link href="/grupos" className="p-4 bg-gray-50 rounded-lg hover:bg-green-50 hover:shadow-lg transition-all transform hover:-translate-y-1">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-1">Contatos</h2>
                    <p className="text-sm text-green-600">Sincronizar</p>
                </Link>
                <Link href="/mensagens" className="p-4 bg-gray-50 rounded-lg hover:bg-purple-50 hover:shadow-lg transition-all transform hover:-translate-y-1">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-1">Conteúdo</h2>
                    <p className="text-sm text-purple-600">Mensagens</p>
                </Link>
            </div>
            
            <div className="border-t pt-8">
                <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-700">Campanha de Marketing</h2>
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
