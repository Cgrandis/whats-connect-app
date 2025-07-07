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

      const contactsInDb = [];
      const totalParticipants = groupChat.participants.length;

      for (let i = 0; i < totalParticipants; i++) {
        const participant = groupChat.participants[i];
        const contact = await client.getContactById(participant.id._serialized);
        const contactNumber = participant.id.user;
        const contactPushname = contact?.pushname || '';

        const dbEntry = await prisma.contact.upsert({
          where: { number: contactNumber },
          update: { pushname: contactPushname },
          create: { number: contactNumber, pushname: contactPushname },
        });
        contactsInDb.push(dbEntry);

        if ((i + 1) % 20 === 0 || (i + 1) === totalParticipants) {
          const progressMsg = `Processando "${groupChat.name}": ${i + 1} de ${totalParticipants} contatos salvos...`;
          console.log(`[SYNC] ${progressMsg}`);
          io.emit('sync-status', progressMsg);
        }
      }
      
      console.log(`[SYNC] Total de ${contactsInDb.length} contatos do grupo foram salvos/atualizados.`);

      await prisma.group.upsert({
        where: { whatsappId: groupChat.id._serialized },
        update: {
          name: groupChat.name,
          contacts: { set: contactsInDb.map(c => ({ id: c.id })) },
        },
        create: {
          name: groupChat.name,
          whatsappId: groupChat.id._serialized,
          contacts: { connect: contactsInDb.map(c => ({ id: c.id })) },
        },
      });
      console.log(`[SYNC] Grupo "${groupChat.name}" salvo e contatos vinculados.`);
    }

    console.log('\n[SYNC] Sincronização concluída!');
    io.emit('sync-status', '✅ Sincronização de grupos selecionados concluída!');

  } catch (error) {
    console.error('[SYNC] Erro durante a sincronização:', error);
    io.emit('sync-status', '🚨 Erro na sincronização. Verifique o terminal.');
  }
}

module.exports = { syncContactsFromGroups };
