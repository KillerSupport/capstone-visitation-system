import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import {
  initDatabase,
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUserStatus,
  getAllPdls,
  createPdl,
  getPdlFormRecords,
  savePdlFormRecord,
  getAllAppointments,
  createAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  logGateScan,
  getGateLogs,
  getIncidents,
  createIncident,
  getAnnouncements,
  createAnnouncement,
  getStats,
} from './database/db.js';

const app = express();
const PORT = process.env.PORT || 4000;
const GMAIL_EMAIL_PATTERN = /^[^\s@]+@gmail\.com$/i;
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

app.use(cors());
app.use(express.json());

// HTTP + WebSocket server
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface ConnectedClient {
  ws: WebSocket;
  id: string;
  role?: string;
  userId?: string;
}

const clients = new Set<ConnectedClient>();

export function broadcast(eventType: string, payload: any, targetUserId?: string) {
  const message = JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() });
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (!targetUserId || client.userId === targetUserId || client.role === 'ADMIN' || client.role === 'WORKER' || client.role === 'GUARD') {
        client.ws.send(message);
      }
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  const client: ConnectedClient = { ws, id: `client-${Date.now()}-${Math.random().toString(36).substring(7)}` };
  clients.add(client);

  ws.send(JSON.stringify({
    type: 'CONNECTED',
    payload: {
      clientId: client.id,
      message: 'Secure WebSocket link established with BJMP Imus City Jail Operations Server.',
      serverTime: new Date().toISOString(),
      activeClientsCount: clients.size,
    }
  }));

  ws.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'IDENTIFY') {
        client.userId = msg.userId;
        client.role = msg.role;
      } else if (msg.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
      }
    } catch (_) {}
  });

  ws.on('close', () => { clients.delete(client); });
});

// ─── REST Endpoints ───────────────────────────────────────────────────────────

// Health check
app.get('/api/health', async (_req, res) => {
  const stats = await getStats();
  res.json({
    status: 'ONLINE',
    service: 'BJMP Imus City Jail Fullstack Realtime API',
    database: 'MySQL via XAMPP',
    websocketClients: clients.size,
    stats,
    timestamp: new Date().toISOString(),
  });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (!GMAIL_EMAIL_PATTERN.test(String(email).trim())) return res.status(400).json({ error: 'Only @gmail.com email accounts can sign in.' });

    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Account not found. Please register or verify credentials.' });

    const cleanPass = password.trim();
    const ok = user.password === cleanPass;

    if (!ok) return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    res.json({ success: true, user });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim();
    const password = String(req.body.password || '');
    if (!GMAIL_EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Registration requires a valid @gmail.com email address.' });
    if (!STRONG_PASSWORD_PATTERN.test(password)) return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.' });
    const newUser = await createUser(req.body);
    broadcast('USER_REGISTERED', newUser);
    broadcast('STATS_UPDATED', await getStats());
    res.status(201).json({ success: true, user: newUser });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Registration failed' });
  }
});

// Users
app.get('/api/users', async (_req, res) => { res.json(await getAllUsers()); });

