const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Encontra e remove contatos com números duplicados, mantendo apenas o registro mais antigo.
 * @returns {Promise<number>} O número de registros duplicados que foram removidos.
 */
async function cleanDuplicateContacts() {
  console.log('[CLEANUP] Iniciando verificação de contatos duplicados...');

  const query = `
    DELETE FROM "Contact"
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM "Contact"
      GROUP BY number
    );
  `;
  
  try {
    const registrosDeletados = await prisma.$executeRawUnsafe(query);

    if (registrosDeletados > 0) {
      console.log(`[CLEANUP] Limpeza concluída! ✅ ${registrosDeletados} registros de contatos duplicados foram removidos.`);
    } else {
      console.log(`[CLEANUP] Nenhuma duplicata encontrada. O banco de dados está limpo!`);
    }
    return registrosDeletados;
  } catch (error) {
    console.error('[CLEANUP] Erro ao executar a limpeza de duplicatas:', error);
    throw error;
  }
}

if (require.main === module) {
  console.log('Executando script de limpeza de forma manual...');
  cleanDuplicateContacts()
    .catch((e) => {
      console.error('Ocorreu um erro durante a execução do script:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { cleanDuplicateContacts };
