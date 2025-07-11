const { formidable } = require('formidable');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function handleFileUpload(req, res) {
    const form = formidable({
        uploadDir: UPLOAD_DIR,
        keepExtensions: true,
        filename: (name, ext, part) => {
            const cleanName = part.originalFilename.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
            return `${cleanName}_${Date.now()}${ext}`;
        }
    });

    form.parse(req, (err, fields, files) => {
        if (err) {
            console.error('[UPLOAD] Erro ao processar o upload:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
            return;
        }

        const file = files.media?.[0]; 
        if (!file) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Nenhum arquivo enviado com a chave "media".' }));
            return;
        }

        const publicPath = `/uploads/${file.newFilename}`;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ filePath: publicPath }));
        console.log(`[UPLOAD] Arquivo salvo. Caminho público retornado: ${publicPath}`);
    });
}

module.exports = { handleFileUpload };
