const { formidable } = require('formidable');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '../../../public/uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function handleFileUpload(req, res) {
    const form = formidable({
        uploadDir: UPLOAD_DIR,
        keepExtensions: true,
        
        filename: (name, ext, part) => {
            return `${part.originalFilename.split('.')[0]}_${Date.now()}${ext}`;
        }
    });

    form.parse(req, (err, fields, files) => {
        if (err) {
            console.error('[UPLOAD] Erro ao processar o upload:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
            return;        }

        const file = files.media[0];
        if (!file) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Nenhum arquivo enviado.' }));
            return;
        }

        const publicPath = `/public/uploads/${file.newFilename}`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ filePath: publicPath }));
        console.log(`[UPLOAD] Arquivo salvo com sucesso em: ${publicPath}`);
    });
}

module.exports = { handleFileUpload };