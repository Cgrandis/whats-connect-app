const { Server } = require('socket.io');
const fs = require('fs').promises;
const path = require('path');
const prisma = require('../lib/prisma');
const { syncContactsFromGroups } = require('./services/groupSyncService');
const { startCampaign } = require('./services/campaignService');

// Objeto de estado para manter as informações da conexão.
let whatsappState = {
  status: 'initializing',
  qrCode: null,
  userInfo: null
};

// Travas para evitar execuções simultâneas.
let isSyncRunning = false;
let isCampaignRunning = false;

function initializeSocketServer(httpServer, whatsappClient) {
    const io = new Server(httpServer, { cors: { origin: "http://localhost:3000" } });
    
    io.on('connection', (socket) => {
        console.log(`[Socket.IO] Cliente conectado: ${socket.id}. Status do WhatsApp: ${whatsappState.status}`);
        
        // Envia o estado atual imediatamente ao novo cliente para evitar race conditions.
        if (whatsappState.status === 'ready') {
            socket.emit('ready', whatsappState.userInfo);
        } else if (whatsappState.status === 'qr' && whatsappState.qrCode) {
            socket.emit('qr', whatsappState.qrCode);
        }

        // --- LÓGICA COMPLETA PARA GERENCIAMENTO DE MENSAGENS E MÍDIA ---

        // Eventos de Gerenciamento de Mensagens de Texto
        socket.on('messages:get', async () => {
            const messages = await prisma.message.findMany({ orderBy: { createdAt: 'desc' } });
            socket.emit('messages:list', messages);
        });
        socket.on('messages:create', async (data) => {
            await prisma.message.create({ data: { title: data.title, body: data.body } });
            const messages = await prisma.message.findMany({ orderBy: { createdAt: 'desc' } });
            io.emit('messages:list', messages);
        });
        socket.on('messages:update', async ({ id, data }) => {
            await prisma.message.update({ where: { id }, data: { title: data.title, body: data.body } });
            const messages = await prisma.message.findMany({ orderBy: { createdAt: 'desc' } });
            io.emit('messages:list', messages);
        });
        socket.on('messages:delete', async (id) => {
            await prisma.message.delete({ where: { id } });
            const messages = await prisma.message.findMany({ orderBy: { createdAt: 'desc' } });
            io.emit('messages:list', messages);
        });
        
        // Eventos de Gerenciamento de Mídia da Campanha
        socket.on('campaignMedia:get', async () => {
            const media = await prisma.campaignMedia.findMany({ orderBy: { createdAt: 'desc' } });
            socket.emit('campaignMedia:list', media);
        });
        socket.on('campaignMedia:create', async ({ filePath }) => {
            await prisma.campaignMedia.create({ data: { filePath } });
            const media = await prisma.campaignMedia.findMany({ orderBy: { createdAt: 'desc' } });
            io.emit('campaignMedia:list', media);
        });
        socket.on('campaignMedia:delete', async (id) => {
            const mediaToDelete = await prisma.campaignMedia.findUnique({ where: { id } });
            if (mediaToDelete) {
                const fullPath = path.join(__dirname, `../../public${mediaToDelete.filePath}`);
                try {
                    await fs.unlink(fullPath);
                } catch (err) {
                    if (err.code !== 'ENOENT') console.error(`[DELETE] Falha ao deletar arquivo: ${err.message}`);
                }
                await prisma.campaignMedia.delete({ where: { id } });
                const media = await prisma.campaignMedia.findMany({ orderBy: { createdAt: 'desc' } });
                io.emit('campaignMedia:list', media);
            }
        });

        // --- LÓGICA COMPLETA PARA OUTRAS FUNCIONALIDADES ---

        socket.on('whatsapp:logout', async () => {
            console.log('[WHATSAPP] Comando de logout recebido.');
            try {
                await whatsappClient.logout(); await whatsappClient.destroy();
            } catch (error) {
                console.error('[WHATSAPP] Erro durante o logout/destroy:', error.message);
            }
            const sessionPath = path.join(__dirname, '../../.wwebjs_auth');
            try {
                await fs.rm(sessionPath, { recursive: true, force: true });
            } catch (error) {
                console.error('[AUTH] Erro ao remover pasta de sessão:', error);
            }
            whatsappState = { status: 'initializing', qrCode: null, userInfo: null };
            whatsappClient.initialize();
        });

        socket.on('start-campaign', async () => {
            if (isCampaignRunning) return;
            isCampaignRunning = true;
            await startCampaign(whatsappClient, io);
            isCampaignRunning = false;
        });

        socket.on('get-all-groups', async () => {
            try {
                const chats = await whatsappClient.getChats();
                const groups = chats.filter(c => c.isGroup).map(c => ({ id: c.id._serialized, name: c.name, participantCount: c.participants.length }));
                socket.emit('all-groups-list', groups);
            } catch (error) {
                console.error('[GROUPS] Erro ao buscar lista de grupos:', error);
            }
        });

        socket.on('sync-selected-groups', async (ids) => {
            if (isSyncRunning) return;
            isSyncRunning = true;
            await syncContactsFromGroups(whatsappClient, ids, io);
            isSyncRunning = false;
        });

        socket.on('disconnect', () => console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`));
    });

    // --- Listeners do WhatsApp atualizam o objeto de estado global ---
    whatsappClient.on('qr', (qr) => {
        whatsappState = { status: 'qr', qrCode: qr, userInfo: null };
        io.emit('qr', qr);
    });
    whatsappClient.on('ready', () => {
        whatsappState = { status: 'ready', qrCode: null, userInfo: whatsappClient.info };
        io.emit('ready', whatsappClient.info);
    });
    whatsappClient.on('disconnected', (reason) => {
        whatsappState = { status: 'disconnected', qrCode: null, userInfo: null };
        io.emit('disconnected', reason);
    });
}

module.exports = { initializeSocketServer };
