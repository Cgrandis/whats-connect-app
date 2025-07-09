'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSocket } from '../../src/context/SocketContext';

interface Contact {
  id: string;
  name: string | null;
  pushname: string;
  number: string;
  isSynced: boolean;
}
type SyncFilter = 'all' | 'synced' | 'notSynced';

export default function ContatosPage() {
  const { socket, isConnected } = useSocket();
  
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAreaCode44, setFilterAreaCode44] = useState(false);
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [syncStatus, setSyncStatus] = useState('');  
  const [contactsPerPage, setContactsPerPage] = useState(50);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

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
    let contacts = allContacts;

    if (syncFilter === 'synced') {
      contacts = contacts.filter(c => c.isSynced);
    } else if (syncFilter === 'notSynced') {
      contacts = contacts.filter(c => !c.isSynced);
    }

    if (filterAreaCode44) {
      contacts = contacts.filter(c => c.number.startsWith('5544'));
    }

    if (searchTerm) {
      contacts = contacts.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.pushname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.number.includes(searchTerm)
      );
    }
    
    return contacts;
  }, [allContacts, searchTerm, filterAreaCode44, syncFilter]);

  const stats = useMemo(() => {
    const syncedCount = filteredContacts.filter(c => c.isSynced).length;
    return {
      total: filteredContacts.length,
      synced: syncedCount,
      notSynced: filteredContacts.length - syncedCount,
    };
  }, [filteredContacts]);

  const paginatedContacts = filteredContacts.slice((currentPage - 1) * contactsPerPage, currentPage * contactsPerPage);
  const totalPages = Math.ceil(filteredContacts.length / contactsPerPage);

  const selectableContactsOnPage = useMemo(() => paginatedContacts.filter(c => !c.isSynced), [paginatedContacts]);
  const selectedOnPageCount = selectableContactsOnPage.filter(c => selectedContacts.has(c.id)).length;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const allSelected = selectedOnPageCount > 0 && selectedOnPageCount === selectableContactsOnPage.length;
      const someSelected = selectedOnPageCount > 0 && selectedOnPageCount < selectableContactsOnPage.length;
      selectAllCheckboxRef.current.checked = allSelected;
      selectAllCheckboxRef.current.indeterminate = someSelected;
    }
  }, [selectedOnPageCount, selectableContactsOnPage.length]);

  const handleSelectAllOnPage = () => {
    const allSelected = selectedOnPageCount === selectableContactsOnPage.length;
    const pageContactIds = selectableContactsOnPage.map(c => c.id);
    setSelectedContacts(prev => {
      const newSelection = new Set(prev);
      if (allSelected) {
        pageContactIds.forEach(id => newSelection.delete(id));
      } else {
        pageContactIds.forEach(id => newSelection.add(id));
      }
      return newSelection;
    });
  };

  const handleItemsPerPageChange = (value: number) => {
    setContactsPerPage(value);
    setCurrentPage(1);
  };

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
    const newContacts = filteredContacts.filter(c => !c.isSynced);
    if (newContacts.length === 0) {
        setSyncStatus('Nenhum contato novo para adicionar com os filtros atuais.');
        setTimeout(() => setSyncStatus(''), 3000);
        return;
    }
    if (window.confirm(`Você tem certeza que deseja adicionar ${newContacts.length} novo(s) contato(s) (visíveis) à sua lista de marketing?`)) {
        setSyncStatus(`Sincronizando todos os ${newContacts.length} novo(s) contato(s) visíveis...`);
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
            <div className="mb-6 p-4 border border-[#403F3D]/50 rounded-xl bg-[#0D0D0D]/30">
                <p className="text-sm text-center text-[#8C8C8C] mb-4">
                    As estatísticas abaixo refletem os contatos visíveis com os filtros atuais.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-center">
                    <div className="p-4 bg-[#0D0D0D]/50 rounded-lg">
                      <p className="text-3xl font-bold text-white">{stats.total}</p>
                      <p className="text-sm text-[#8C8C8C]">Contatos Visíveis</p>
                    </div>
                    <div className="p-4 bg-green-900/20 rounded-lg">
                      <p className="text-3xl font-bold text-green-300">{stats.synced}</p>
                      <p className="text-sm text-green-400">Na Lista de Marketing</p>
                      </div>
                    <div className="p-4 bg-yellow-900/20 rounded-lg">
                      <p className="text-3xl font-bold text-yellow-300">{stats.notSynced}</p>
                      <p className="text-sm text-yellow-400">Fora da Lista de Marketing</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={handleSyncSelected} disabled={selectedContacts.size === 0} className="flex-1 bg-[#F2F2F2] text-[#0D0D0D] font-bold py-2 px-4 rounded-md hover:bg-white disabled:bg-[#403F3D] disabled:text-[#8C8C8C] transition-all">Adicionar {selectedContacts.size} Selecionado(s)</button>
                    <button onClick={handleSyncAllNew} disabled={stats.notSynced === 0} className="flex-1 bg-[#403F3D] text-white font-bold py-2 px-4 rounded-md hover:bg-[#8C8C8C] disabled:bg-[#403F3D] disabled:text-[#8C8C8C] transition-all">Adicionar Todos os {stats.notSynced} Novos Visíveis</button>
                </div>
                {syncStatus && <p className="text-center mt-4 p-2 bg-blue-900/30 rounded-md">{syncStatus}</p>}
            </div>

            <div className="space-y-4 mb-4 p-4 border border-[#403F3D]/50 rounded-xl bg-[#0D0D0D]/30">
                <input type="text" placeholder="Buscar por nome ou número..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full p-2 bg-[#1c1c1c] border border-[#403F3D] rounded-md text-[#F2F2F2] focus:outline-none focus:ring-2 focus:ring-[#8C8C8C]"/>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <fieldset className="flex items-center gap-4 p-2 border border-[#403F3D] rounded-lg">
                        <legend className="px-1 text-xs text-[#8C8C8C]">Filtrar por Status:</legend>
                        <div className="flex gap-4">
                            <div><input type="radio" id="f_all" name="syncFilter" value="all" checked={syncFilter === 'all'} onChange={() => { setSyncFilter('all'); setCurrentPage(1); }} className="mr-1"/><label htmlFor="f_all">Todos</label></div>
                            <div><input type="radio" id="f_synced" name="syncFilter" value="synced" checked={syncFilter === 'synced'} onChange={() => { setSyncFilter('synced'); setCurrentPage(1); }} className="mr-1"/><label htmlFor="f_synced">Na Lista</label></div>
                            <div><input type="radio" id="f_not" name="syncFilter" value="notSynced" checked={syncFilter === 'notSynced'} onChange={() => { setSyncFilter('notSynced'); setCurrentPage(1); }} className="mr-1"/><label htmlFor="f_not">Fora da Lista</label></div>
                        </div>
                    </fieldset>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="dddFilter" checked={filterAreaCode44} onChange={(e) => { setFilterAreaCode44(e.target.checked); setCurrentPage(1); }} className="h-5 w-5 rounded bg-[#403F3D] border-[#8C8C8C] text-blue-400 focus:ring-blue-500 cursor-pointer"/>
                      <label htmlFor="dddFilter" className="text-sm font-medium text-[#F2F2F2] cursor-pointer">Apenas DDD 44</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#8C8C8C]">Itens por pág:</span>
                      <select value={contactsPerPage} onChange={(e) => handleItemsPerPageChange(Number(e.target.value))} className="p-1 bg-[#0D0D0D] border border-[#403F3D] rounded-md text-sm">
                        <option value={50}>50</option><option value={100}>100</option><option value={150}>150</option>
                      </select>
                    </div>
                </div>
            </div>

            {/* Controles de Paginação */}
            <div className="flex justify-center items-center gap-2 text-[#F2F2F2] mb-4">
              <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="px-3 py-1 bg-[#403F3D] rounded-md disabled:opacity-50">« Início</button>
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 bg-[#403F3D] rounded-md disabled:opacity-50">‹ Anterior</button>
              <span>Página {currentPage} de {totalPages}</span>
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages} className="px-3 py-1 bg-[#403F3D] rounded-md disabled:opacity-50">Próxima ›</button>
              <button onClick={() => goToPage(totalPages)} disabled={currentPage >= totalPages} className="px-3 py-1 bg-[#403F3D] rounded-md disabled:opacity-50">Fim »</button>
            </div>
            
            {/* Tabela de Contatos */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-[#0D0D0D]/50">
                  <tr>
                    <th className="p-4 text-left text-xs font-medium text-[#BFBFBF] uppercase w-12">
                      <input type="checkbox" ref={selectAllCheckboxRef} onChange={handleSelectAllOnPage} disabled={selectableContactsOnPage.length === 0} className="h-5 w-5 rounded bg-[#403F3D] border-[#8C8C8C] text-blue-400 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"/>
                    </th>
                    <th className="p-4 text-left text-xs font-medium text-[#BFBFBF] uppercase">Nome no WhatsApp</th>
                    <th className="p-4 text-left text-xs font-medium text-[#BFBFBF] uppercase">Número</th>
                    <th className="p-4 text-left text-xs font-medium text-[#BFBFBF] uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#403F3D]/50">
                  {isLoading ? (
                    <tr><td colSpan={4} className="text-center p-8">Carregando contatos...</td></tr>
                  ) : paginatedContacts.length === 0 ? (
                    <tr><td colSpan={4} className="text-center p-8">Nenhum contato encontrado com os filtros atuais.</td></tr>
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
