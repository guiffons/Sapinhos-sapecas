/**
 * Real Online Co-op Multiplayer Manager for Sapinhos Sapecas
 * Uses WebRTC DataChannels via PeerJS for online internet play,
 * coupled with BroadcastChannel for instant local / multi-tab synchronization.
 */

import { Peer, DataConnection } from 'peerjs';

export interface NetPlayerState {
  id: string;
  name: string;
  ch: number;
  x: number;
  y: number;
  z: number;
  ang: number;
  w: number;
  hp: number;
  mh: number;
  dead: boolean;
  revP: number;
  puff: number;
  wf: number;
  f24: number;
  its: number[];
  dm: number;
}

export type NetMessage =
  | { type: 'join'; from: string; state: NetPlayerState }
  | { type: 'welcome'; from: string; state: NetPlayerState; seed: number; bIdx: number; gx: number; gy: number }
  | { type: 'state'; from: string; state: NetPlayerState }
  | { type: 'shoot'; from: string; x: number; y: number; a: number; w: number; oid: string; col?: string }
  | { type: 'jump'; from: string; x: number; y: number; z: number }
  | { type: 'hit_enemy'; from: string; enemyId: number; dmg: number; kx: number; ky: number }
  | { type: 'revive'; from: string; targetId: string }
  | { type: 'dungeon_sync'; from: string; bIdx: number; gx: number; gy: number; seed: number; clear: boolean }
  | { type: 'ping'; from: string; time: number }
  | { type: 'pong'; from: string; time: number };

export interface NetworkCallbacks {
  onPartnerConnect: (partner: NetPlayerState, isHost: boolean) => void;
  onPartnerDisconnect: () => void;
  onPartnerState: (state: NetPlayerState) => void;
  onPartnerShoot: (data: { x: number; y: number; a: number; w: number; oid: string; col?: string }) => void;
  onPartnerJump: (data: { x: number; y: number; z: number }) => void;
  onPartnerHitEnemy: (data: { enemyId: number; dmg: number; kx: number; ky: number }) => void;
  onPartnerRevive: (targetId: string) => void;
  onDungeonSync: (data: { bIdx: number; gx: number; gy: number; seed: number; clear: boolean }) => void;
  onStatusChange: (status: 'disconnected' | 'connecting' | 'connected', msg: string) => void;
}

export class OnlineCoopManager {
  myId: string;
  roomCode: string = '';
  isHost: boolean = false;
  connected: boolean = false;
  partnerState: NetPlayerState | null = null;
  status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  statusMsg: string = 'Desconectado';

  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private bc: BroadcastChannel | null = null;
  private callbacks: NetworkCallbacks;
  private lastSendTime = 0;
  private pingInterval: any = null;
  public pingMs: number = 0;

  constructor(callbacks: NetworkCallbacks) {
    this.myId = 'sapo_' + Math.random().toString(36).slice(2, 9);
    this.callbacks = callbacks;
  }

  joinRoom(rawCode: string, localState: NetPlayerState) {
    this.disconnect();
    const clean = rawCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 16) || 'brejo';
    this.roomCode = clean;
    this.status = 'connecting';
    this.statusMsg = `Conectando à sala [${clean.toUpperCase()}]...`;
    this.callbacks.onStatusChange(this.status, this.statusMsg);

    // 1. Setup local BroadcastChannel for multi-tab / zero-latency local play
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.bc = new BroadcastChannel(`sapinhos_room_${clean}`);
        this.bc.onmessage = (e) => {
          this.handleIncomingMessage(e.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported', err);
      }
    }

    // 2. Setup PeerJS WebRTC Connection for real online internet play
    const hostPeerId = `sapo-online-host-${clean}`;
    const guestPeerId = `sapo-online-guest-${clean}-${Math.random().toString(36).slice(2, 6)}`;

    try {
      // First, attempt to become the room host
      const hostPeer = new Peer(hostPeerId, {
        debug: 0,
      });

      hostPeer.on('open', (id) => {
        this.peer = hostPeer;
        this.isHost = true;
        this.statusMsg = `Sala [${clean.toUpperCase()}] aberta! Aguardando parceiro...`;
        this.callbacks.onStatusChange('connecting', this.statusMsg);

        hostPeer.on('connection', (c) => {
          this.setupDataConnection(c, localState);
        });

        // Broadcast join announce over BC as well
        this.broadcast({ type: 'join', from: this.myId, state: localState });
      });

      hostPeer.on('error', (err: any) => {
        // If host ID is already taken, someone is hosting! Connect as guest!
        if (err.type === 'unavailable-id') {
          hostPeer.destroy();
          this.connectAsGuest(clean, guestPeerId, hostPeerId, localState);
        } else {
          console.warn('Peer error, trying guest fallback:', err);
          this.connectAsGuest(clean, guestPeerId, hostPeerId, localState);
        }
      });
    } catch (e) {
      console.warn('WebRTC peer initialization error, running in local channel:', e);
      this.broadcast({ type: 'join', from: this.myId, state: localState });
    }

