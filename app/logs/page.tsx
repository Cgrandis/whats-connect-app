'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSocket } from '../../src/context/SocketContext';

interface DailyLog {
  date: string;
  count: number;
}

export default function LogsPage() {
  const { socket } = useSocket();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!socket) return;

    socket.emit('logs:get');

    const onLogsData = (data: DailyLog[]) => {
      const formattedData = data.map(log => ({
        ...log,
        date: new Date(log.date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }),
      }));
      setLogs(formattedData);
      setIsLoading(false);
    };

    socket.on('logs:data', onLogsData);

    return () => {
      socket.off('logs:data', onLogsData);
    };
  }, [socket]);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-[#0D0D0D] text-[#BFBFBF]">
      <div className="w-full max-w-4xl bg-[#1c1c1c] border border-[#403F3D] shadow-2xl shadow-black/50 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-white/10 pb-4 mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left text-[#F2F2F2]">Logs de Envio</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300 hover:underline flex-shrink-0 transition-colors">Voltar ao Dashboard</Link>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#F2F2F2]"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-[#8C8C8C] bg-[#0D0D0D]/50 p-8 rounded-xl">
                <p className="text-lg">Nenhuma mensagem foi enviada ainda.</p>
                <p className="text-sm">Inicie uma campanha para ver os registros aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#403F3D]/50">
                {logs.map((log, index) => (
                <div key={index} className="flex justify-between items-center p-4 hover:bg-white/5 transition-colors">
                    <p className="font-semibold text-lg text-[#F2F2F2]">{log.date}</p>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-white">{log.count}</p>
                        <p className="text-xs text-[#8C8C8C]">envio(s)</p>
                    </div>
                </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
