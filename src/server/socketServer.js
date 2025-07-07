const { Server } = require('socket.io');
const fs = require('fs').promises;
const path = require('path');
const prisma = require('../lib/prisma');
const qrcode = require('qrcode');
const { syncContactsFromGroups } = require('./services/groupSyncService');
const { startCampaign, pauseCampaign, resumeCampaign, cancelCampaign } = require('./services/campaignService');
const { importContactsFromFile } = require('./services/contactImportService');

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

        socket.on('contacts:import', async ({ filePath }) => {
            await importContactsFromFile(filePath, io);
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
            console.log('[CONTACTS] Recebido pedido para buscar e comparar todos os contatos.');
            try {
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
                
                console.log(`[CONTACTS] Total de ${allWaContacts.length} contatos encontrados, ${formattedContacts.length} são contas válidas do WhatsApp.`);
                socket.emit('contacts:list', formattedContacts);
            } catch (error) {
                console.error('[CONTACTS] Erro ao buscar e comparar contatos:', error);
                socket.emit('contacts:error', 'Falha ao buscar a lista de contatos.');
            }
        });
        socket.on('contacts:sync-selected', async (contactsToSync) => {
            if (!contactsToSync || contactsToSync.length === 0) return;
            
            console.log(`[CONTACTS] Recebido pedido para sincronizar ${contactsToSync.length} contatos.`);
            try {
                // Prepara os dados para o Prisma
                const dataToCreate = contactsToSync.map(contact => ({
                    number: contact.number,
                    pushname: contact.pushname,
                }));

                // Usa createMany para inserir todos de uma vez, ignorando duplicatas.
                // Isso é muito mais rápido que um loop de upserts.
                const result = await prisma.contact.createMany({
                    data: dataToCreate,
                    skipDuplicates: true,
                });

                console.log(`[CONTACTS] Sincronização concluída. ${result.count} novos contatos adicionados.`);
                // Envia um evento de sucesso para o frontend poder atualizar a lista.
                socket.emit('contacts:sync-complete', { count: result.count });
            } catch (error) {
                console.error('[CONTACTS] Erro durante a sincronização:', error);
                socket.emit('contacts:sync-error', 'Falha ao salvar os contatos.');
            }
        });

        socket.on('groups:get-synced', async () => {
            const syncedGroups = await prisma.group.findMany({
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            });
            socket.emit('groups:synced-list', syncedGroups);
        });

        socket.on('whatsapp:logout', async () => {
            try {
                await whatsappClient.logout(); await whatsappClient.destroy();
            } catch (error) { console.error(error); }
            const sessionPath = path.join(__dirname, '../../.wwebjs_auth');
            try { await fs.rm(sessionPath, { recursive: true, force: true }); } catch (error) { console.error(error); }
            whatsappState = { status: 'initializing', qrCode: null, userInfo: null };
            whatsappClient.initialize();
        });

         socket.on('logs:get', async () => {
            console.log('[LOGS] Recebido pedido para buscar logs de envio.');
            try {
                const dailyLogs = await prisma.$queryRaw`
                    SELECT DATE(sentAt) as date, COUNT(*) as count
                    FROM "SentMessageLog"
                    GROUP BY DATE(sentAt)
                    ORDER BY DATE(sentAt) DESC
                `;
                const formattedLogs = dailyLogs.map(log => ({
                    ...log,
                    count: Number(log.count)
                }));
                socket.emit('logs:data', formattedLogs);
            } catch (error) {
                console.error('[LOGS] Erro ao buscar logs:', error);
            }
        });

        socket.on('disconnect', () => console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`));
    });

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
