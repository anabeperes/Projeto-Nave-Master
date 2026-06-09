// Servidor estático mínimo, sem dependências, para rodar o painel da Navegadora.
// Uso: npm start  (ou: node server.mjs)  →  abre em http://localhost:3000
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  try {
    let caminho = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
    // Rota raiz abre direto o painel
    if (caminho === '/' || caminho === '') caminho = '/painel/index.html';

    // Impede sair da raiz do projeto (path traversal)
    const arquivo = normalize(join(ROOT, caminho));
    if (!arquivo.startsWith(ROOT)) {
      res.writeHead(403); res.end('403 Forbidden'); return;
    }

    const conteudo = await readFile(arquivo);
    const tipo = TIPOS[extname(arquivo).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': 'no-cache' });
    res.end(conteudo);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1><p>Arquivo não encontrado. Abra <a href="/">o painel</a>.</p>');
  }
});

server.listen(PORT, () => {
  console.log(`\n  Painel da Navegadora rodando em:  http://localhost:${PORT}\n`);
});
