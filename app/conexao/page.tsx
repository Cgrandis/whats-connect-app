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
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-[#D9D9D9]">
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-lg border border-white/50 shadow-2xl rounded-2xl p-6 sm:p-8 text-[#020F59]">
        <div className="flex flex-col sm:flex-row justify-between items-center border-b pb-4 mb-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left">Gerenciador de Conexão</h1>
            <Link href="/" className="text-[#0540F2] hover:underline flex-shrink-0 transition-colors">Voltar ao Dashboard</Link>
        </div>

        <div className="text-center">
            {isConnected && userInfo ? (
                <div className="space-y-6">
                    <p className="text-lg p-3 rounded-xl bg-green-100 border border-green-200 text-green-800 font-semibold">
                        Status: Conectado
                    </p>
                    <div className="my-6 p-4 border rounded-lg bg-gray-50">
                        <p className="text-gray-500">Conectado como:</p>
                        <p className="text-xl sm:text-2xl font-bold text-[#020F59] break-words">{userInfo.pushname}</p>
                        <p className="text-md text-gray-500">Número: +{userInfo.wid.user}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full sm:w-auto bg-red-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-red-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg"
                    >
                        {isLoggingOut ? 'Desconectando...' : 'Desconectar e Trocar de Número'}
                    </button>
                </div>
            ) : qrCode ? (
                <div>
                    <p className="text-lg p-3 rounded-xl bg-yellow-100 border border-yellow-300 text-yellow-800 font-semibold">
                        Status: Aguardando Conexão
                    </p>
                    <p className="my-4 text-gray-600">Abra o WhatsApp no seu celular e escaneie o código abaixo.</p>
                    <div className="flex justify-center">
                      <div className="p-2 bg-white rounded-lg shadow-inner">
                        <Image src={qrCode} alt="QR Code do WhatsApp" width={300} height={300} className="w-full h-full"/>
                      </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                     <p className="text-lg p-3 rounded-xl bg-gray-200 border border-gray-300 text-gray-700 font-semibold">
                        Status: {statusMessage}
                    </p>
                    <p className="my-4 text-gray-600">Aguarde enquanto o sistema prepara a conexão...</p>
                    <div className="flex justify-center items-center h-24">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#0528F2]"></div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </main>
  );
}
