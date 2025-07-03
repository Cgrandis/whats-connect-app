// src/server/socketServer.js (Final, Completo e Corrigido)

const { Server } = require('socket.io');
const fs = require('fs').promises;
const path = require('path');
const prisma = require('../lib/prisma');
const qrcode = require('qrcode'); // Importa a biblioteca para gerar o QR Code
const { syncContactsFromGroups } = require('./services/groupSyncService');
const { startCampaign, pauseCampaign, resumeCampaign, cancelCampaign } = require('./services/campaignService');
const { importContactsFromFile } = require('./services/contactImportService');

// Objeto de estado para manter as informações da conexão.
let whatsappState = {
  status: 'initializing',
  qrCode: null,
  userInfo: null
};

// Travas para evitar execuções simultâneas.
let isSyncRunning = false;

function initializeSocketServer(httpServer, whatsappClient) {
    const io = new Server(httpServer, { cors: { origin: "http://localhost:3000" } });
    
    io.on('connection', (socket) => {
        console.log(`[Socket.IO] Cliente conectado: ${socket.id}. Status do WhatsApp: ${whatsappState.status}`);
        
        if (whatsappState.status === 'ready') socket.emit('ready', whatsappState.userInfo);
        else if (whatsappState.status === 'qr') socket.emit('qr', whatsappState.qrCode);

        // --- CRUD de Mensagens de Texto ---
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
        
        // --- CRUD de Mídia da Campanha ---
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
                try { await fs.unlink(fullPath); } catch (err) { if (err.code !== 'ENOENT') console.error(err); }
                await prisma.campaignMedia.delete({ where: { id } });
                const media = await prisma.campaignMedia.findMany({ orderBy: { createdAt: 'desc' } });
                io.emit('campaignMedia:list', media);
            }
        });

        // --- Controles da Campanha ---
        socket.on('campaign:start', async () => {
            await startCampaign(whatsappClient, io);
        });
        socket.on('campaign:pause', () => {
            pauseCampaign();
            io.emit('campaign-state-change', 'paused');
        });
        socket.on('campaign:resume', () => {
            resumeCampaign();
            io.emit('campaign-state-change', 'running');
        });
        socket.on('campaign:cancel', () => {
            cancelCampaign();
            io.emit('campaign-state-change', 'cancelling');
        });

        // --- Importação de Contatos ---
        socket.on('contacts:import', async ({ filePath }) => {
            await importContactsFromFile(filePath, io);
        });

        // --- Outras Funcionalidades ---
        socket.on('whatsapp:logout', async () => {
            try {
                await whatsappClient.logout(); await whatsappClient.destroy();
            } catch (error) { console.error(error); }
            const sessionPath = path.join(__dirname, '../../.wwebjs_auth');
            try { await fs.rm(sessionPath, { recursive: true, force: true }); } catch (error) { console.error(error); }
            whatsappState = { status: 'initializing', qrCode: null, userInfo: null };
            whatsappClient.initialize();
        });

        socket.on('get-all-groups', async () => {
            const chats = await whatsappClient.getChats();
            const groups = chats.filter(c => c.isGroup).map(c => ({ id: c.id._serialized, name: c.name, participantCount: c.participants.length }));
            socket.emit('all-groups-list', groups);
        });

        socket.on('sync-selected-groups', async (ids) => {
            if (isSyncRunning) return;
            isSyncRunning = true;
            await syncContactsFromGroups(whatsappClient, ids, io);
            isSyncRunning = false;
        });

        socket.on('disconnect', () => console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`));
    });

    // --- Listeners do WhatsApp com a correção do QR Code ---
    whatsappClient.on('qr', async (qr) => {
        console.log('[WHATSAPP] QR Code recebido. Convertendo para DataURL...');
        try {
            const qrCodeDataUrl = await qrcode.toDataURL(qr);
            whatsappState = { status: 'qr', qrCode: qrCodeDataUrl, userInfo: null };
            io.emit('qr', qrCodeDataUrl);
        } catch (err) {
            console.error('[QR-CODE] Falha ao gerar a Data URL do QR Code:', err);
        }
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
