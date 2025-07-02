console.log('--- Iniciando Servidor de Automação ---');

const http = require('http');
const whatsappClient = require('./whatsappClient');
const { initializeSocketServer } = require('./socketServer');
const { handleFileUpload } = require('./services/uploadService');

const server = http.createServer((req, res) => {
   
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/upload' && req.method.toLowerCase() === 'post') {
        handleFileUpload(req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Rota não encontrada' }));
    }
});

initializeSocketServer(server, whatsappClient);

const port = 3001;
server.listen(port, () => {
    console.log(`[HTTP Server] Servidor rodando e ouvindo na porta ${port}`);
});

console.log('[WhatsApp Client] Inicializando...');
whatsappClient.initialize();
