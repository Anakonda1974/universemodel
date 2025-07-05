import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('message', (msg) => {
    for (const c of clients) {
      if (c !== ws && c.readyState === ws.OPEN) {
        c.send(msg);
      }
    }
  });
  ws.on('close', () => clients.delete(ws));
});

console.log('Multiplayer server running on ws://localhost:8080');
