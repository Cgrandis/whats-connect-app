const prisma = require('../../lib/prisma');

/**
 * Processa o conteúdo de um CSV e salva os contatos no banco de dados.
 * @param {string} csvContent - O conteúdo completo do arquivo CSV como uma string.
 * @param {object} io - A instância do Socket.IO para enviar feedback.
 */
async function importContactsFromContent(csvContent, io) {
  console.log(`[IMPORT] Iniciando importação de conteúdo CSV...`);
  io.emit('import-status', 'Lendo arquivo...');

  try {
    const rows = csvContent.split('\n').filter(row => row.trim() !== '');
    const header = rows.shift() || ''; 
    
    console.log(`[IMPORT] Processando ${rows.length} linhas de dados...`);
    io.emit('import-status', `Processando ${rows.length} linhas...`);

    const existingContacts = await prisma.contact.findMany({
        select: { number: true },
    });
    const existingNumbers = new Set(existingContacts.map(c => c.number));

    const allContactsFromCsv = rows.map(row => {
        const columns = row.split(',');
        const number = columns[0]?.trim();
        const name = columns[1]?.trim() || '';

        if (!number || !/^\d+$/.test(number)) {
            console.warn(`[IMPORT] Linha ignorada (número inválido): "${row}"`);
            return null;
        }
        return { number, pushname: name };
    }).filter(Boolean);

    const newContactsToCreate = allContactsFromCsv.filter(
        contact => !existingNumbers.has(contact.number)
    );

    if (newContactsToCreate.length === 0) {
        io.emit('import-status', '✅ Importação concluída! Nenhum contato novo para adicionar.');
        return;
    }

    const result = await prisma.contact.createMany({
        data: newContactsToCreate,
    });

    const successMsg = `Importação concluída! ${result.count} novos contatos foram adicionados à sua Lista de Marketing.`;
    console.log(`[IMPORT] ${successMsg}`);
    io.emit('import-status', `✅ ${successMsg}`);

  } catch (error) {
    console.error('[IMPORT] Erro crítico durante a importação:', error);
    io.emit('import-status', '🚨 Erro durante a importação. Verifique o terminal.');
  }
}

module.exports = { importContactsFromContent };
