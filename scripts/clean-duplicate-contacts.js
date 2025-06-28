// limpar_duplicatas.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando script de limpeza de contatos duplicados...');

  // Esta consulta SQL é o coração da operação.
  // 1. GROUP BY number: Agrupa todos os contatos pelo número de telefone.
  // 2. MIN(id): Para cada grupo de números iguais, pega o 'id' do primeiro que foi criado (o mais antigo).
  // 3. DELETE ... WHERE id NOT IN (...): Deleta todos os contatos cujo 'id' NÃO está na lista de "ids mais antigos".
  //    Isso significa que apenas a primeira ocorrência de cada número será mantida.
  const query = `
    DELETE FROM "Contact"
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM "Contact"
      GROUP BY number
    );
  `;

  console.log('Executando a consulta para remover duplicatas. Isso pode levar um momento...');

  // Usamos $executeRawUnsafe porque estamos executando um comando DELETE complexo.
  // O Prisma nos alerta para termos certeza do que estamos fazendo.
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
    // Garante que a conexão com o banco de dados seja fechada.
    await prisma.$disconnect();
  });