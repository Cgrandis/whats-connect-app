'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useSocket } from '../../src/context/SocketContext';

interface Message { id: string; title: string; body: string; }
interface CampaignMedia { id: string; filePath: string; }

export default function MensagensPage() {
    const { socket } = useSocket();
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [isEditing, setIsEditing] = useState<Message | null>(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    
    const [campaignMedia, setCampaignMedia] = useState<CampaignMedia[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [uploadFeedback, setUploadFeedback] = useState('');
    const [messageFeedback, setMessageFeedback] = useState('');

    useEffect(() => {
        if (!socket) return;
        
        socket.emit('messages:get');
        socket.emit('campaignMedia:get');
        
        const onMessageList = (list: Message[]) => setMessages(list);
        const onCampaignMediaList = (list: CampaignMedia[]) => setCampaignMedia(list);

        socket.on('messages:list', onMessageList);
        socket.on('campaignMedia:list', onCampaignMediaList);

        return () => {
            socket.off('messages:list', onMessageList);
            socket.off('campaignMedia:list', onCampaignMediaList);
        };
    }, [socket]);

    const handleMediaSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!socket || !file) return;
        setUploadFeedback('Enviando arquivo...');
        const formData = new FormData();
        formData.append('media', file);
        try {
            const response = await fetch('http://localhost:3001/upload', { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Falha no upload');
            
            socket.emit('campaignMedia:create', { filePath: result.filePath });
            setUploadFeedback('Upload realizado com sucesso!');
            setFile(null);
            (e.target as HTMLFormElement).reset();
        } catch (error: any) {
            setUploadFeedback(`Erro no upload: ${error.message}`);
        }
        setTimeout(() => setUploadFeedback(''), 4000);
    };

    const handleMediaDelete = (id: string) => {
        if (socket && window.confirm('Deletar esta mídia?')) {
            socket.emit('campaignMedia:delete', id);
        }
    };

    const handleMessageSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!socket) return;
        const messageData = { title, body };
        if (isEditing) {
            socket.emit('messages:update', { id: isEditing.id, data: messageData });
        } else {
            socket.emit('messages:create', messageData);
        }
        setMessageFeedback(isEditing ? 'Mensagem atualizada!' : 'Mensagem criada!');
        handleCancelEdit();
        setTimeout(() => setMessageFeedback(''), 3000);
    };

    const handleEdit = (msg: Message) => {
        setIsEditing(msg);
        setTitle(msg.title);
        setBody(msg.body);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const handleCancelEdit = () => { setIsEditing(null); setTitle(''); setBody(''); };
    const handleDelete = (id: string) => { if (socket && window.confirm('Deletar esta mensagem?')) socket.emit('messages:delete', id); };

    return (
        <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-[#0D0D0D] text-[#BFBFBF]">
            <div className="w-full max-w-7xl bg-[#1c1c1c] border border-[#403F3D] shadow-2xl shadow-black/50 rounded-2xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-center border-b border-white/10 pb-4 mb-6 gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left text-[#F2F2F2]">Gerenciador de Conteúdo</h1>
                    <Link href="/" className="text-blue-400 hover:text-blue-300 hover:underline flex-shrink-0 transition-colors">Voltar ao Dashboard</Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="p-4 sm:p-6 border border-[#403F3D]/50 rounded-xl bg-[#0D0D0D]/30">
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-[#F2F2F2]">Mídia da Campanha</h2>
                        <form onSubmit={handleMediaSubmit} className="space-y-4 mb-6">
                             <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required className="w-full text-sm text-[#BFBFBF] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border file:border-[#403F3D] file:font-semibold file:bg-[#403F3D]/50 file:text-[#F2F2F2] hover:file:bg-[#403F3D] transition-colors cursor-pointer"/>
                             <button type="submit" disabled={!file} className="w-full bg-[#403F3D] text-white font-bold py-2 px-4 rounded-md hover:bg-[#8C8C8C] disabled:bg-[#403F3D]/50 disabled:text-[#8C8C8C] transition-colors">Enviar Mídia</button>
                             {uploadFeedback && <p className="text-sm mt-2 text-center">{uploadFeedback}</p>}
                        </form>
                        <h3 className="text-lg font-semibold border-t border-white/10 pt-4 text-[#F2F2F2]">Mídias Salvas</h3>
                        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-2">
                           {campaignMedia.length === 0 ? <p className="text-center text-[#8C8C8C] py-4">Nenhuma mídia salva.</p> : campaignMedia.map(media => (
                               <div key={media.id} className="flex justify-between items-center p-2 bg-[#1c1c1c] border border-[#403F3D]/50 rounded-md shadow-sm">
                                   <a href={media.filePath} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate text-sm">{media.filePath.split('/').pop()}</a>
                                   <button onClick={() => handleMediaDelete(media.id)} className="bg-red-800/70 text-white text-xs py-1 px-2 rounded hover:bg-red-700 flex-shrink-0">Deletar</button>
                               </div>
                           ))}
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 border border-[#403F3D]/50 rounded-xl bg-[#0D0D0D]/30">
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-[#F2F2F2]">{isEditing ? 'Editando Mensagem' : 'Criar Mensagem de Texto'}</h2>
                        <form onSubmit={handleMessageSubmit} className="space-y-4">
                            <input type="text" placeholder="Título (para sua referência)" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-3 bg-[#0D0D0D] border border-[#403F3D] rounded-md text-[#F2F2F2] focus:outline-none focus:ring-2 focus:ring-[#8C8C8C]"/>
                            <textarea placeholder="Corpo da mensagem..." value={body} onChange={e => setBody(e.target.value)} required rows={5} className="w-full p-3 bg-[#0D0D0D] border border-[#403F3D] rounded-md text-[#F2F2F2] focus:outline-none focus:ring-2 focus:ring-[#8C8C8C]"></textarea>
                            <div className="flex gap-4">
                               <button type="submit" className="bg-[#F2F2F2] text-[#0D0D0D] font-bold py-2 px-4 rounded-md hover:bg-white transition-colors">{isEditing ? 'Salvar Alterações' : 'Criar Mensagem'}</button>
                               {isEditing && <button type="button" onClick={handleCancelEdit} className="bg-[#403F3D] text-white py-2 px-4 rounded-md hover:bg-[#8C8C8C] transition-colors">Cancelar</button>}
                            </div>
                            {messageFeedback && <p className="text-sm mt-2">{messageFeedback}</p>}
                        </form>
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-2xl font-semibold border-t border-white/10 pt-6 mb-4 text-[#F2F2F2]">Textos Salvos</h2>
                    <div className="space-y-4">
                        {messages.length === 0 ? <p className="text-center text-[#8C8C8C]">Nenhum texto salvo.</p> : messages.map(msg => (
                            <div key={msg.id} className="p-4 border border-[#403F3D]/50 rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4 hover:bg-white/5 transition-colors">
                                <div className="flex-grow">
                                    <h3 className="font-bold text-lg text-[#F2F2F2]">{msg.title}</h3>
                                    <p className="text-[#BFBFBF] whitespace-pre-wrap">{msg.body}</p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0 pt-2 sm:pt-0 self-start sm:self-center">
                                    <button onClick={() => handleEdit(msg)} className="bg-yellow-600/80 text-white text-sm py-1 px-3 rounded hover:bg-yellow-600">Editar</button>
                                    <button onClick={() => handleDelete(msg.id)} className="bg-red-800/70 text-white text-sm py-1 px-3 rounded hover:bg-red-700">Deletar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
