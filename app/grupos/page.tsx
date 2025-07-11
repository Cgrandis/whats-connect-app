'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useSocket } from '../../src/context/SocketContext'; 

interface WAGroup {
  id: string;
  name: string;
  participantCount: number;
}

export default function GruposPage() {
  const { socket, isConnected } = useSocket();
  
  const [allGroups, setAllGroups] = useState<WAGroup[]>([]);
  const [groupsToSync, setGroupsToSync] = useState<WAGroup[]>([]);
  const [selectedDropdownGroup, setSelectedDropdownGroup] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState('');

  useEffect(() => {
    if (!socket) return;
    if (isConnected) {
      socket.emit('get-all-groups');
    } else {
      setIsLoading(false);
    }

    const onAllGroupsList = (groups: WAGroup[]) => {
      setAllGroups(groups);
      if (groups.length > 0) setSelectedDropdownGroup(groups[0].id);
      setIsLoading(false);
    };
    const onSyncStatus = (msg: string) => setSyncStatus(msg);
    const onImportStatus = (msg: string) => setImportStatus(msg);

    socket.on('all-groups-list', onAllGroupsList);
    socket.on('sync-status', onSyncStatus);
    socket.on('import-status', onImportStatus);

    return () => {
      socket.off('all-groups-list', onAllGroupsList);
      socket.off('sync-status', onSyncStatus);
      socket.off('import-status', onImportStatus);
    };
  }, [socket, isConnected]);

  const handleImportSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!socket || !importFile) {
        setImportStatus('Por favor, selecione um arquivo.');
        return;
    }
    setImportStatus('Lendo arquivo no navegador...');

    const reader = new FileReader();

    reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
            setImportStatus('Arquivo lido. Enviando conteúdo para o servidor...');
            socket.emit('contacts:import-from-content', { content });
        } else {
            setImportStatus('Erro: Não foi possível ler o conteúdo do arquivo.');
        }
    };

    reader.onerror = () => {
        setImportStatus(`Erro ao ler o arquivo: ${reader.error}`);
    };

    reader.readAsText(importFile);

    setImportFile(null);
    (e.target as HTMLFormElement).reset();
  };

  const handleAddGroup = () => {
    if (!selectedDropdownGroup) return;
    const isAlreadyAdded = groupsToSync.some(g => g.id === selectedDropdownGroup);
    if (isAlreadyAdded) {
      setSyncStatus('Este grupo já foi adicionado à lista.');
      return;
    }
    const groupToAdd = allGroups.find(g => g.id === selectedDropdownGroup);
    if (groupToAdd) {
      setGroupsToSync(prevGroups => [...prevGroups, groupToAdd]);
      setSyncStatus('');
    }
  };

  const handleRemoveGroup = (groupId: string) => {
    setGroupsToSync(prevGroups => prevGroups.filter(g => g.id !== groupId));
  };

  const handleSyncClick = () => {
    if (!socket || groupsToSync.length === 0) return;
    const selectedGroupIds = groupsToSync.map(g => g.id);
    setSyncStatus('Enviando pedido de sincronização...');
    socket.emit('sync-selected-groups', selectedGroupIds);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-[#0D0D0D] text-[#BFBFBF]">
      <div className="w-full max-w-7xl bg-[#1c1c1c] border border-[#403F3D] shadow-2xl shadow-black/50 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-white/10 pb-4 mb-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left text-[#F2F2F2]">Gerenciador de Contatos</h1>
            <Link href="/" className="text-blue-400 hover:text-blue-300 hover:underline flex-shrink-0 transition-colors">Voltar ao Dashboard</Link>
        </div>

        {!isConnected ? (
          <p className="text-center text-lg text-red-400 bg-red-900/20 border border-red-500/30 p-4 rounded-xl">
            WhatsApp não está conectado. Por favor, volte ao Dashboard para conectar.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-4 sm:p-6 border border-white/10 rounded-xl bg-[#0D0D0D]/40 flex flex-col">
                <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-[#F2F2F2]">Sincronizar de Grupos</h2>
                <div className="flex flex-col lg:flex-row items-center gap-3 mb-4">
                  <select 
                    value={selectedDropdownGroup} 
                    onChange={(e) => setSelectedDropdownGroup(e.target.value)} 
                    disabled={isLoading} 
                    className="w-full lg:flex-grow p-3 border border-[#403F3D] bg-[#0D0D0D] text-[#F2F2F2] rounded-md focus:outline-none focus:ring-2 focus:ring-[#8C8C8C]"
                  >
                    {isLoading ? <option>Carregando...</option> : allGroups.length > 0 ? allGroups.map(g => (<option key={g.id} value={g.id}>{g.name} ({g.participantCount})</option>)) : <option>Nenhum grupo encontrado</option>}
                  </select>
                  <button 
                    onClick={handleAddGroup} 
                    className="w-full lg:w-auto bg-[#403F3D] text-white font-semibold py-3 px-5 rounded-md hover:bg-[#8C8C8C] hover:text-black transition-colors flex-shrink-0"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex-grow mb-4">
                    <h3 className="text-lg font-semibold mb-2 text-[#F2F2F2]">Grupos para Sincronizar ({groupsToSync.length})</h3>
                    <div className="min-h-[12rem] max-h-64 overflow-y-auto border border-[#403F3D] rounded-lg p-2 bg-[#0D0D0D]/50 space-y-2">
                        {groupsToSync.length === 0 ? <p className="text-[#8C8C8C] text-center py-8">Nenhum grupo adicionado.</p> : groupsToSync.map(g => (<div key={g.id} className="flex justify-between items-center p-2 rounded-md bg-[#1c1c1c]"><span>{g.name}</span><button onClick={() => handleRemoveGroup(g.id)} className="text-red-400 hover:text-red-300 text-sm font-semibold">Remover</button></div>))}
                    </div>
                </div>
                <div className="flex flex-col items-center text-center border-t border-white/10 pt-4">
                    <button onClick={handleSyncClick} disabled={groupsToSync.length === 0} className="w-full bg-green-600/80 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 disabled:bg-[#403F3D] disabled:cursor-not-allowed transition-colors">Sincronizar {groupsToSync.length} Grupo(s)</button>
                    {syncStatus && <p className="mt-2 text-sm text-[#BFBFBF] w-full"><b>Status:</b> {syncStatus}</p>}
                </div>
            </div>

            <div className="p-4 sm:p-6 border border-white/10 rounded-xl bg-[#0D0D0D]/40 flex flex-col">
                <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-[#F2F2F2]">Importar de Arquivo</h2>
                <div className="mb-4 p-3 bg-[#403F3D]/30 border border-[#8C8C8C]/30 rounded-md text-sm">
                    <p className="font-semibold text-[#F2F2F2]">Carregue um arquivo `.csv`.</p>
                    <p>Formato: `numero,nome` (o nome é opcional).</p>
                    <p>Ex: `5544999998888,Carlos`</p>
                </div>
                <form onSubmit={handleImportSubmit} className="space-y-4 flex-grow flex flex-col">
                    <div className="flex-grow">
                        <input type="file" accept=".csv" onChange={e => setImportFile(e.target.files ? e.target.files[0] : null)} required className="w-full text-sm text-[#BFBFBF] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-[#403F3D] file:text-[#F2F2F2] hover:file:bg-[#8C8C8C] hover:file:text-black transition-colors"/>
                    </div>
                    <button type="submit" disabled={!importFile} className="w-full bg-[#8C8C8C] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#BFBFBF] hover:text-black disabled:bg-[#403F3D] disabled:cursor-not-allowed transition-colors">Importar Contatos do Arquivo</button>
                </form>
                {importStatus && (
                    <p className="mt-4 text-md text-[#BFBFBF] bg-black/20 p-3 rounded-lg w-full">
                        <b>Status da Importação:</b> {importStatus}
                    </p>
                )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}