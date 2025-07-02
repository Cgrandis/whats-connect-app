const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const prisma = require('../../lib/prisma');

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function startCampaign(client, io) {    
    io.emit('campaign-status', 'Campanha iniciada! Verificando dados...');
  
    try {
      const [contactsToSend, allMessages, allMedia] = await Promise.all([
        prisma.contact.findMany({ where: { campaignSentAt: null } }),
        prisma.message.findMany(),
        prisma.campaignMedia.findMany()
      ]);

      if (allMessages.length === 0) {
        io.emit('campaign-status', 'Erro: Nenhuma mensagem de texto foi cadastrada.');
        return;
      }
      if (contactsToSend.length === 0) {
        io.emit('campaign-status', 'Nenhum contato novo encontrado para a campanha.');
        return;
      }
      
      console.log(`[CAMPANHA] ${contactsToSend.length} contatos, ${allMessages.length} textos e ${allMedia.length} mídias na fila.`);
      io.emit('campaign-status', `${contactsToSend.length} contatos na fila.`);
  
      for (let i = 0; i < contactsToSend.length; i++) {
        const contact = contactsToSend[i];
        const chatId = `${contact.number}@c.us`;

        const randomMessage = allMessages[Math.floor(Math.random() * allMessages.length)];
        let mediaToSend = null;
        
        if (allMedia.length > 0) {
            const randomMedia = allMedia[Math.floor(Math.random() * allMedia.length)];            
           
            const sanitizedPath = randomMedia.filePath.replace(/^\/?public\//, '');            

            const mediaPath = path.join(__dirname, '../../../public', sanitizedPath);
                        
            if (fs.existsSync(mediaPath)) {
                mediaToSend = MessageMedia.fromFilePath(mediaPath);
            } else {
                console.warn(`[AVISO] Arquivo de mídia não encontrado no caminho: ${mediaPath}`);
            }
        }
        
        io.emit('campaign-status', `Enviando para ${contact.number} (${i + 1}/${contactsToSend.length})...`);
        
        try {
            if (mediaToSend) {
                await client.sendMessage(chatId, mediaToSend, { caption: randomMessage.body });
            } else {
                await client.sendMessage(chatId, randomMessage.body);
            }
            await prisma.contact.update({ where: { id: contact.id }, data: { campaignSentAt: new Date() } });

        } catch (sendError) {
            console.error(`[CAMPANHA] ERRO ao enviar para ${contact.number}:`, sendError.message);
        }

        const randomDelay = Math.floor(Math.random() * (90000 - 30000 + 1)) + 30000;
        io.emit('campaign-status', `Pausa de ${Math.round(randomDelay / 1000)}s.`);
        await sleep(randomDelay);
      }
      
      io.emit('campaign-status', '🎉 Campanha finalizada com sucesso!');
    } catch (error) {
      console.error('[CAMPANHA] Erro crítico na campanha:', error);
      io.emit('campaign-status', '🚨 Erro crítico na campanha. Verifique o terminal.');
    }
}

module.exports = { startCampaign };
