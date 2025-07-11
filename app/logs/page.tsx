'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSocket } from '../../src/context/SocketContext';

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

  const combinedLogs = useMemo(() => {
    const dailyReplies = replyLogs.reduce((acc, log) => {
        const dateKey = new Date(log.repliedAt).toISOString().split('T')[0];
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(log);
        return acc;
    }, {} as Record<string, ReplyLog[]>);

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
          replies: repliesForDate,
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
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-[#D9D9D9] text-[#020F59]">
      <div className="w-full max-w-4xl bg-white/80 backdrop-blur-lg border border-white/50 shadow-2xl rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-center border-b pb-4 mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left">Histórico da Campanha</h1>
          <Link href="/" className="text-[#0540F2] hover:underline flex-shrink-0">Voltar ao Dashboard</Link>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#0528F2]"></div>
            </div>
          ) : combinedLogs.length === 0 ? (
            <div className="text-center text-gray-500 bg-gray-100 p-8 rounded-xl">
                <p className="text-lg">Nenhum registro encontrado.</p>
                <p className="text-sm">Inicie uma campanha para ver os dados aqui.</p>
            </div>
          ) : (
            combinedLogs.map((log) => (
              <div key={log.isoDate} className="bg-gray-50/80 border border-gray-200/80 rounded-lg overflow-hidden transition-all duration-300">
                <button onClick={() => toggleDetails(log.isoDate)} className="w-full flex flex-col sm:flex-row justify-between items-center p-4 hover:bg-gray-100 gap-4 text-left">
                    <p className="font-semibold text-lg text-[#020F59]">{log.displayDate}</p>
                    <div className="flex items-center gap-4 sm:gap-6">
                        <div className="text-center"><p className="text-xl font-bold text-gray-700">{log.sentCount}</p><p className="text-xs text-gray-500">Envios</p></div>
                        <div className="text-center"><p className="text-xl font-bold text-green-600">{log.replies.length}</p><p className="text-xs text-gray-500">Respostas</p></div>
                        <div className="text-center p-2 rounded-lg bg-[#DFF24B]">
                          <p className="text-xl font-bold text-[#020F59]">{log.responseRate}%</p>
                          <p className="text-xs text-[#818C2E] font-semibold">Taxa</p>
                        </div>
                    </div>
                </button>
                {expandedDate === log.isoDate && (
                  <div className="border-t border-gray-200 p-4 space-y-3 animate-in fade-in-0 bg-white">
                    <h4 className="font-semibold text-[#020F59]">Detalhes das Respostas:</h4>
                    {log.replies.length > 0 ? (
                      log.replies.map(reply => (
                        <div key={reply.id} className="p-3 bg-gray-50 rounded-md border border-gray-200">
                          <p className="text-sm font-mono text-green-700">{reply.contactNumber}</p>
                          <p className="text-gray-800 whitespace-pre-wrap">{reply.body}</p>
                        </div>
                      ))
                    ) : <p className="text-sm text-gray-500">Nenhuma resposta registrada para este dia.</p>}
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
