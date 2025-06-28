// src/lib/prisma.js
const { PrismaClient } = require('@prisma/client');

// Exporta uma única instância do cliente Prisma para ser usada em todo o projeto.
const prisma = new PrismaClient();

module.exports = prisma;