// app/logs/page.tsx (com Detalhes de Resposta em Acordeão)
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSocket } from '../../src/context/SocketContext';

// Tipos para os dados recebidos e processados
interface DailySentLog {
  date: string;
  count: number;
}
interface ReplyLog {
  id: string;
  contactNumber: string;
  body: string;
  repliedAt: string;
}
interface CombinedLog {
    displayDate: string;
    isoDate: string;
    sentCount: number;
    replies: ReplyLog[];
    responseRate: string;
}

export default function LogsPage() {
  const { socket } = useSocket();
  const [sentLogs, setSentLogs] = useState<DailySentLog[]>([]);
  const [replyLogs, setReplyLogs] = useState<ReplyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // Combina e agrupa os dados para exibição
  const combinedLogs = useMemo(() => {
    // Agrupa as respostas detalhadas por dia
    const dailyReplies = replyLogs.reduce((acc, log) => {
        const dateKey = new Date(log.repliedAt).toISOString().split('T')[0];
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(log);
        return acc;
    }, {} as Record<string, ReplyLog[]>);

    // Pega todas as datas únicas de envios e respostas
    const allDates = new Set([...sentLogs.map(l => l.date), ...Object.keys(dailyReplies)]);
    
    return Array.from(allDates)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => {
        const sentCount = sentLogs.find(l => l.date === date)?.count || 0;
        const repliesForDate = dailyReplies[date] || [];
        const replyCount = repliesForDate.length;
        const responseRate = sentCount > 0 ? ((replyCount / sentCount) * 100).toFixed(1) : "0.0";

        return {
          displayDate: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }),
          isoDate: date,
          sentCount,
          replies: repliesForDate, // Mantém a lista detalhada de respostas
          responseRate
        };
      });
  }, [sentLogs, replyLogs]);


  useEffect(() => {
    if (!socket) return;
    socket.emit('logs:get');

    const onLogsData = (data: { sent: DailySentLog[], replies: ReplyLog[] }) => {
      setSentLogs(data.sent || []);
      setReplyLogs(data.replies || []);
      setIsLoading(false);
    };

    socket.on('logs:data', onLogsData);
    return () => { socket.off('logs:data', onLogsData); };
  }, [socket]);

  const toggleDetails = (isoDate: string) => {
    setExpandedDate(prev => (prev === isoDate ? null : isoDate));
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-[#0D0D0D] text-[#BFBFBF]">
      <div className="w-full max-w-4xl bg-[#1c1c1c] border border-[#403F3D] shadow-2xl shadow-black/50 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-white/10 pb-4 mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left text-[#F2F2F2]">Histórico da Campanha</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300 hover:underline flex-shrink-0">Voltar ao Dashboard</Link>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#F2F2F2]"></div></div>
          ) : combinedLogs.length === 0 ? (
            <div className="text-center text-[#8C8C8C] bg-[#0D0D0D]/50 p-8 rounded-xl"><p className="text-lg">Nenhum registro encontrado.</p></div>
          ) : (
            combinedLogs.map((log) => (
              <div key={log.isoDate} className="bg-[#0D0D0D]/30 border border-[#403F3D]/50 rounded-lg overflow-hidden">
                <button onClick={() => toggleDetails(log.isoDate)} className="w-full flex flex-col sm:flex-row justify-between items-center p-4 hover:bg-white/5 transition-colors gap-4 text-left">
                    <p className="font-semibold text-lg text-[#F2F2F2]">{log.displayDate}</p>
                    <div className="flex items-center gap-4 sm:gap-6">
                        <div className="text-center"><p className="text-xl font-bold text-white">{log.sentCount}</p><p className="text-xs text-[#8C8C8C]">Envios</p></div>
                        <div className="text-center"><p className="text-xl font-bold text-green-400">{log.replies.length}</p><p className="text-xs text-[#8C8C8C]">Respostas</p></div>
                        <div className="text-center"><p className="text-xl font-bold text-blue-400">{log.responseRate}%</p><p className="text-xs text-[#8C8C8C]">Taxa</p></div>
                    </div>
                </button>
                {expandedDate === log.isoDate && (
                  <div className="border-t border-[#403F3D]/50 p-4 space-y-3 animate-in fade-in-0 bg-black/20">
                    <h4 className="font-semibold text-[#F2F2F2]">Detalhes das Respostas:</h4>
                    {log.replies.length > 0 ? (
                      log.replies.map(reply => (
                        <div key={reply.id} className="p-3 bg-[#1c1c1c] rounded-md border border-transparent hover:border-[#403F3D]">
                          <p className="text-sm font-mono text-green-400">{reply.contactNumber}</p>
                          <p className="text-white whitespace-pre-wrap">{reply.body}</p>
                        </div>
                      ))
                    ) : <p className="text-sm text-[#8C8C8C]">Nenhuma resposta registrada para este dia.</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
