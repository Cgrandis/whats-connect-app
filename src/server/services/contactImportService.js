const fs = require('fs').promises;
const path = require('path');
const prisma = require('../../lib/prisma');

/**
 * Lê um arquivo CSV de contatos, processa e salva no banco de dados.
 * @param {string} tempFilePath - O caminho para o arquivo CSV temporário na pasta /public.
 * @param {object} io - A instância do Socket.IO para enviar feedback.
 */

async function importContactsFromFile(tempFilePath, io) {
  const fullPath = path.join(__dirname, `../../../public${tempFilePath}`);
  console.log(`[IMPORT] Iniciando importação do arquivo: ${fullPath}`);
  io.emit('import-status', 'Lendo arquivo...');

  try {
    const fileContent = await fs.readFile(fullPath, 'utf8');
    const rows = fileContent.split('\n').filter(row => row.trim() !== ''); // Divide por linha e remove linhas vazias

    let addedCount = 0;
    let updatedCount = 0;

    io.emit('import-status', `Processando ${rows.length} linhas...`);

    for (const row of rows) {
      const columns = row.split(',');
      const number = columns[0]?.trim();
      const name = columns[1]?.trim() || '';

      if (!number || !/^\d+$/.test(number)) {
        console.warn(`[IMPORT] Linha ignorada (número inválido): "${row}"`);
        continue;
      }
      
      const result = await prisma.contact.upsert({
        where: { number: number },
        update: { pushname: name },
        create: { number: number, pushname: name },
      });

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        addedCount++;
      } else {
        updatedCount++;
      }
    }

    await fs.unlink(fullPath);
    console.log(`[IMPORT] Arquivo temporário deletado: ${fullPath}`);

    const successMsg = `Importação concluída! ${addedCount} contatos adicionados, ${updatedCount} atualizados.`;
    console.log(`[IMPORT] ${successMsg}`);
    io.emit('import-status', `✅ ${successMsg}`);

  } catch (error) {
    console.error('[IMPORT] Erro crítico durante a importação:', error);
    io.emit('import-status', '🚨 Erro durante a importação. Verifique o terminal.');
  }
}

module.exports = { importContactsFromFile };
