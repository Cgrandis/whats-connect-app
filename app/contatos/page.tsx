'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSocket } from '../../src/context/SocketContext';

interface Contact {
  id: string;
  name: string | null;
  pushname: string;
  number: string;
  isSynced: boolean;
}

const CONTACTS_PER_PAGE = 50;

export default function ContatosPage() {
  const { socket, isConnected } = useSocket();
  
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [syncStatus, setSyncStatus] = useState('');

  const fetchContacts = useCallback(() => {
    if (socket && isConnected) {
      setIsLoading(true);
      socket.emit('contacts:get-all');
    } else {
      setIsLoading(false);
    }
  }, [socket, isConnected]);

  useEffect(() => {
    fetchContacts();
    if (!socket) return;
    
    const onContactsList = (contacts: Contact[]) => {
      setAllContacts(contacts);
      setIsLoading(false);
    };
    const onSyncComplete = ({ count }: { count: number }) => {
        setSyncStatus(`✅ Sincronização concluída! ${count} novo(s) contato(s) adicionado(s).`);
        setSelectedContacts(new Set());
        fetchContacts();
        setTimeout(() => setSyncStatus(''), 5000);
    };
    const onSyncError = (message: string) => setSyncStatus(`🚨 ${message}`);

    socket.on('contacts:list', onContactsList);
    socket.on('contacts:sync-complete', onSyncComplete);
    socket.on('contacts:sync-error', onSyncError);

    return () => {
      socket.off('contacts:list', onContactsList);
      socket.off('contacts:sync-complete', onSyncComplete);
      socket.off('contacts:sync-error', onSyncError);
    };
  }, [socket, fetchContacts]);

  const filteredContacts = useMemo(() => {
    if (!searchTerm) return allContacts;
    return allContacts.filter(c =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.pushname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.number.includes(searchTerm)
    );
  }, [allContacts, searchTerm]);

  const stats = useMemo(() => {
    const syncedCount = allContacts.filter(c => c.isSynced).length;
    return {
      total: allContacts.length,
      synced: syncedCount,
      notSynced: allContacts.length - syncedCount,
    };
  }, [allContacts]);

  const paginatedContacts = filteredContacts.slice((currentPage - 1) * CONTACTS_PER_PAGE, currentPage * CONTACTS_PER_PAGE);
  const totalPages = Math.ceil(filteredContacts.length / CONTACTS_PER_PAGE);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(contactId)) newSelection.delete(contactId);
      else newSelection.add(contactId);
      return newSelection;
    });
  };

  const handleSyncSelected = () => {
    if (!socket || selectedContacts.size === 0) return;
    const contactsToSync = allContacts.filter(c => selectedContacts.has(c.id));
    setSyncStatus(`Sincronizando ${contactsToSync.length} contato(s)...`);
    socket.emit('contacts:sync-selected', contactsToSync);
  };
  
  const handleSyncAllNew = () => {
    if (!socket) return;
    const newContacts = allContacts.filter(c => !c.isSynced);
    if (newContacts.length === 0) {
        setSyncStatus('Nenhum contato novo para adicionar.');
        setTimeout(() => setSyncStatus(''), 3000);
        return;
    }
    if (window.confirm(`Você tem certeza que deseja adicionar ${newContacts.length} novo(s) contato(s) à sua lista de marketing?`)) {
        setSyncStatus(`Sincronizando todos os ${newContacts.length} novo(s) contato(s)...`);
        socket.emit('contacts:sync-selected', newContacts);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-[#0D0D0D] text-[#BFBFBF]">
      <div className="w-full max-w-7xl bg-[#1c1c1c] border border-[#403F3D] shadow-2xl shadow-black/50 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-white/10 pb-4 mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left text-[#F2F2F2]">Gerenciador de Contatos da Campanha</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300 hover:underline flex-shrink-0">Voltar ao Dashboard</Link>
        </div>

        {!isConnected ? (
          <p className="text-center text-lg text-red-400 bg-red-900/20 border border-red-500/30 p-4 rounded-xl">
            WhatsApp não está conectado.
          </p>
        ) : (
          <>
            {/* Seção de Estatísticas e Ações */}
            <div className="mb-6 p-4 border border-[#403F3D]/50 rounded-xl bg-[#0D0D0D]/30">
                <p className="text-sm text-center text-[#8C8C8C] mb-4">
                    A lista abaixo exibe apenas os contatos da sua agenda que possuem uma conta ativa no WhatsApp.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-center">
                    <div className="p-4 bg-[#0D0D0D]/50 rounded-lg"><p className="text-3xl font-bold text-white">{stats.total}</p><p className="text-sm text-[#8C8C8C]">Contatos Válidos</p></div>
                    <div className="p-4 bg-green-900/20 rounded-lg"><p className="text-3xl font-bold text-green-300">{stats.synced}</p><p className="text-sm text-green-400">Na Lista de Marketing</p></div>
                    <div className="p-4 bg-yellow-900/20 rounded-lg"><p className="text-3xl font-bold text-yellow-300">{stats.notSynced}</p><p className="text-sm text-yellow-400">Fora da Lista de Marketing</p></div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={handleSyncSelected} disabled={selectedContacts.size === 0} className="flex-1 bg-[#F2F2F2] text-[#0D0D0D] font-bold py-2 px-4 rounded-md hover:bg-white disabled:bg-[#403F3D] disabled:text-[#8C8C8C] transition-all">
                        Adicionar {selectedContacts.size} Selecionado(s)
                    </button>
                    <button onClick={handleSyncAllNew} disabled={stats.notSynced === 0} className="flex-1 bg-[#403F3D] text-white font-bold py-2 px-4 rounded-md hover:bg-[#8C8C8C] disabled:bg-[#403F3D] disabled:text-[#8C8C8C] transition-all">
                        Adicionar Todos os {stats.notSynced} Novos
                    </button>
                </div>
                {syncStatus && <p className="text-center mt-4 p-2 bg-blue-900/30 rounded-md">{syncStatus}</p>}
            </div>

            {/* Barra de Busca e Paginação */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
              <input type="text" placeholder="Buscar por nome ou número..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full sm:w-1/2 p-2 bg-[#0D0D0D] border border-[#403F3D] rounded-md text-[#F2F2F2] focus:outline-none focus:ring-2 focus:ring-[#8C8C8C]"/>
              <div className="flex items-center gap-2 text-[#F2F2F2]">
                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 bg-[#403F3D] rounded-md disabled:opacity-50">Anterior</button>
                <span>Página {currentPage} de {totalPages}</span>
                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="px-3 py-1 bg-[#403F3D] rounded-md disabled:opacity-50">Próxima</button>
              </div>
            </div>

            {/* Tabela de Contatos */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-[#0D0D0D]/50">
                  <tr>
                    <th className="p-4 text-left text-xs font-medium text-[#BFBFBF] uppercase w-12"></th>
                    <th className="p-4 text-left text-xs font-medium text-[#BFBFBF] uppercase">Nome no WhatsApp</th>
                    <th className="p-4 text-left text-xs font-medium text-[#BFBFBF] uppercase">Número</th>
                    <th className="p-4 text-left text-xs font-medium text-[#BFBFBF] uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#403F3D]/50">
                  {isLoading ? (
                    <tr><td colSpan={4} className="text-center p-8">Carregando contatos...</td></tr>
                  ) : paginatedContacts.length === 0 ? (
                    <tr><td colSpan={4} className="text-center p-8">Nenhum contato encontrado.</td></tr>
                  ) : (
                    paginatedContacts.map((contact) => (
                      <tr key={contact.id} className={`${contact.isSynced ? 'bg-green-900/10 opacity-60' : 'hover:bg-white/5'}`}>
                        <td className="p-4">
                          <input type="checkbox" disabled={contact.isSynced} checked={selectedContacts.has(contact.id)} onChange={() => handleSelectContact(contact.id)} className="h-5 w-5 rounded bg-[#403F3D] border-[#8C8C8C] text-blue-400 focus:ring-blue-500 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"/>
                        </td>
                        <td className="p-4 whitespace-nowrap text-sm font-medium text-[#F2F2F2]">{contact.pushname || contact.name || '-'}</td>
                        <td className="p-4 whitespace-nowrap text-sm text-[#BFBFBF]">{contact.number}</td>
                        <td className="p-4 whitespace-nowrap text-sm">
                          {contact.isSynced ? <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900/50 text-green-300">Na Lista</span> : <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-900/50 text-yellow-300">Fora da Lista</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