    // Start periodic heartbeat/ping
    this.startPingLoop();
  }

  private connectAsGuest(
    room: string,
    guestId: string,
    hostPeerId: string,
    localState: NetPlayerState
  ) {
    try {
      const guestPeer = new Peer(guestId, { debug: 0 });
      this.peer = guestPeer;
      this.isHost = false;

      guestPeer.on('open', () => {
        this.statusMsg = `Conectando ao anfitrião da sala [${room.toUpperCase()}]...`;
        this.callbacks.onStatusChange('connecting', this.statusMsg);

        const connection = guestPeer.connect(hostPeerId, { reliable: true });
        this.setupDataConnection(connection, localState);

        // Also broadcast join via BroadcastChannel
        this.broadcast({ type: 'join', from: this.myId, state: localState });
      });

      guestPeer.on('error', (err) => {
        console.warn('Guest peer connection error:', err);
        // Fallback gracefully to BC
        this.broadcast({ type: 'join', from: this.myId, state: localState });
      });
    } catch (e) {
      console.warn('Guest fallback error:', e);
      this.broadcast({ type: 'join', from: this.myId, state: localState });
    }
  }

  private setupDataConnection(conn: DataConnection, localState: NetPlayerState) {
    this.conn = conn;

    conn.on('open', () => {
      this.connected = true;
      this.status = 'connected';
      this.statusMsg = `Conectado ao parceiro na sala [${this.roomCode.toUpperCase()}]!`;
      this.callbacks.onStatusChange('connected', this.statusMsg);

      // Send join message
      const msg: NetMessage = this.isHost
        ? {
            type: 'welcome',
            from: this.myId,
            state: localState,
            seed: Math.floor(Math.random() * 99999) + 1,
            bIdx: 0,
            gx: 2,
            gy: 2,
          }
        : { type: 'join', from: this.myId, state: localState };
      conn.send(msg);
      if (this.bc) this.bc.postMessage(msg);
    });

    conn.on('data', (data: any) => {
      this.handleIncomingMessage(data);
    });

    conn.on('close', () => {
      this.connected = false;
      this.partnerState = null;
      this.status = 'connecting';
      this.statusMsg = `Parceiro desconectou. Aguardando reconexão...`;
      this.callbacks.onPartnerDisconnect();
      this.callbacks.onStatusChange('connecting', this.statusMsg);
    });
  }

  private handleIncomingMessage(msg: any) {
    if (!msg || typeof msg !== 'object' || msg.from === this.myId) return;

    switch (msg.type) {
      case 'join':
      case 'welcome': {
        this.partnerState = msg.state;
        this.connected = true;
        this.status = 'connected';
        this.statusMsg = `Parceiro [${msg.state.name || 'Sapo Amigo'}] conectado!`;
        this.callbacks.onPartnerConnect(msg.state, this.isHost);
        this.callbacks.onStatusChange('connected', this.statusMsg);

        if (msg.type === 'join' && this.isHost) {
          // Reply with welcome & dungeon seed
          this.send({
            type: 'welcome',
            from: this.myId,
            state: msg.state,
            seed: msg.seed || 12345,
            bIdx: 0,
            gx: 2,
            gy: 2,
          });
        }
        if (msg.type === 'welcome') {
          this.callbacks.onDungeonSync({
            bIdx: msg.bIdx,
            gx: msg.gx,
            gy: msg.gy,
            seed: msg.seed,
            clear: true,
          });
        }
        break;
      }

      case 'state': {
        if (!this.connected) {
          this.connected = true;
          this.status = 'connected';
          this.callbacks.onPartnerConnect(msg.state, this.isHost);
        }
        this.partnerState = msg.state;
        this.callbacks.onPartnerState(msg.state);
        break;
      }

      case 'shoot': {
        this.callbacks.onPartnerShoot({
          x: msg.x,
          y: msg.y,
          a: msg.a,
          w: msg.w,
          oid: msg.oid,
          col: msg.col,
        });
        break;
      }

      case 'jump': {
        this.callbacks.onPartnerJump({
          x: msg.x,
          y: msg.y,
          z: msg.z,
        });
        break;
      }

      case 'hit_enemy': {
        this.callbacks.onPartnerHitEnemy({
          enemyId: msg.enemyId,
          dmg: msg.dmg,
          kx: msg.kx,
          ky: msg.ky,
        });
        break;
      }

      case 'revive': {
        this.callbacks.onPartnerRevive(msg.targetId);
        break;
      }

      case 'dungeon_sync': {
        this.callbacks.onDungeonSync({
          bIdx: msg.bIdx,
          gx: msg.gx,
          gy: msg.gy,
          seed: msg.seed,
          clear: msg.clear,
        });
        break;
      }

      case 'ping': {
        this.send({ type: 'pong', from: this.myId, time: msg.time });
        break;
      }

      case 'pong': {
        this.pingMs = Math.max(1, Math.round(performance.now() - msg.time));
        break;
      }
    }
  }

  send(msg: NetMessage) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(msg);
      } catch (e) {}
    }
    if (this.bc) {
      try {
        this.bc.postMessage(msg);
      } catch (e) {}
    }
  }

  broadcast(msg: NetMessage) {
    this.send(msg);
  }

  sendState(state: NetPlayerState, throttleMs = 32) {
    const nowTime = performance.now();
    if (nowTime - this.lastSendTime < throttleMs) return;
    this.lastSendTime = nowTime;
    this.send({
      type: 'state',
      from: this.myId,
      state,
    });
  }

  private startPingLoop() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.connected) {
        this.send({ type: 'ping', from: this.myId, time: performance.now() });
      }
    }, 2000);
  }

  disconnect() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.conn) {
      try {
        this.conn.close();
      } catch (e) {}
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
    if (this.bc) {
      try {
        this.bc.close();
      } catch (e) {}
      this.bc = null;
    }
    this.connected = false;
    this.partnerState = null;
    this.status = 'disconnected';
    this.statusMsg = 'Desconectado';
    this.callbacks.onStatusChange(this.status, this.statusMsg);
  }
}
