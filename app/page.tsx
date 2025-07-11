'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSocket } from '../src/context/SocketContext';

interface SyncedGroup { id: string; name: string; }
type TargetType = 'database' | 'whatsapp';

const Icon = ({ path, className }: { path: string, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-8 h-8"}>
    <path fillRule="evenodd" d={path} clipRule="evenodd" />
  </svg>
);

const Modal = ({ isOpen, onClose, children }: { isOpen: boolean, onClose: () => void, children: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in-0" onClick={onClose}>
            <div className="w-full max-w-lg bg-[#1c1c1c] border border-[#403F3D] shadow-2xl rounded-2xl p-6 mx-4 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
};

export default function HomePage() { 
  const { socket, isConnected, qrCode, statusMessage, userInfo, campaignState } = useSocket();
  
  const [campaignStatus, setCampaignStatus] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetType, setTargetType] = useState<TargetType>('database');
  const [syncedGroups, setSyncedGroups] = useState<SyncedGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket) return;

    const onCampaignStatus = (msg: string) => setCampaignStatus(msg);
    const onSyncedGroupsList = (groups: SyncedGroup[]) => setSyncedGroups(groups);
    
    socket.on('campaign-status', onCampaignStatus);
    socket.on('groups:synced-list', onSyncedGroupsList);
    
    return () => {
      socket.off('campaign-status', onCampaignStatus);
      socket.off('groups:synced-list', onSyncedGroupsList);
    };
  }, [socket]);

  const openCampaignModal = () => {
    if (socket) {
      socket.emit('groups:get-synced');
      setIsModalOpen(true);
    }
  };

  const handleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(groupId)) newSelection.delete(groupId);
        else newSelection.add(groupId);
        return newSelection;
    });
  };

  const handleStartCampaign = () => {
    if (!socket) return;
    
    let options = { target: targetType, groupIds: [] as string[] };
    options.groupIds = Array.from(selectedGroups);
    
    socket.emit('campaign:start', options);
    setIsModalOpen(false);
  };
  
  const { handlePause, handleResume, handleCancel } = {
      handlePause: () => socket?.emit('campaign:pause'),
      handleResume: () => socket?.emit('campaign:resume'),
      handleCancel: () => { if (window.confirm('Tem certeza?')) socket?.emit('campaign:cancel'); }
  };

    const CampaignStatusBanner = () => {
    if (campaignState === 'running') {
      return (
        <div className="w-full p-3 mb-6 rounded-xl text-center font-semibold border bg-green-900/30 border-green-500/40 text-green-300 flex items-center justify-center gap-3 animate-pulse">
          <Icon path="M12 18.75a.75.75 0 00.75-.75V5.25a.75.75 0 00-1.5 0v12.75a.75.75 0 00.75.75zM8.25 18.75a.75.75 0 00.75-.75V5.25a.75.75 0 00-1.5 0v12.75a.75.75 0 00.75.75zM15.75 18.75a.75.75 0 00.75-.75V5.25a.75.75 0 00-1.5 0v12.75a.75.75 0 00.75.75z" className="w-5 h-5"/>
          Campanha em Andamento
        </div>
      );
    }
    if (campaignState === 'paused') {
      return (
        <div className="w-full p-3 mb-6 rounded-xl text-center font-semibold border bg-yellow-900/30 border-yellow-500/40 text-yellow-300 flex items-center justify-center gap-3">
          <Icon path="M15.75 5.25a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75zM9 5.25a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75z" className="w-5 h-5"/>
          Campanha Pausada
        </div>
      );
    }
    return null;
  };
  
  const renderCampaignControls = () => {
    const baseButtonClass = "font-bold py-3 px-6 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg";
    switch (campaignState) {
      case 'running':
        return ( <div className="flex flex-col sm:flex-row justify-center gap-4"> <button onClick={handlePause} className={`${baseButtonClass} bg-[#8C8C8C] text-white hover:bg-[#BFBFBF] hover:text-black`}>Pausar</button> <button onClick={handleCancel} className={`${baseButtonClass} bg-red-700/60 text-white hover:bg-red-700`}>Cancelar</button> </div> );
      case 'paused':
        return ( <div className="flex flex-col sm:flex-row justify-center gap-4"> <button onClick={handleResume} className={`${baseButtonClass} bg-green-600/80 text-white hover:bg-green-600`}>Continuar</button> <button onClick={handleCancel} className={`${baseButtonClass} bg-red-700/60 text-white hover:bg-red-700`}>Cancelar</button> </div> );
      case 'cancelling':
        return <p className="text-lg font-semibold text-red-400 animate-pulse">Cancelando...</p>;
      default:
        return (
          <button onClick={openCampaignModal} className={`${baseButtonClass} bg-[#F2F2F2] text-[#0D0D0D] hover:bg-white`}>
            Criar Nova Campanha
          </button>
        );
    }
  };

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-[#D9D9D9] text-[#020F59]">
        <div className="w-full max-w-3xl items-center flex-col p-6 sm:p-8 bg-white/80 backdrop-blur-lg border border-white/50 shadow-2xl rounded-2xl">
          
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-[#020F59] to-[#0540F2]">
            Dashboard de Automação
          </h1>
          {isConnected && userInfo && (
              <p className="text-center text-gray-500 mb-4">Conectado como: {userInfo.pushname}</p>
          )}
          
          <p className={`text-base sm:text-lg mb-6 p-3 rounded-xl text-center font-semibold border ${isConnected ? 'bg-green-100 border-green-200 text-green-800' : 'bg-yellow-100 border-yellow-300 text-yellow-800'}`}>
            Status: {statusMessage}
          </p>

          <div className="w-full p-3 mb-6 rounded-xl text-center font-semibold border bg-blue-50 border-blue-200 text-[#020F59] flex items-center justify-center gap-3">
            <Icon path="M12 18.75a.75.75 0 00.75-.75V5.25a.75.75 0 00-1.5 0v12.75a.75.75 0 00.75.75zM8.25 18.75a.75.75 0 00.75-.75V5.25a.75.75 0 00-1.5 0v12.75a.75.75 0 00.75.75zM15.75 18.75a.75.75 0 00.75-.75V5.25a.75.75 0 00-1.5 0v12.75a.75.75 0 00.75.75z" className={`w-5 h-5 ${campaignState === 'running' ? 'animate-pulse text-green-500' : 'text-gray-400'}`}/>
            {campaignState === 'running' ? 'Campanha em Andamento' : campaignState === 'paused' ? 'Campanha Pausada' : 'Nenhuma campanha ativa'}
          </div>

          {!isConnected && qrCode && (
            <div className="flex flex-col items-center border-t pt-6 mt-6">
              <p className="mb-4 text-gray-600">Escaneie o QR Code para conectar</p>
              <div className="p-2 bg-white rounded-lg shadow-inner">
                  <Image src={qrCode} alt="QR Code do WhatsApp" width={280} height={280} className="w-full h-full"/>
              </div>
            </div>
          )}

          {isConnected && (
            <div className="w-full mt-6 border-t pt-6 text-center">
              
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                  <Link href="/conexao" className="group p-4 bg-gray-50 rounded-xl hover:bg-white border hover:shadow-lg transition-all transform hover:-translate-y-1">
                      <Icon path="M12.23 12.23a.75.75 0 010 1.06l-2.25 2.25a.75.75 0 01-1.06-1.06l2.25-2.25a.75.75 0 011.06 0zM13.28 11.22a.75.75 0 01-1.06 0l-2.25 2.25a.75.75 0 11-1.06-1.06l2.25-2.25a.75.75 0 011.06 0zM2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm1.5 0a8.25 8.25 0 1016.5 0 8.25 8.25 0 00-16.5 0z" className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-[#0540F2] transition-colors"/>
                      <h2 className="text-lg font-semibold text-[#020F59] mb-1">Conexão</h2>
                  </Link>
                  <Link href="/grupos" className="group p-4 bg-gray-50 rounded-xl hover:bg-white border hover:shadow-lg transition-all transform hover:-translate-y-1">
                      <Icon path="M18 18.75a.75.75 0 00.75-.75V8.25a.75.75 0 00-.75-.75h-1.5a.75.75 0 000 1.5h.75v8.25a.75.75 0 00.75.75zM12.75 18.75a.75.75 0 00.75-.75V6.75a.75.75 0 00-.75-.75h-1.5a.75.75 0 000 1.5h.75v10.5a.75.75 0 00.75.75zM6 18.75a.75.75 0 00.75-.75V10.5a.75.75 0 00-.75-.75H4.5a.75.75 0 000 1.5h.75v7.5a.75.75 0 00.75.75z" className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-[#0540F2] transition-colors"/>
                      <h2 className="text-lg font-semibold text-[#020F59] mb-1">Sincronizar</h2>
                  </Link>
                  <Link href="/mensagens" className="group p-4 bg-gray-50 rounded-xl hover:bg-white border hover:shadow-lg transition-all transform hover:-translate-y-1">
                      <Icon path="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM12.75 12.75a.75.75 0 00-1.5 0v2.25a.75.75 0 001.5 0v-2.25z" className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-[#0540F2] transition-colors"/>
                      <h2 className="text-lg font-semibold text-[#020F59] mb-1">Conteúdo</h2>
                  </Link>
                  <Link href="/logs" className="group p-4 bg-gray-50 rounded-xl hover:bg-white border hover:shadow-lg transition-all transform hover:-translate-y-1">
                      <Icon path="M12 6.25a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V7a.75.75 0 01.75-.75zM12 0a12 12 0 100 24 12 12 0 000-24zM2.25 12a9.75 9.75 0 1119.5 0 9.75 9.75 0 01-19.5 0z" className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-[#0540F2] transition-colors"/>
                      <h2 className="text-lg font-semibold text-[#020F59] mb-1">Histórico</h2>
                  </Link>
                  <Link href="/contatos" className="group p-4 bg-gray-50 rounded-xl hover:bg-white border hover:shadow-lg transition-all transform hover:-translate-y-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-[#0540F2] transition-colors"><path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63A13.067 13.067 0 0112 21.75a13.067 13.067 0 01-3.386-.63.75.75 0 01-.363-.63V19.125zM17.25 21a3 3 0 01-3-3v-1.125a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75v1.125a3 3 0 01-3 3z" /></svg>
                      <h2 className="text-lg font-semibold text-[#020F59] mb-1">Contatos</h2>
                  </Link>
              </div>
              
              <div className="border-t pt-8">
                  <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-[#020F59]">Campanha de Marketing</h2>
                  <div className="min-h-[56px] flex items-center justify-center">
                      {renderCampaignControls()}
                  </div>
                  {campaignState !== 'idle' && campaignStatus && (
                      <p className="mt-4 text-md text-gray-600 bg-gray-100 p-3 rounded-lg">
                          <span className="font-bold text-[#020F59]">Atualização:</span> {campaignStatus}
                      </p>
                  )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Configuração da Campanha */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="space-y-4 text-[#020F59]">
            <h2 className="text-2xl font-bold">Configurar Campanha</h2>
            <p className="text-gray-600">Selecione o público-alvo para sua campanha de marketing.</p>
            
            <fieldset className="space-y-3 pt-4">
                <legend className="font-semibold mb-2">Enviar para:</legend>
                
                <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setTargetType('database')}>
                    <input type="radio" id="database" name="targetType" value="database" checked={targetType === 'database'} readOnly className="h-5 w-5 mt-1 text-[#0528F2] focus:ring-[#0540F2]"/>
                    <div>
                        <label htmlFor="database" className="font-semibold cursor-pointer">Lista de Marketing</label>
                        <p className="text-sm text-gray-500">Envia para todos os contatos que você salvou no seu banco de dados.</p>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setTargetType('whatsapp')}>
                    <input type="radio" id="whatsapp" name="targetType" value="whatsapp" checked={targetType === 'whatsapp'} readOnly className="h-5 w-5 mt-1 text-[#0528F2] focus:ring-[#0540F2]"/>
                    <div>
                        <label htmlFor="whatsapp" className="font-semibold cursor-pointer">Toda a Lista de Contatos do WhatsApp</label>
                        <p className="text-sm text-gray-500">Envia para todos os contatos da sua agenda (exceto os que já receberam a campanha).</p>
                    </div>
                </div>
            </fieldset>
            
            <div className="flex justify-end gap-4 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                <button onClick={handleStartCampaign} className="py-2 px-4 bg-[#0528F2] text-white font-bold rounded-md hover:bg-[#0540F2]">Iniciar Campanha</button>
            </div>
        </div>
      </Modal>
    </>
  );
}