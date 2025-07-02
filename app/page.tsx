// app/page.tsx (Final, com todos os links de gerenciamento)
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSocket } from '../src/context/SocketContext';

export default function HomePage() {
  // Consome o estado global da conexão do nosso hook customizado.
  const { socket, isConnected, qrCode, statusMessage, userInfo } = useSocket();

  // O estado local é mantido apenas para o que é específico desta página.
  const [campaignStatus, setCampaignStatus] = useState<string>('');
  const [isCampaignRunning, setIsCampaignRunning] = useState<boolean>(false);

  // useEffect para ouvir eventos específicos da campanha.
  useEffect(() => {
    if (!socket) return;

    const onCampaignStatus = (message: string) => {
        setCampaignStatus(message);
        setIsCampaignRunning(message.includes('iniciada') || message.includes('andamento') || message.includes('Enviando'));
    };
    
    socket.on('campaign-status', onCampaignStatus);

    return () => {
      socket.off('campaign-status', onCampaignStatus);
    };
  }, [socket]);

  // Função para disparar a campanha.
  const handleStartCampaign = () => {
    if (socket) {
      socket.emit('start-campaign');
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
                {/* Link para Gerenciar Conexão */}
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Conexão</h2>
                    <Link href="/conexao" className="text-lg font-semibold text-red-700 hover:text-red-800 bg-red-100 py-3 px-5 rounded-lg inline-block transition-all shadow-sm hover:shadow-md">
                        Gerenciar
                    </Link>
                </div>
                {/* Link para Gerenciar Grupos */}
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Contatos</h2>
                    <Link href="/grupos" className="text-lg font-semibold text-green-700 hover:text-green-800 bg-green-100 py-3 px-5 rounded-lg inline-block transition-all shadow-sm hover:shadow-md">
                        Sincronizar
                    </Link>
                </div>
                {/* Link para Gerenciar Mensagens */}
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Conteúdo</h2>
                    <Link href="/mensagens" className="text-lg font-semibold text-purple-700 hover:text-purple-800 bg-purple-100 py-3 px-5 rounded-lg inline-block transition-all shadow-sm hover:shadow-md">
                        Mensagens
                    </Link>
                </div>
            </div>
            
            <div className="border-t pt-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Campanha de Marketing</h2>
                <button
                onClick={handleStartCampaign}
                disabled={isCampaignRunning}
                className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-blue-700 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
                >
                {isCampaignRunning ? 'Campanha em Andamento...' : 'Iniciar Campanha de Marketing'}
                </button>
                {campaignStatus && (
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
