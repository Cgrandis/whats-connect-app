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
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-100">
      <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl p-8">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
            <h1 className="text-3xl font-bold">Gerenciador de Conexão</h1>
            <Link href="/" className="text-blue-600 hover:underline">Voltar ao Dashboard</Link>
        </div>

        <div className="text-center">
            {isConnected && userInfo ? (
                <div>
                    <p className="text-lg p-3 rounded-md bg-green-100 text-green-800 font-semibold">
                        Status: Conectado
                    </p>
                    <div className="my-6 p-4 border rounded-md">
                        <p className="text-gray-600">Conectado como:</p>
                        <p className="text-xl font-bold">{userInfo.pushname}</p>
                        <p className="text-md text-gray-500">Número: +{userInfo.wid.user}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="bg-red-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-red-700 transition-all disabled:bg-gray-400"
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
                      <Image src={qrCode} alt="QR Code do WhatsApp" width={300} height={300} className="border-4 border-gray-300 rounded-lg"/>
                    </div>
                </div>
            ) : (
                
                <div>
                     <p className="text-lg p-3 rounded-md bg-gray-100 text-gray-800 font-semibold">
                        Status: {statusMessage}
                    </p>
                    <p className="my-4 text-gray-700">Aguarde enquanto o sistema prepara a conexão...</p>
                    
                </div>
            )}
        </div>
      </div>
    </main>
  );
}

