import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RoomMember {
  id: string;
  ws: WebSocket;
  room: string;
  name: string;
  ch: number;
  lastState: any;
}

const rooms = new Map<string, Map<string, RoomMember>>();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  // WebSocket Server for Real-Time Co-op Multiplayer Rooms
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const broadcastRoomRoster = (roomCode: string) => {
    const rm = rooms.get(roomCode);
    if (!rm) return;
    const members = Array.from(rm.values()).map((m) => ({
      id: m.id,
      name: m.name,
      ch: m.ch,
      state: m.lastState,
    }));
    const payload = JSON.stringify({ t: 'roster', room: roomCode, members });
    for (const m of rm.values()) {
      if (m.ws.readyState === WebSocket.OPEN) {
        m.ws.send(payload);
      }
    }
  };

  wss.on('connection', (ws) => {
    let currentMember: RoomMember | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (!msg || !msg.t) return;

        if (msg.t === 'join') {
          const roomCode = String(msg.room || 'sapo01')
            .trim()
            .toLowerCase()
            .slice(0, 12);
          const pid = String(msg.id || Math.random().toString(36).slice(2, 8));

          if (currentMember && currentMember.room !== roomCode) {
            const oldRm = rooms.get(currentMember.room);
            if (oldRm) {
              oldRm.delete(currentMember.id);
              if (oldRm.size === 0) rooms.delete(currentMember.room);
              else broadcastRoomRoster(currentMember.room);
            }
          }

          if (!rooms.has(roomCode)) {
            rooms.set(roomCode, new Map());
          }
          const rm = rooms.get(roomCode)!;
          currentMember = {
            id: pid,
            ws,
            room: roomCode,
            name: String(msg.name || `Sapo-${pid.slice(0, 3).toUpperCase()}`),
            ch: Number(msg.ch) || 0,
            lastState: msg.state || null,
          };
          rm.set(pid, currentMember);
          broadcastRoomRoster(roomCode);
          return;
        }

        if (msg.t === 'leave') {
          if (currentMember) {
            const rm = rooms.get(currentMember.room);
            if (rm) {
              rm.delete(currentMember.id);
              if (rm.size === 0) rooms.delete(currentMember.room);
              else broadcastRoomRoster(currentMember.room);
            }
            currentMember = null;
          }
          return;
        }

        // Relay game events ('state', 'sh', 'room_enter', 'hit_en', 'revive', 'pacts') to all other peers in the room
        if (currentMember) {
          const rm = rooms.get(currentMember.room);
          if (!rm) return;
          if (msg.t === 'state' && msg.d) {
            currentMember.ch = Number(msg.d.ch ?? currentMember.ch);
            currentMember.lastState = msg.d;
          }
          const out = JSON.stringify({ t: msg.t, d: msg.d, from: currentMember.id });
          for (const peer of rm.values()) {
            if (peer.id !== currentMember.id && peer.ws.readyState === WebSocket.OPEN) {
              peer.ws.send(out);
            }
          }
        }
      } catch (_err) {
        // Ignore malformed packets
      }
    });

    ws.on('close', () => {
      if (currentMember) {
        const rm = rooms.get(currentMember.room);
        if (rm) {
          rm.delete(currentMember.id);
          if (rm.size === 0) {
            rooms.delete(currentMember.room);
          } else {
            const leaveMsg = JSON.stringify({ t: 'peer_left', from: currentMember.id });
            for (const peer of rm.values()) {
              if (peer.ws.readyState === WebSocket.OPEN) {
                peer.ws.send(leaveMsg);
              }
            }
            broadcastRoomRoster(currentMember.room);
          }
        }
        currentMember = null;
      }
    });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const code = String(req.params.code || '').toLowerCase();
    const rm = rooms.get(code);
    res.json({
      room: code,
      count: rm ? rm.size : 0,
      members: rm
        ? Array.from(rm.values()).map((m) => ({ id: m.id, name: m.name, ch: m.ch }))
        : [],
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Sapinhos Sapecas server & WebSocket multiplayer running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
