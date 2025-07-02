const prisma = require('../../lib/prisma');

async function syncContactsFromGroups(client, targetGroupIds, io) {
  console.log('\n[SYNC] INICIANDO SINCRONIZAÇÃO DE GRUPOS SELECIONADOS...');
  io.emit('sync-status', 'Sincronização iniciada...');

  try {
    const chats = await client.getChats();
    const foundGroups = chats.filter(chat => chat.isGroup && targetGroupIds.includes(chat.id._serialized));
    
    io.emit('sync-status', `Encontrados ${foundGroups.length} grupos para sincronizar.`);
    
    for (const groupChat of foundGroups) {
      const statusMsg = `Processando "${groupChat.name}"...`;
      console.log(`[SYNC] ${statusMsg}`);
      io.emit('sync-status', statusMsg);

      const participantPromises = groupChat.participants.map(p => client.getContactById(p.id._serialized).then(contact => prisma.contact.upsert({ where: { number: p.id.user }, update: { pushname: contact.pushname || '' }, create: { number: p.id.user, pushname: contact.pushname || '' } })));
      const contactsInDb = await Promise.all(participantPromises);
      await prisma.group.upsert({ where: { whatsappId: groupChat.id._serialized }, update: { name: groupChat.name, contacts: { set: contactsInDb.map(c => ({ id: c.id })) } }, create: { name: groupChat.name, whatsappId: groupChat.id._serialized, contacts: { connect: contactsInDb.map(c => ({ id: c.id })) } } });
      console.log(`[SYNC] Grupo "${groupChat.name}" salvo/atualizado.`);
    }

    console.log('\n[SYNC] Sincronização concluída!');
    io.emit('sync-status', '✅ Sincronização de grupos selecionados concluída!');
  } catch (error) {
    console.error(`[SYNC] Erro durante a sincronização: `, error);
    io.emit('sync-status', '🚨 Erro na sincronização. Verifique o terminal.');
  }
}

module.exports = { syncContactsFromGroups };