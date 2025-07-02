// src/server/index.js (Atualizado para lidar com uploads)
console.log('--- Iniciando Servidor de Automação ---');

const http = require('http');
const whatsappClient = require('./whatsappClient');
const { initializeSocketServer } = require('./socketServer');
const { handleFileUpload } = require('./services/uploadService'); // <-- NOVO

// Cria o servidor HTTP
const server = http.createServer((req, res) => {
    // Roteador de requisições HTTP
    if (req.url === '/upload' && req.method.toLowerCase() === 'post') {
        handleFileUpload(req, res);
    } else {
        // Para qualquer outra requisição, retorna 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Rota não encontrada' }));
    }
});

// Inicia o servidor Socket.IO, anexando-o ao servidor HTTP existente
initializeSocketServer(server, whatsappClient);

// Define a porta e inicia o servidor HTTP
const port = 3001;
server.listen(port, () => {
    console.log(`[HTTP Server] Servidor rodando e ouvindo na porta ${port}`);
});

// Inicia o cliente do WhatsApp
console.log('[WhatsApp Client] Inicializando...');
whatsappClient.initialize();