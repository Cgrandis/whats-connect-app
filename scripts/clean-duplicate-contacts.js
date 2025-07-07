const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando script de limpeza de contatos duplicados...');

  const query = `
    DELETE FROM "Contact"
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM "Contact"
      GROUP BY number
    );
  `;

  console.log('Executando a consulta para remover duplicatas. Isso pode levar um momento...');

  const registrosDeletados = await prisma.$executeRawUnsafe(query);

  if (registrosDeletados > 0) {
    console.log(`\nLimpeza concluída! ✅`);
    console.log(`${registrosDeletados} registros de contatos duplicados foram removidos.`);
  } else {
    console.log(`\nNenhum contato duplicado encontrado. Seu banco de dados já está limpo! ✅`);
  }
}

main()
  .catch((e) => {
    console.error('Ocorreu um erro durante a execução do script:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });