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
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-[#D9D9D9] text-[#020F59]">
      <div className="w-full max-w-7xl bg-white/80 backdrop-blur-lg border border-white/50 shadow-2xl rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-center border-b pb-4 mb-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left">Gerenciador de Contatos</h1>
            <Link href="/" className="text-[#0540F2] hover:underline flex-shrink-0">Voltar ao Dashboard</Link>
        </div>

        {!isConnected ? (
          <p className="text-center text-lg text-red-800 bg-red-100 p-4 rounded-xl border border-red-200">
            WhatsApp não está conectado. Por favor, volte ao Dashboard para conectar.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           
            <div className="p-4 sm:p-6 border rounded-xl bg-gray-50/80 flex flex-col">
                <h2 className="text-xl sm:text-2xl font-semibold mb-4">Sincronizar de Grupos</h2>
                <div className="flex flex-col lg:flex-row items-center gap-3 mb-4">
                  <select 
                    value={selectedDropdownGroup} 
                    onChange={(e) => setSelectedDropdownGroup(e.target.value)} 
                    disabled={isLoading} 
                    className="w-full lg:flex-grow p-3 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0540F2]"
                  >
                    {isLoading ? <option>Carregando...</option> : allGroups.length > 0 ? allGroups.map(g => (<option key={g.id} value={g.id}>{g.name} ({g.participantCount})</option>)) : <option>Nenhum grupo encontrado</option>}
                  </select>
                  <button 
                    onClick={handleAddGroup} 
                    className="w-full lg:w-auto bg-gray-700 text-white font-semibold py-3 px-5 rounded-md hover:bg-[#020F59] transition-colors flex-shrink-0"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex-grow mb-4">
                    <h3 className="text-lg font-semibold mb-2">Grupos para Sincronizar ({groupsToSync.length})</h3>
                    <div className="min-h-[12rem] max-h-64 overflow-y-auto border rounded-lg p-2 bg-white space-y-2">
                        {groupsToSync.length === 0 ? <p className="text-gray-500 text-center py-8">Nenhum grupo adicionado.</p> : groupsToSync.map(g => (<div key={g.id} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-100"><span>{g.name}</span><button onClick={() => handleRemoveGroup(g.id)} className="text-red-600 hover:text-red-800 text-sm font-semibold">Remover</button></div>))}
                    </div>
                </div>
                <div className="flex flex-col items-center text-center border-t pt-4">
                    <button onClick={handleSyncClick} disabled={groupsToSync.length === 0} className="w-full bg-[#0528F2] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#0540F2] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">Sincronizar {groupsToSync.length} Grupo(s)</button>
                    {syncStatus && <p className="mt-2 text-sm text-gray-600 w-full"><b>Status:</b> {syncStatus}</p>}
                </div>
            </div>
       
            <div className="p-4 sm:p-6 border rounded-xl bg-gray-50/80 flex flex-col">
                <h2 className="text-xl sm:text-2xl font-semibold mb-4">Importar de Arquivo</h2>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                    <p className="font-semibold">Carregue um arquivo `.csv`.</p>
                    <p>Formato: `numero,nome` (o nome é opcional).</p>
                    <p>Ex: `5544999998888,Carlos`</p>
                </div>
                <form onSubmit={handleImportSubmit} className="space-y-4 flex-grow flex flex-col">
                    <div className="flex-grow">
                        <input type="file" accept=".csv" onChange={e => setImportFile(e.target.files ? e.target.files[0] : null)} required className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-[#DFF24B] file:text-[#020F59] hover:file:bg-opacity-80 transition-colors cursor-pointer"/>
                    </div>
                    <button type="submit" disabled={!importFile} className="w-full bg-[#0528F2] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#0540F2] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">Importar Contatos do Arquivo</button>
                </form>
                {importStatus && (
                    <p className="mt-4 text-md text-gray-700 bg-gray-100 p-3 rounded-lg w-full">
                        <b>Status da Importação:</b> {importStatus}
                    </p>
                )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}