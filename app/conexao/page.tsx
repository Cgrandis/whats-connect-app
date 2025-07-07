'use client';

import Link from 'next/link';
import { useSocket } from '../../src/context/SocketContext';
import Image from 'next/image';
import { useState } from 'react';

export default function ConexaoPage() {
  const { socket, isConnected, qrCode, userInfo, statusMessage } = useSocket();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    if (socket && window.confirm('Tem certeza que deseja desconectar e apagar a sessão atual?')) {
      setIsLoggingOut(true);
      socket.emit('whatsapp:logout');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-[#0D0D0D] text-[#BFBFBF]">
      <div className="w-full max-w-2xl bg-[#1c1c1c] border border-[#403F3D] shadow-2xl shadow-black/50 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-white/10 pb-4 mb-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left text-[#F2F2F2]">Gerenciador de Conexão</h1>
            <Link href="/" className="text-blue-400 hover:text-blue-300 hover:underline flex-shrink-0 transition-colors">Voltar ao Dashboard</Link>
        </div>

        <div className="text-center">
            {isConnected && userInfo ? (
                <div className="space-y-6">
                    <p className="text-lg p-3 rounded-xl bg-green-900/20 border border-green-500/30 text-green-300 font-semibold">
                        Status: Conectado
                    </p>
                    <div className="p-4 border border-white/10 rounded-lg bg-[#0D0D0D]/50">
                        <p className="text-[#8C8C8C]">Conectado como:</p>
                        <p className="text-xl sm:text-2xl font-bold text-[#F2F2F2] break-words">{userInfo.pushname}</p>
                        <p className="text-md text-[#8C8C8C]">Número: +{userInfo.wid.user}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full sm:w-auto bg-red-700/80 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-red-700 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg"
                    >
                        {isLoggingOut ? 'Desconectando...' : 'Desconectar e Trocar de Número'}
                    </button>
                </div>
            ) : qrCode ? (
                <div>
                    <p className="text-lg p-3 rounded-xl bg-yellow-900/20 border border-yellow-500/30 text-yellow-300 font-semibold">
                        Status: Aguardando Conexão
                    </p>
                    <p className="my-4 text-[#BFBFBF]">Abra o WhatsApp no seu celular e escaneie o código abaixo.</p>
                    <div className="flex justify-center">
                      <div className="p-2 bg-white rounded-lg">
                        <Image src={qrCode} alt="QR Code do WhatsApp" width={300} height={300} className="w-full h-full"/>
                      </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                     <p className="text-lg p-3 rounded-xl bg-gray-800/20 border border-gray-500/30 text-gray-300 font-semibold">
                        Status: {statusMessage}
                    </p>
                    <p className="my-4 text-[#BFBFBF]">Aguarde enquanto o sistema prepara a conexão...</p>
                    <div className="flex justify-center items-center h-24">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#F2F2F2]"></div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </main>
  );
}
