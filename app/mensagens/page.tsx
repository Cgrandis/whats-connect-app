// app/mensagens/page.tsx (com Melhorias de Responsividade)
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

    const handleMediaSubmit = async (e: FormEvent) => { /* ... (lógica existente) */ };
    const handleMediaDelete = (id: string) => { /* ... (lógica existente) */ };
    const handleMessageSubmit = (e: FormEvent) => { /* ... (lógica existente) */ };
    const handleEdit = (msg: Message) => { /* ... (lógica existente) */ };
    const handleCancelEdit = () => { /* ... (lógica existente) */ };
    const handleDelete = (id: string) => { /* ... (lógica existente) */ };

    return (
        <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-gray-100">
            <div className="w-full max-w-7xl bg-white shadow-2xl rounded-xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-center border-b pb-4 mb-6 gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left">Gerenciador de Conteúdo</h1>
                    <Link href="/" className="text-blue-600 hover:underline flex-shrink-0">Voltar ao Dashboard</Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Coluna da Mídia */}
                    <div className="p-4 sm:p-6 border rounded-lg bg-gray-50">
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4">Mídia da Campanha</h2>
                        <form onSubmit={handleMediaSubmit} className="space-y-4 mb-6">
                             <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                             <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700">Enviar Mídia</button>
                             {uploadFeedback && <p className="text-sm mt-2">{uploadFeedback}</p>}
                        </form>
                        <h3 className="text-lg font-semibold border-t pt-4">Mídias Salvas</h3>
                        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                           {campaignMedia.map(media => (
                               <div key={media.id} className="flex justify-between items-center p-2 bg-white rounded-md shadow-sm">
                                   <a href={media.filePath} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate text-sm">{media.filePath.split('/').pop()}</a>
                                   <button onClick={() => handleMediaDelete(media.id)} className="bg-red-500 text-white text-xs py-1 px-2 rounded hover:bg-red-600 flex-shrink-0">Deletar</button>
                               </div>
                           ))}
                        </div>
                    </div>

                    {/* Coluna das Mensagens */}
                    <div className="p-4 sm:p-6 border rounded-lg bg-gray-50">
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4">{isEditing ? 'Editando Mensagem' : 'Criar Mensagem de Texto'}</h2>
                        <form onSubmit={handleMessageSubmit} className="space-y-4">
                            <input type="text" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 border rounded"/>
                            <textarea placeholder="Corpo da mensagem" value={body} onChange={e => setBody(e.target.value)} required rows={5} className="w-full p-2 border rounded"></textarea>
                            <div className="flex gap-4">
                               <button type="submit" className="bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700">{isEditing ? 'Salvar' : 'Criar'}</button>
                               {isEditing && <button type="button" onClick={handleCancelEdit} className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600">Cancelar</button>}
                            </div>
                            {messageFeedback && <p className="text-sm mt-2">{messageFeedback}</p>}
                        </form>
                    </div>
                </div>

                {/* Lista de Mensagens */}
                <div className="mt-8">
                    <h2 className="text-2xl font-semibold border-t pt-6 mb-4">Textos Salvos</h2>
                    <div className="space-y-4">
                        {messages.map(msg => (
                            <div key={msg.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div className="flex-grow">
                                    <h3 className="font-bold text-lg">{msg.title}</h3>
                                    <p className="text-gray-700 whitespace-pre-wrap">{msg.body}</p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0 pt-2 sm:pt-0">
                                    <button onClick={() => handleEdit(msg)} className="bg-yellow-400 text-black text-sm py-1 px-3 rounded hover:bg-yellow-500">Editar</button>
                                    <button onClick={() => handleDelete(msg.id)} className="bg-red-500 text-white text-sm py-1 px-3 rounded hover:bg-red-600">Deletar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
