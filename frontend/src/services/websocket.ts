// Real-time WebSocket Client for BJMP Imus City Jail Visitation System

export type WebSocketStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';

export interface WebSocketEvent<T = any> {
  type: string;
  payload: T;
  timestamp: string;
}

type EventListener<T = any> = (payload: T) => void;

class RealtimeWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private status: WebSocketStatus = 'DISCONNECTED';
  private statusListeners: Set<(status: WebSocketStatus) => void> = new Set();
  private eventListeners: Map<string, Set<EventListener>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15;
  private reconnectInterval = 3000;
  private pingIntervalId: any = null;
  private identifiedUser: { userId?: string; role?: string } | null = null;

  constructor() {
    // Uses the same configured backend port as the REST client.
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
    const backendPort = import.meta.env.VITE_BACKEND_PORT || '4001';
    this.url = `${isHttps ? 'wss:' : 'ws:'}//${host}:${backendPort}/ws`;
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('CONNECTING');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('CONNECTED');
        console.log('[WebSocket] 🟢 Connected to BJMP Imus Operations Server');

        // Re-identify if user was logged in
        if (this.identifiedUser) {
          this.identify(this.identifiedUser.userId, this.identifiedUser.role);
        }

        // Setup ping heartbeat
        this.setupHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketEvent = JSON.parse(event.data);
          this.handleEvent(data.type, data.payload);
        } catch (err) {
          console.warn('[WebSocket] Received non-JSON frame:', event.data);
        }
      };

      this.ws.onclose = (event) => {
        this.cleanupHeartbeat();
        console.warn(`[WebSocket] 🔴 Connection closed (code: ${event.code})`);
        if (event.code !== 1008) this.attemptReconnect();
        else this.setStatus('DISCONNECTED');
      };

      this.ws.onerror = (err) => {
        console.error('[WebSocket] Socket error:', err);
        // On error, onclose is usually called right after
      };
    } catch (err) {
      console.error('[WebSocket] Exception during connect:', err);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('DISCONNECTED');
      console.warn('[WebSocket] Maximum reconnect attempts reached. Operating in offline/cached mode.');
      return;
    }

    this.setStatus('RECONNECTING');
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * Math.pow(1.2, this.reconnectAttempts), 15000);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private setStatus(newStatus: WebSocketStatus) {
    this.status = newStatus;
    this.statusListeners.forEach((cb) => cb(newStatus));
  }

  private setupHeartbeat() {
    this.cleanupHeartbeat();
    this.pingIntervalId = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 25000);
  }

  private cleanupHeartbeat() {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  public identify(userId?: string, role?: string) {
    this.identifiedUser = { userId, role };
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) { this.connect(); return; }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'IDENTIFY',
        userId,
        role: role || 'VISITOR',
      }));
    }
  }

  public onStatusChange(callback: (status: WebSocketStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  public on<T = any>(eventType: string, callback: EventListener<T>): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(callback);
    return () => {
      this.eventListeners.get(eventType)?.delete(callback);
    };
  }

  private handleEvent(eventType: string, payload: any) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`[WebSocket] Error in handler for ${eventType}:`, e);
        }
      });
    }
  }

  public getStatus(): WebSocketStatus {
    return this.status;
  }
}

export const realtimeWS = new RealtimeWebSocketService();

