const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const prisma = require('../../lib/prisma');

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

let campaignState = {
  status: 'idle',
};

function pauseCampaign() {
  if (campaignState.status === 'running') {
    console.log('[CONTROLE] Campanha pausada pelo usuário.');
    campaignState.status = 'paused';
  }
}
function resumeCampaign() {
  if (campaignState.status === 'paused') {
    console.log('[CONTROLE] Campanha reiniciada pelo usuário.');
    campaignState.status = 'running';
  }
}
function cancelCampaign() {
  if (campaignState.status === 'running' || campaignState.status === 'paused') {
    console.log('[CONTROLE] Cancelamento da campanha solicitado.');
    campaignState.status = 'cancelling';
  }
}

async function startCampaign(client, io, options = { target: 'database' }) {
  if (campaignState.status !== 'idle') {
    io.emit('campaign-status', 'Erro: Uma campanha já está em andamento ou pausada.');
    return;
  }
  
  campaignState.status = 'running';
  io.emit('campaign-status', 'Campanha iniciada! Buscando contatos alvo...');
  io.emit('campaign-state-change', campaignState.status); 

  try {
    let contactsToSend = [];
    
    if (options.target === 'whatsapp') {
      console.log('[CAMPANHA] Alvo: Todos os contatos do WhatsApp.');
      const allWaContacts = await client.getContacts();
      const validWaContacts = allWaContacts.filter(c => !c.isGroup && c.number && c.isWAContact);
      const sentContacts = await prisma.contact.findMany({
        where: { campaignSentAt: { not: null } },
        select: { number: true }
      });
      const sentNumbers = new Set(sentContacts.map(c => c.number));
      contactsToSend = validWaContacts.filter(c => !sentNumbers.has(c.number));
    } else {
      console.log('[CAMPANHA] Alvo: Contatos da Lista de Marketing (Banco de Dados).');
      contactsToSend = await prisma.contact.findMany({
        where: { campaignSentAt: null },
      });
    }

    const [allMessages, allMedia] = await Promise.all([
      prisma.message.findMany(),
      prisma.campaignMedia.findMany()
    ]);

    if (allMessages.length === 0 || contactsToSend.length === 0) {
        const errorMsg = allMessages.length === 0 ? 'Nenhuma mensagem cadastrada.' : 'Nenhum contato novo para o alvo selecionado.';
        io.emit('campaign-status', `Erro: ${errorMsg}`);
        campaignState.status = 'idle';
        io.emit('campaign-state-change', campaignState.status);
        return;
    }
    
    console.log(`[CAMPANHA] ${contactsToSend.length} contatos encontrados para o alvo selecionado.`);
    io.emit('campaign-status', `${contactsToSend.length} contatos na fila.`);

    for (let i = 0; i < contactsToSend.length; i++) {
      while (campaignState.status === 'paused') { await sleep(2000); }
      if (campaignState.status === 'cancelling') { break; }
      
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
          }
      }
      
      io.emit('campaign-status', `Enviando para ${contact.number} (${i + 1}/${contactsToSend.length})...`);
      
      try {
          if (mediaToSend) {
              await client.sendMessage(chatId, mediaToSend, { caption: randomMessage.body });
          } else {
              await client.sendMessage(chatId, randomMessage.body);
          }
          
          await prisma.contact.upsert({
              where: { number: contact.number },
              update: { campaignSentAt: new Date() },
              create: { number: contact.number, pushname: contact.pushname || '', campaignSentAt: new Date() }
          });

          await prisma.sentMessageLog.create({
            data: {
              contactNumber: contact.number,
              messageTitle: randomMessage.title,
            }
          });
      } catch (sendError) {
          console.error(`[CAMPANHA] ERRO ao enviar para ${contact.number}:`, sendError.message);
      }

      const randomDelay = Math.floor(Math.random() * (90000 - 30000 + 1)) + 30000;
      io.emit('campaign-status', `Pausa de ${Math.round(randomDelay / 1000)}s.`);
      await sleep(randomDelay);
    }
  } catch (error) {
    console.error('[CAMPANHA] Erro crítico na campanha:', error);
    io.emit('campaign-status', '🚨 Erro crítico na campanha. Verifique o terminal.');
  } finally {
    console.log('[CAMPANHA] Loop finalizado.');
    campaignState.status = 'idle';
    io.emit('campaign-state-change', campaignState.status);
    io.emit('campaign-status', 'Campanha finalizada ou cancelada.');
  }
}

module.exports = { startCampaign, pauseCampaign, resumeCampaign, cancelCampaign, campaignState };
