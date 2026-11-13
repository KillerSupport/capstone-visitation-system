import './node-runtime.cjs';
import express from 'express';
import { createServer, request as requestBackend } from 'node:http';
import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';

const backendPort = Number(process.env.PREVIEW_BACKEND_PORT || 4001);
const previewPort = Number(process.env.PREVIEW_PORT || 4100);
const frontendDirectory = fileURLToPath(new URL('../frontend/dist/', import.meta.url));
const app = express();

app.use('/api', (request, response) => {
  const requestHeaders = { ...request.headers };
  delete requestHeaders['x-forwarded-for'];
  const upstream = requestBackend({
    hostname: '127.0.0.1',
    port: backendPort,
    path: request.originalUrl,
    method: request.method,
    headers: requestHeaders,
  }, result => {
    const headers = { ...result.headers };
    if (headers['set-cookie']) {
      headers['set-cookie'] = headers['set-cookie'].map(cookie => /;\s*Secure(?:;|$)/i.test(cookie) ? cookie : `${cookie}; Secure`);
    }
    response.writeHead(result.statusCode || 502, headers);
    result.pipe(response);
  });
  upstream.on('error', () => {
    if (!response.headersSent) response.status(502).json({ error: 'The application server is unavailable.' });
    else response.destroy();
  });
  request.on('aborted', () => upstream.destroy());
  request.pipe(upstream);
});

app.use(express.static(frontendDirectory));
app.get('*', (_request, response) => response.sendFile('index.html', { root: frontendDirectory }));

const server = createServer(app);
server.on('upgrade', (request, socket, head) => {
  const path = new URL(request.url || '/', 'http://localhost').pathname;
  if (path !== '/ws' && path !== '/hardware') {
    socket.destroy();
    return;
  }
  const upstream = connect(backendPort, '127.0.0.1', () => {
    let headers = '';
    for (let index = 0; index < request.rawHeaders.length; index += 2) {
      headers += `${request.rawHeaders[index]}: ${request.rawHeaders[index + 1]}\r\n`;
    }
    upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n${headers}\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  socket.on('error', () => upstream.destroy());
  socket.on('close', () => upstream.destroy());
  upstream.on('error', () => socket.destroy());
  upstream.on('close', () => socket.destroy());
});

server.listen(previewPort, '127.0.0.1', () => {
  console.log(`Public preview origin ready at http://127.0.0.1:${previewPort}`);
});
