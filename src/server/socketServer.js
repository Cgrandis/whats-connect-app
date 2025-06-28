// src/server/socketServer.js
const http = require('http');
const { Server } = require('socket.io');
const { syncContactsFromGroups } = require('./services/groupSyncService');
const { startCampaign } = require('./services/campaignService');

// Travas para evitar execuções simultâneas
let isSyncRunning = false;
let isCampaignRunning = false;

function initializeSocketServer(whatsappClient) {
    const server = http.createServer();
    const io = new Server(server, { cors: { origin: "http://localhost:3000" } });
    const port = 3001;
    
    io.on('connection', (socket) => {
        console.log('[Socket.IO] Cliente conectado:', socket.id);

        socket.on('start-campaign', async () => {
            if (isCampaignRunning) return;
            isCampaignRunning = true;
            await startCampaign(whatsappClient, io);
            isCampaignRunning = false;
        });

        socket.on('get-all-groups', async () => {
            const chats = await whatsappClient.getChats();
            const groups = chats
                .filter(chat => chat.isGroup)
                .map(chat => ({ id: chat.id._serialized, name: chat.name, participantCount: chat.participants.length }));
            socket.emit('all-groups-list', groups);
        });

        socket.on('sync-selected-groups', async (selectedGroupIds) => {
            if (isSyncRunning) return;
            isSyncRunning = true;
            await syncContactsFromGroups(whatsappClient, selectedGroupIds, io);
            isSyncRunning = false;
        });

        socket.on('disconnect', () => console.log('[Socket.IO] Cliente desconectado:', socket.id));
    });

    // Encaminha eventos do cliente WhatsApp para todos os clientes Socket.IO
    whatsappClient.on('qr', (qr) => io.emit('qr', qr));
    whatsappClient.on('ready', () => io.emit('ready'));
    whatsappClient.on('disconnected', (reason) => io.emit('disconnected', reason));
    
    server.listen(port, () => console.log(`[Socket.IO] Servidor rodando na porta ${port}`));
}

module.exports = { initializeSocketServer };