app.get('/api/users/:id', async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.patch('/api/users/:id/status', async (req, res) => {
  try {
    const { status, officerName } = req.body;
    const updated = await updateUserStatus(req.params.id, status, officerName);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    broadcast('USER_STATUS_UPDATED', updated, updated.id);
    broadcast('STATS_UPDATED', await getStats());
    res.json({ success: true, user: updated });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PDLs
app.get('/api/pdls', async (_req, res) => { res.json(await getAllPdls()); });

app.post('/api/pdls', async (req, res) => {
  try {
    const pdl = await createPdl(req.body);
    broadcast('PDL_ADDED', pdl);
    broadcast('STATS_UPDATED', await getStats());
    res.status(201).json({ success: true, pdl });
  } catch (e: any) { res.status(400).json({ error: e.message || 'Failed to add PDL record' }); }
});

app.put('/api/pdls/:id', async (req, res) => {
  try {
    const pdl = await createPdl({ ...req.body, id: req.params.id });
    broadcast('PDL_UPDATED', pdl);
    broadcast('STATS_UPDATED', await getStats());
    res.json({ success: true, pdl });
  } catch (e: any) { res.status(400).json({ error: e.message || 'Failed to save PDL record' }); }
});

app.get('/api/pdl-form-records', async (req, res) => {
  res.json(await getPdlFormRecords(typeof req.query.pdlId === 'string' ? req.query.pdlId : undefined));
});

app.put('/api/pdl-form-records/:pdlId/:recordType', async (req, res) => {
  try {
    const record = await savePdlFormRecord({ ...req.body, pdlId: req.params.pdlId, recordType: req.params.recordType });
    broadcast('PDL_FORM_SAVED', record);
    res.json({ success: true, record });
  } catch (e: any) { res.status(400).json({ error: e.message || 'Failed to save PDL form record' }); }
});

// Appointments
app.get('/api/appointments', async (_req, res) => { res.json(await getAllAppointments()); });

app.post('/api/appointments', async (req, res) => {
  try {
    const appt = await createAppointment(req.body);
    broadcast('APPOINTMENT_CREATED', appt);
    broadcast('STATS_UPDATED', await getStats());
    res.status(201).json({ success: true, appointment: appt });
  } catch (e: any) { res.status(400).json({ error: e.message || 'Failed to book appointment' }); }
});

app.patch('/api/appointments/:id/status', async (req, res) => {
  try {
    const updated = await updateAppointmentStatus(req.params.id, req.body.status);
    if (!updated) return res.status(404).json({ error: 'Appointment not found' });
    broadcast('APPOINTMENT_STATUS_UPDATED', updated);
    broadcast('STATS_UPDATED', await getStats());
    res.json({ success: true, appointment: updated });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/appointments/:id', async (req, res) => {
  await deleteAppointment(req.params.id);
  broadcast('APPOINTMENT_DELETED', { id: req.params.id });
  broadcast('STATS_UPDATED', await getStats());
  res.json({ success: true });
});

// Gate Scan
app.post('/api/gate/scan', async (req, res) => {
  try {
    const log = await logGateScan(req.body);
    broadcast('GATE_SCAN_EVENT', {
      scanLog: log,
      userId: req.body.userId,
      visitorName: req.body.visitorName,
      action: req.body.action,
      message: req.body.action === 'ADMITTED'
        ? `🟢 Gate 1: Visitor ${req.body.visitorName} officially admitted.`
        : `🔴 Gate 1: Entry deferred for ${req.body.visitorName}.`,
    });
    broadcast('STATS_UPDATED', await getStats());
    res.json({ success: true, log });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/gate/logs', async (_req, res) => { res.json(await getGateLogs()); });

// Incidents
app.get('/api/incidents', async (_req, res) => { res.json(await getIncidents()); });

app.post('/api/incidents', async (req, res) => {
  try {
    const inc = await createIncident(req.body);
    broadcast('SECURITY_INCIDENT_REPORTED', inc);
    res.status(201).json({ success: true, incident: inc });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Announcements
app.get('/api/announcements', async (_req, res) => { res.json(await getAnnouncements()); });

app.post('/api/announcements', async (req, res) => {
  try {
    const ann = await createAnnouncement(req.body);
    broadcast('ANNOUNCEMENT_BROADCAST', ann);
    res.status(201).json({ success: true, announcement: ann });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Stats
app.get('/api/stats', async (_req, res) => { res.json(await getStats()); });

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    console.log('🔌 Connecting to XAMPP MySQL database...');
    await initDatabase();
    console.log('✅ MySQL database ready (bjmp_visitation)');

    server.listen(PORT, () => {
      console.log(`\n===================================================================`);
      console.log(`🏛️  BJMP Imus City Jail Backend & Real-Time WebSocket Server`);
      console.log(`📡  HTTP REST API  : http://localhost:${PORT}`);
      console.log(`⚡  WebSocket      : ws://localhost:${PORT}/ws`);
      console.log(`🗄️  Database       : MySQL (XAMPP) → bjmp_visitation`);
      console.log(`===================================================================\n`);
    });
  } catch (err: any) {
    console.error('\n❌ Failed to connect to MySQL. Make sure XAMPP is running!\n', err.message);
    process.exit(1);
  }
}

start();
