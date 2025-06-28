// app/grupos/page.tsx (VERSÃO COM DROPDOWN PARA SELEÇÃO DE GRUPOS)
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';

// Definindo os tipos para clareza
interface WAGroup {
  id: string;
  name: string;
  participantCount: number;
}

const socket: Socket = io('http://localhost:3001', {
    autoConnect: false,
});

export default function GruposPage() {
  const [allGroups, setAllGroups] = useState<WAGroup[]>([]);
  const [groupsToSync, setGroupsToSync] = useState<WAGroup[]>([]);
  const [selectedDropdownGroup, setSelectedDropdownGroup] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('');

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    // Pede a lista de grupos assim que a página conecta
    socket.emit('get-all-groups');

    const onAllGroupsList = (groupsFromServer: WAGroup[]) => {
      setAllGroups(groupsFromServer);
      // Define o primeiro grupo da lista como selecionado por padrão no dropdown
      if (groupsFromServer.length > 0) {
        setSelectedDropdownGroup(groupsFromServer[0].id);
      }
      setIsLoading(false);
    };

    const onSyncStatus = (message: string) => {
      setSyncStatus(message);
    };

    socket.on('all-groups-list', onAllGroupsList);
    socket.on('sync-status', onSyncStatus);

    return () => {
      socket.off('all-groups-list', onAllGroupsList);
      socket.off('sync-status', onSyncStatus);
    };
  }, []);

  const handleAddGroup = () => {
    if (!selectedDropdownGroup) return;

    // Verifica se o grupo já não foi adicionado
    const isAlreadyAdded = groupsToSync.some(g => g.id === selectedDropdownGroup);
    if (isAlreadyAdded) {
      setSyncStatus('Este grupo já foi adicionado à lista.');
      return;
    }

    const groupToAdd = allGroups.find(g => g.id === selectedDropdownGroup);
    if (groupToAdd) {
      setGroupsToSync(prevGroups => [...prevGroups, groupToAdd]);
      setSyncStatus(''); // Limpa mensagens de status antigas
    }
  };

  const handleRemoveGroup = (groupId: string) => {
    setGroupsToSync(prevGroups => prevGroups.filter(g => g.id !== groupId));
  };

  const handleSyncClick = () => {
    if (groupsToSync.length === 0) {
      setSyncStatus('Por favor, adicione pelo menos um grupo à lista de sincronização.');
      return;
    }
    const selectedGroupIds = groupsToSync.map(g => g.id);
    setSyncStatus('Enviando pedido de sincronização...');
    socket.emit('sync-selected-groups', selectedGroupIds);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-12 bg-gray-100 text-gray-800">
      <div className="w-full max-w-4xl bg-white shadow-2xl rounded-xl p-8">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
            <h1 className="text-3xl font-bold">Gerenciador de Grupos</h1>
            <Link href="/" className="text-blue-600 hover:underline">Voltar ao Dashboard</Link>
        </div>
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h2 className="font-semibold text-lg mb-2">Instruções</h2>
            <p className="text-gray-700">1. Selecione um grupo no menu dropdown.<br/>2. Clique em "Adicionar Grupo" para movê-lo para a lista de sincronização.<br/>3. Quando tiver adicionado todos os grupos desejados, clique no botão para iniciar a sincronização.</p>
        </div>

        {/* Seção de Seleção com Dropdown */}
        <div className="flex items-center gap-4 mb-6">
          <select
            value={selectedDropdownGroup}
            onChange={(e) => setSelectedDropdownGroup(e.target.value)}
            disabled={isLoading}
            className="flex-grow p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isLoading ? (
                <option>Carregando grupos...</option>
            ) : (
                allGroups.map(group => (
                    <option key={group.id} value={group.id}>
                        {group.name} ({group.participantCount} membros)
                    </option>
                ))
            )}
          </select>
          <button
            onClick={handleAddGroup}
            className="bg-blue-600 text-white font-semibold py-3 px-5 rounded-md hover:bg-blue-700 transition-colors"
          >
            Adicionar Grupo
          </button>
        </div>

        {/* Seção da Lista de Grupos para Sincronizar */}
        <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">Grupos para Sincronizar ({groupsToSync.length})</h3>
            <div className="min-h-[10rem] border rounded-lg p-4 bg-gray-50 space-y-2">
                {groupsToSync.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nenhum grupo adicionado ainda.</p>
                ) : (
                    groupsToSync.map(group => (
                        <div key={group.id} className="flex justify-between items-center p-2 bg-white rounded-md shadow-sm">
                            <span>{group.name}</span>
                            <button
                                onClick={() => handleRemoveGroup(group.id)}
                                className="text-red-500 hover:text-red-700 font-semibold"
                            >
                                Remover
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Seção de Controle */}
        <div className="flex flex-col items-center text-center border-t pt-6">
            <button
                onClick={handleSyncClick}
                disabled={groupsToSync.length === 0}
                className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-green-700 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
            >
                Sincronizar {groupsToSync.length} Grupo(s) Selecionado(s)
            </button>
            {syncStatus && (
                <p className="mt-4 text-md text-gray-600 bg-gray-100 p-3 rounded-md w-full">
                    <span className="font-bold">Status da Sincronização:</span> {syncStatus}
                </p>
            )}
        </div>
      </div>
    </main>
  );
}
