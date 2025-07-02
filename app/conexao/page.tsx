'use client';

import Link from 'next/link';
import { useSocket } from '../../src/context/SocketContext';
import Image from 'next/image';
import { useState } from 'react';

export default function ConexaoPage() {
  const { socket, isConnected, qrCode, userInfo, statusMessage } = useSocket();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    if (socket) {
      setIsLoggingOut(true);
      socket.emit('whatsapp:logout');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-gray-100">
      <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-center border-b pb-4 mb-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left">Gerenciador de Conexão</h1>
            <Link href="/" className="text-blue-600 hover:underline flex-shrink-0">Voltar ao Dashboard</Link>
        </div>

        <div className="text-center">
            {isConnected && userInfo ? (
                <div>
                    <p className="text-lg p-3 rounded-md bg-green-100 text-green-800 font-semibold">
                        Status: Conectado
                    </p>
                    <div className="my-6 p-4 border rounded-md bg-gray-50">
                        <p className="text-gray-600">Conectado como:</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-800 break-words">{userInfo.pushname}</p>
                        <p className="text-md text-gray-500">Número: +{userInfo.wid.user}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full sm:w-auto bg-red-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-red-700 transition-all disabled:bg-gray-400 transform hover:scale-105"
                    >
                        {isLoggingOut ? 'Desconectando...' : 'Desconectar e Trocar de Número'}
                    </button>
                </div>
            ) : qrCode ? (
                <div>
                    <p className="text-lg p-3 rounded-md bg-yellow-100 text-yellow-800 font-semibold">
                        Status: Aguardando Conexão
                    </p>
                    <p className="my-4 text-gray-700">Abra o WhatsApp no seu celular e escaneie o código abaixo.</p>
                    <div className="flex justify-center">
                      <div className="w-64 h-64 sm:w-80 sm:h-80">
                        <Image src={qrCode} alt="QR Code do WhatsApp" width={320} height={320} className="border-4 border-gray-300 rounded-lg w-full h-full"/>
                      </div>
                    </div>
                </div>
            ) : (
                <div>
                     <p className="text-lg p-3 rounded-md bg-gray-100 text-gray-800 font-semibold">
                        Status: {statusMessage}
                    </p>
                    <p className="my-4 text-gray-700">Aguarde enquanto o sistema prepara a conexão...</p>
                    <div className="flex justify-center items-center h-24">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </main>
  );
}
