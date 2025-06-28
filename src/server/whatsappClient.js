// src/server/whatsappClient.js
const { Client, LocalAuth } = require('whatsapp-web.js');

console.log('[WhatsApp Client] Configurando cliente...');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

module.exports = client;