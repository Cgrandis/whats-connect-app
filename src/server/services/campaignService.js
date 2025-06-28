// src/server/services/campaignService.js
const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const prisma = require('../../lib/prisma');

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function startCampaign(client, io) {
    console.log('\n[CAMPANHA] INICIANDO CAMPANHA DE ENVIO AUTOMÁTICO...');
    io.emit('campaign-status', 'Campanha iniciada! Acompanhe o progresso.');
  
    try {
      const messages = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../mensagens', 'mensgens.json'), 'utf-8'));
      const media = MessageMedia.fromFilePath(path.join(__dirname, '../../../public', 'promos', 'base_timewise_MK.png'));
      const contactsToSend = await prisma.contact.findMany({ where: { campaignSentAt: null } });
  
      if (contactsToSend.length === 0) {
          io.emit('campaign-status', 'Nenhum contato novo encontrado.');
          return;
      }
      
      io.emit('campaign-status', `${contactsToSend.length} contatos na fila.`);
  
      for (let i = 0; i < contactsToSend.length; i++) {
        const contact = contactsToSend[i];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        io.emit('campaign-status', `Enviando para ${contact.number} (${i + 1}/${contactsToSend.length})...`);
        
        await client.sendMessage(`${contact.number}@c.us`, media, { caption: randomMessage.mensagem });
        await prisma.contact.update({ where: { id: contact.id }, data: { campaignSentAt: new Date() } });
        
        const randomDelay = Math.floor(Math.random() * (90000 - 30000 + 1)) + 30000;
        io.emit('campaign-status', `Pausa de ${Math.round(randomDelay / 1000)}s.`);
        await sleep(randomDelay);
      }
      
      io.emit('campaign-status', '🎉 Campanha finalizada com sucesso!');
    } catch (error) {
      console.error('[CAMPANHA] Erro crítico na campanha:', error);
      io.emit('campaign-status', '🚨 Erro crítico na campanha.');
    }
}

module.exports = { startCampaign };