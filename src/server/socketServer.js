const { Server } = require('socket.io');
const fs = require('fs').promises;
const path = require('path');
const prisma = require('../lib/prisma');
const qrcode = require('qrcode');
const { syncContactsFromGroups } = require('./services/groupSyncService');
const { startCampaign, pauseCampaign, resumeCampaign, cancelCampaign, campaignState } = require('./services/campaignService');
const { importContactsFromContent } = require('./services/contactImportService');

let whatsappState = {
  status: 'initializing',
  qrCode: null,
  userInfo: null
};

let isSyncRunning = false;

function initializeSocketServer(httpServer, whatsappClient) {
    const io = new Server(httpServer, { cors: { origin: "http://localhost:3000" } });
    
    io.on('connection', (socket) => {
        console.log(`[Socket.IO] Cliente conectado: ${socket.id}. Status do WhatsApp: ${whatsappState.status}`);
        
        if (whatsappState.status === 'ready') socket.emit('ready', whatsappState.userInfo);
        else if (whatsappState.status === 'qr') socket.emit('qr', whatsappState.qrCode);
        if (campaignState.status !== 'idle') {
            socket.emit('campaign-state-change', campaignState.status);
        }

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

        socket.on('campaign:start', async (options) => {
            await startCampaign(whatsappClient, io, options);
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

        socket.on('contacts:import-from-content', async ({ content }) => {
            console.log(`[Socket.IO] Recebido pedido para importar contatos a partir do conteúdo do arquivo.`);
            await importContactsFromContent(content, io);
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

        socket.on('contacts:get-all', async () => {
            const allWaContacts = await whatsappClient.getContacts();
            const syncedContacts = await prisma.contact.findMany({ select: { number: true } });
            const syncedNumbers = new Set(syncedContacts.map(c => c.number));
            const formattedContacts = allWaContacts
                .filter(contact => !contact.isGroup && contact.number && contact.isWAContact) 
                .map(contact => ({
                    id: contact.id._serialized,
                    name: contact.name || null,
                    pushname: contact.pushname || '',
                    number: contact.number,
                    isSynced: syncedNumbers.has(contact.number),
                }));
            socket.emit('contacts:list', formattedContacts);
        });

        socket.on('contacts:sync-selected', async (contactsToSync) => {
            if (!contactsToSync || contactsToSync.length === 0) return;
            const dataToCreate = contactsToSync.map(c => ({ number: c.number, pushname: c.pushname }));
            const result = await prisma.contact.createMany({ data: dataToCreate, skipDuplicates: true });
            socket.emit('contacts:sync-complete', { count: result.count });
        });

        socket.on('groups:get-synced', async () => {
            const syncedGroups = await prisma.group.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
            socket.emit('groups:synced-list', syncedGroups);
        });

        socket.on('whatsapp:logout', async () => {
            try { await whatsappClient.logout(); await whatsappClient.destroy(); } catch (error) { console.error(error); }
            const sessionPath = path.join(__dirname, '../../.wwebjs_auth');
            try { await fs.rm(sessionPath, { recursive: true, force: true }); } catch (error) { console.error(error); }
            whatsappState = { status: 'initializing', qrCode: null, userInfo: null };
            whatsappClient.initialize();
        });

        socket.on('logs:get', async () => {
            console.log('[LOGS] Recebido pedido para buscar logs de envio e respostas detalhadas.');
            try {
                const [allSentLogs, allReplyLogs] = await Promise.all([
                    prisma.sentMessageLog.findMany({ orderBy: { sentAt: 'desc' } }),
                    prisma.replyLog.findMany({ orderBy: { repliedAt: 'desc' } })
                ]);

                const sentDailyCounts = allSentLogs.reduce((acc, log) => {
                    const dateKey = log.sentAt.toISOString().split('T')[0];
                    acc[dateKey] = (acc[dateKey] || 0) + 1;
                    return acc;
                }, {});
                const formattedSentLogs = Object.entries(sentDailyCounts).map(([date, count]) => ({ date, count }));
                
                socket.emit('logs:data', { sent: formattedSentLogs, replies: allReplyLogs });
            } catch (error) {
                console.error('[LOGS] Erro ao buscar e processar logs:', error);
            }
        });

        socket.on('disconnect', () => console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`));
    });

    whatsappClient.on('qr', async (qr) => {
        try {
            const qrCodeDataUrl = await qrcode.toDataURL(qr);
            whatsappState = { status: 'qr', qrCode: qrCodeDataUrl, userInfo: null };
            io.emit('qr', qrCodeDataUrl);
        } catch (err) { console.error(err); }
    });
    whatsappClient.on('ready', () => {
        whatsappState = { status: 'ready', qrCode: null, userInfo: whatsappClient.info };
        io.emit('ready', whatsappClient.info);
    });
    whatsappClient.on('disconnected', (reason) => {
        whatsappState = { status: 'disconnected', qrCode: null, userInfo: null };
        io.emit('disconnected', reason);
    });

    whatsappClient.on('message', async (message) => {
        if (message.fromMe) return;
        try {
            await prisma.replyLog.create({
                data: {
                    contactNumber: message.from.replace('@c.us', ''),
                    body: message.body,
                }
            });
        } catch (error) {
            console.error(`[LOGS] Erro ao registrar resposta de ${message.from}:`, error);
        }
    });
}

module.exports = { initializeSocketServer };
