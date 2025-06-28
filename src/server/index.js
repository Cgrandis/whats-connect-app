// src/server/index.js
console.log('--- Iniciando Servidor de Automação ---');

const whatsappClient = require('./whatsappClient');
const { initializeSocketServer } = require('./socketServer');

// Inicia o servidor Socket.IO e passa o cliente WhatsApp para ele
initializeSocketServer(whatsappClient);

// Inicia o cliente do WhatsApp
console.log('[WhatsApp Client] Inicializando...');
whatsappClient.initialize();