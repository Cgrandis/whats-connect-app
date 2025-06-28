// app/page.tsx (VERSÃO FINAL COM LINK PARA GERENCIADOR DE GRUPOS)
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link'; // Importa o componente Link
import { io, Socket } from 'socket.io-client';
import Image from 'next/image';

// Instância única do socket, criada fora do componente para persistir
const socket: Socket = io('http://localhost:3001', {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
});

export default function HomePage() {
  const [status, setStatus] = useState<string>('Aguardando conexão...');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [campaignStatus, setCampaignStatus] = useState<string>('');
  const [isCampaignRunning, setIsCampaignRunning] = useState<boolean>(false);

  useEffect(() => {
    // Conecta o socket se ainda não estiver conectado
    if (!socket.connected) {
        socket.connect();
    }

    // Funções de callback para os eventos do socket
    const onReady = () => {
      setStatus('Conectado ao WhatsApp!');
      setQrCode(null);
      setIsConnected(true);
      setCampaignStatus('');
    };

    const onQr = (qrDataUrl: string) => {
      setStatus('Por favor, escaneie o QR Code.');
      setQrCode(qrDataUrl);
      setIsConnected(false);
    };
    
    const onDisconnected = (reason: string) => {
        setStatus(`Desconectado: ${reason}`);
        setIsConnected(false);
        setCampaignStatus('');
    };

    const onCampaignStatus = (message: string) => {
        setCampaignStatus(message);
        setIsCampaignRunning(message.includes('iniciada') || message.includes('andamento') || message.includes('Enviando'));
    };
    
    // Adiciona os listeners de eventos
    socket.on('ready', onReady);
    socket.on('qr', onQr);
    socket.on('disconnected', onDisconnected);
    socket.on('campaign-status', onCampaignStatus);

    // Função de limpeza que remove os listeners ao desmontar/recarregar
    return () => {
      socket.off('ready', onReady);
      socket.off('qr', onQr);
      socket.off('disconnected', onDisconnected);
      socket.off('campaign-status', onCampaignStatus);
    };
  }, []);

  // Função para iniciar a campanha
  const handleStartCampaign = () => {
    if (socket) {
      socket.emit('start-campaign');
      setCampaignStatus('Comando para iniciar campanha enviado...');
      setIsCampaignRunning(true);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24 bg-gray-100 text-gray-800">
      <div className="z-10 w-full max-w-2xl items-center justify-between font-mono text-sm lg:flex flex-col p-8 bg-white shadow-2xl rounded-xl">
        <h1 className="text-3xl font-bold mb-4 text-center">Dashboard de Automação</h1>
        <p className={`text-lg mb-6 p-3 rounded-md text-center font-semibold ${isConnected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          Status: {status}
        </p>

        {!isConnected && qrCode && (
          <div className="flex flex-col items-center border-t pt-6 mt-6">
            <Image src={qrCode} alt="QR Code do WhatsApp" width={300} height={300} className="border-4 border-gray-300 rounded-lg"/>
          </div>
        )}

        {isConnected && (
          <div className="w-full mt-6 border-t pt-6 text-center">
            
            {/* INSERÇÃO DO LINK PARA A PÁGINA DE GERENCIAMENTO DE GRUPOS */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Sincronização de Contatos</h2>
                <p className="text-gray-600 mb-4">Acesse a página de gerenciamento para salvar ou atualizar os contatos de seus grupos.</p>
                <Link href="/grupos" className="text-lg font-semibold text-green-700 hover:text-green-800 bg-green-100 py-3 px-5 rounded-lg inline-block transition-all shadow-sm hover:shadow-md">
                    Gerenciar Grupos 
                </Link>
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
