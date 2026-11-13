import {incidentRouter,validateIncident} from './incidents.js';
import {staffRouter} from './staff.js';
import 'dotenv/config';
import {geographyRouter} from './geography.js';
import { requireApprovedWorkerVisit, saveVisitorFingerprint, visitorRecordsRouter } from './visitor-records.js';
import { accountChangesRouter } from './account-changes.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes, { auth as authenticate, admin as requireAdmin, worker as requireWorker, hashPass, resolveSocketSession,hasDuty,requireDuty } from './auth.js';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { FINGERPRINT_ENABLED } from '../shared/hardware-features.js';
import {
  pool,
  initDatabase,
  getAllUsers,
  getUserById,
  hashLegacyPasswords,
  getAllPdls,
  createPdl,
  getNextPropertyReceiptNumber,
  getPdlFormRecords,
  savePdlFormRecord,
  getIncidents,
  createIncident,
  getAnnouncements,
  createAnnouncement,
} from './database/db.js';

const app = express();
const PORT = process.env.PORT || 4001;
app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      connectSrc: ["'self'", (process.env.APP_ORIGIN || 'http://localhost:3000').replace(/^http/, 'ws')],
    },
  },
}));
app.use(cors({ origin: process.env.APP_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/account-changes', accountChangesRouter);
app.use('/api/geography', geographyRouter);

// HTTP + WebSocket server
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });
const hardwareWss = new WebSocketServer({ noServer: true });

interface ConnectedClient {
  ws: WebSocket;
  id: string;
  role?: string;
  userId?: string;
  sessionId?: string;
}

const clients = new Set<ConnectedClient>();

export function broadcast(eventType: string, payload: any, targetUserId?: string) {
  const message = JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() });
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      const allowed=targetUserId ? client.userId===targetUserId || ['ADMIN','SUPER_ADMIN'].includes(client.role||'') : ['ANNOUNCEMENT_BROADCAST'].includes(eventType) || ['ADMIN','SUPER_ADMIN'].includes(client.role||'') || (eventType==='VISITOR_LOGS_UPDATED' && ['WORKER','GUARD','OFFICER'].includes(client.role||''));
      if (allowed) client.ws.send(message);
    }
  }
}

wss.on('connection', async (ws: WebSocket, request) => {
  const session=await resolveSocketSession(request.headers.cookie);
  if(!session){ws.close(1008,'Authentication required');return}
  const client: ConnectedClient = { ws, id: 'client-'+Date.now()+'-'+Math.random().toString(36).substring(7), userId:session.id, role:session.role, sessionId:session.sessionId };
  clients.add(client);
  ws.send(JSON.stringify({type:'CONNECTED',payload:{clientId:client.id,message:'Secure WebSocket link established with BJMP Imus City Jail Operations Server.',serverTime:new Date().toISOString(),activeClientsCount:clients.size}}));
  ws.on('message',(data:Buffer)=>{try{const msg=JSON.parse(data.toString());if(msg.type==='PING')ws.send(JSON.stringify({type:'PONG',timestamp:new Date().toISOString()}))}catch{}});
  ws.on('close',()=>clients.delete(client));
});

interface HardwarePeer { ws: WebSocket; userId?: string; role?: string; sessionId?:string; device: boolean; }
const hardwarePeers = new Set<HardwarePeer>();
let hardwareDevice: WebSocket | null = null;
interface FingerprintEnrollment {
  device: WebSocket;
  worker: WebSocket;
  requestId: string;
  deviceRequestId: string;
  visitorId: string;
  pdlId: string;
  actor: { id: string; role: string };
  timeout?: ReturnType<typeof setTimeout>;
  saving?: boolean;
}
let enrollment: FingerprintEnrollment | undefined;

function finishEnrollment(pending: FingerprintEnrollment, error?: string) {
  if (enrollment !== pending) return;
  clearTimeout(pending.timeout);
  enrollment = undefined;
  if (pending.worker.readyState === WebSocket.OPEN) {
    pending.worker.send(JSON.stringify({
      type: error ? 'DEVICE_ERROR' : 'FINGERPRINT_ENROLLED',
      requestId: pending.requestId,
      payload: error ? { message: error } : {},
    }));
  }
}

const hardwareEvents = new Set(['QR_SCANNED','DEVICE_STATUS','DEVICE_ERROR','COMMAND_ACK']);server.on('upgrade',(request,socket,head)=>{
  const pathname=new URL(request.url||'/', 'http://localhost').pathname;
  const target=pathname==='/ws'?wss:pathname==='/hardware'?hardwareWss:null;
  if(!target){socket.destroy();return}
  target.handleUpgrade(request,socket,head,(ws)=>target.emit('connection',ws,request));
});
hardwareWss.on('connection',async(ws:WebSocket,request)=>{
  const session=await resolveSocketSession(request.headers.cookie);
  if(session){
    if(!hasDuty(session,'GATE')){ws.close(1008,'Gate staff access required');return}
    const peer:HardwarePeer={ws,userId:session.id,role:session.role,sessionId:session.sessionId,device:false};hardwarePeers.add(peer);
    ws.send(JSON.stringify({type:'AUTHENTICATED',payload:{role:session.role,deviceConnected:Boolean(hardwareDevice&&hardwareDevice.readyState===WebSocket.OPEN)}}));
    ws.on('message',async(data:Buffer)=>{
      let pending: FingerprintEnrollment | undefined;
      try{
        const msg=JSON.parse(data.toString());
        const action = msg.payload?.action;
        if(msg.type!=='COMMAND'||typeof msg.requestId!=='string'||!msg.requestId||msg.requestId.length>100)return;
        // Keep the fingerprint implementation below disabled while using the QR scanner.
        if (!FINGERPRINT_ENABLED && (action === 'FINGERPRINT_ENROLL' || action === 'FINGERPRINT_VERIFY')) {
          ws.send(JSON.stringify({
            type: 'DEVICE_ERROR', requestId: msg.requestId,
            payload: { message: 'Fingerprint scanning is disabled.' },
          }));
          return;
        }
        if (action !== 'QR_SCAN_START' && action !== 'FINGERPRINT_ENROLL') return;
        if(!hardwareDevice||hardwareDevice.readyState!==WebSocket.OPEN){
          ws.send(JSON.stringify({type:'DEVICE_ERROR',requestId:msg.requestId,payload:{message:'ESP32E hardware gateway is offline.'}}));
          return;
        }
        const latest=await getUserById(session.id);
        if(!latest||!['ACTIVE','ACTIVATED'].includes(latest.accountStatus)||!hasDuty(latest,'GATE')){
          ws.send(JSON.stringify({type:'DEVICE_ERROR',requestId:msg.requestId,payload:{message:'An active gate staff account is required.'}}));
          return;
        }
        const device = hardwareDevice;
        if (!device || device.readyState !== WebSocket.OPEN || enrollment) {
          ws.send(JSON.stringify({type:'DEVICE_ERROR',requestId:msg.requestId,payload:{
            message: enrollment ? 'A fingerprint enrollment is already in progress.' : 'The ESP32 is offline.',
          }}));
          return;
        }
        if (action === 'QR_SCAN_START') {
          device.send(JSON.stringify({type:'COMMAND',requestId:msg.requestId,payload:{action}}));
          return;
        }
        pending = {
          device, worker: ws, requestId: msg.requestId, deviceRequestId: randomUUID(),
          visitorId: String(msg.payload.visitorId ?? ''), pdlId: String(msg.payload.pdlId ?? ''),
          actor: { id: session.id, role: latest.role },
        };
        enrollment = pending;
        await requireApprovedWorkerVisit(pool, pending.visitorId, pending.pdlId);
        const [existing] = await pool.query<any[]>(
          'SELECT 1 FROM visitor_fingerprint_identities WHERE visitor_record_id=?', [pending.visitorId]);
        if (existing.length) throw new Error('This visitor already has an enrolled fingerprint.');
        if (enrollment !== pending || ws.readyState !== WebSocket.OPEN ||
          device !== hardwareDevice || device.readyState !== WebSocket.OPEN) {
          finishEnrollment(pending, 'The hardware connection closed before enrollment started.');
          return;
        }
        const activeEnrollment = pending;
        pending.timeout = setTimeout(() => finishEnrollment(activeEnrollment, 'The fingerprint scanner did not respond.'), 80000);
        device.send(JSON.stringify({type:'COMMAND',requestId:pending.deviceRequestId,
          payload:{action,subjectType:'VISITOR',subjectId:pending.visitorId}}));
      }catch(error: any){
        if (pending) finishEnrollment(pending, error.code ? 'Could not start fingerprint enrollment.' : error.message);
      }
    });
    ws.on('close',()=>hardwarePeers.delete(peer));return;
  }
  const token=process.env.HARDWARE_DEVICE_TOKEN||'';let authenticated=false;
  const timer=setTimeout(()=>{if(!authenticated)ws.close(1008,'Device authentication required')},5000);
  ws.on('message',async(data:Buffer)=>{
    try{
      const msg=JSON.parse(data.toString());
      if(!authenticated){
        if(msg.type!=='AUTHENTICATE'||msg.device!=='esp32e'||!token||String(msg.token||'')!==token){ws.close(1008,'Invalid device credentials');return}
        authenticated=true;clearTimeout(timer);hardwareDevice=ws;
        const peer:HardwarePeer={ws,device:true};hardwarePeers.add(peer);
        ws.send(JSON.stringify({type:'AUTHENTICATED',payload:{device:'esp32e'}}));
        for(const staff of hardwarePeers)if(!staff.device&&staff.ws.readyState===WebSocket.OPEN)staff.ws.send(JSON.stringify({type:'DEVICE_STATUS',payload:{connected:true,device:'esp32e'}}));
        return;
      }
      const pending = enrollment;
      if (pending?.device === ws && msg.requestId === pending.deviceRequestId) {
        if (pending.saving) return;
        if (msg.type === 'DEVICE_ERROR') {
          finishEnrollment(pending, String(msg.payload?.message || 'Fingerprint enrollment failed.').slice(0, 300));
        }
        if (msg.type === 'FINGERPRINT_ENROLL_RESULT' && msg.payload?.success === true) {
          const templateId = Number(msg.payload.templateId);
          if (msg.payload.subjectType !== 'VISITOR' || msg.payload.subjectId !== pending.visitorId ||
            !Number.isInteger(templateId) || templateId < 1 || templateId > 65535) {
            finishEnrollment(pending, 'The scanner returned an invalid fingerprint enrollment result.');
            return;
          }
          pending.saving = true;
          clearTimeout(pending.timeout);
          try {
            await saveVisitorFingerprint(pending.visitorId, templateId, pending.actor, pending.pdlId);
            finishEnrollment(pending);
          } catch (error: any) {
            console.error('Could not save visitor fingerprint enrollment:', error.code || error.name);
            finishEnrollment(pending, 'The scanner captured the fingerprint, but its link to the visitor could not be saved.');
          }
        }
        return;
      }
      if(ws!==hardwareDevice||!hardwareEvents.has(msg.type))return;
      const event=JSON.stringify({type:msg.type,requestId:msg.requestId||null,payload:msg.type==='QR_SCANNED'?{code:String(msg.payload?.code||msg.payload?.value||'')}:{connected:msg.payload?.connected,message:String(msg.payload?.message||'')}});
      for(const staff of hardwarePeers)if(!staff.device&&staff.ws.readyState===WebSocket.OPEN)staff.ws.send(event);
    }catch{}
  });
  ws.on('close',()=>{
    clearTimeout(timer);
    if(enrollment?.device===ws && !enrollment.saving)finishEnrollment(enrollment,'The fingerprint scanner disconnected.');
    if(hardwareDevice===ws){
      hardwareDevice=null;
      for(const staff of hardwarePeers)if(!staff.device&&staff.ws.readyState===WebSocket.OPEN)staff.ws.send(JSON.stringify({type:'DEVICE_STATUS',payload:{connected:false,device:'esp32e'}}));
    }
    for(const peer of hardwarePeers)if(peer.ws===ws)hardwarePeers.delete(peer);
  });
});// ─── REST Endpoints ───────────────────────────────────────────────────────────

// Health check
app.get('/api/health', async (_req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'BJMP Imus City Jail Fullstack Realtime API',
    database: 'MySQL',
    websocketClients: clients.size,
    timestamp: new Date().toISOString(),
  });
});

// Only this explicitly published notice is public; account data stays protected.
app.get('/api/security-notice',async(_req,res)=>{
 const [rows]=await pool.query<any[]>("SELECT content FROM announcements WHERE id='facility-security-notice' AND is_active=1 AND is_archived=0");
 res.json({content:rows[0]?.content||''});
});
// Protected API routes require a valid HttpOnly session.
app.use('/api', authenticate);
app.get('/api/pdl-property-receipt-number',requireAdmin,async(_req,res)=>{
 try { res.json({ receiptNumber: await getNextPropertyReceiptNumber() }); }
 catch { res.status(500).json({ error: 'Could not load the next property receipt number.' }); }
});


function recordAudit(actor:any,action:string,targetType:string,targetId:string|null,result='SUCCESS',details:any={},ipAddress:string|null=null) {
  return pool.query('INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details,ip_address) VALUES(?,?,?,?,?,?,?,?)',[actor?.id||null,actor?.role||'SYSTEM',action,targetType,targetId,result,JSON.stringify(details),ipAddress]);
}
function queryFilters(query:any, alias='a') {
  const where:string[]=[]; const values:any[]=[];
  const add=(field:string,key:string)=>{const v=String(query[key]||'').trim();if(v){where.push(`${alias}.${field}=?`);values.push(v)}};
  add('action','action'); add('actor_role','role'); add('target_type','recordType'); add('result','result');
  const from=String(query.from||'').trim(),to=String(query.to||'').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(from)){where.push(`${alias}.created_at>=?`);values.push(`${from} 00:00:00`)}
  if(/^\d{4}-\d{2}-\d{2}$/.test(to)){where.push(`${alias}.created_at<=?`);values.push(`${to} 23:59:59`)}
  const q=String(query.q||'').trim().slice(0,100);if(q){where.push(`(CAST(${alias}.id AS CHAR) LIKE ? OR ${alias}.target_id LIKE ? OR ${alias}.action LIKE ? OR ${alias}.details LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR CONCAT_WS(' ',u.first_name,u.last_name) LIKE ?)`);values.push(...Array(4).fill(`%${q}%`),...Array(3).fill(`${q}%`))}
  return {sql:where.length?`WHERE ${where.join(' AND ')}`:'',values};
}
function csvCell(value:any) { let text=String(value??''); if(/^[=+@\-\t\r]/.test(text))text=`'${text}`;return `"${text.replace(/"/g,'""')}"`; }
function sendCsv(res:any,filename:string,headers:string[],rows:any[][]) {res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);res.send([headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n'));}

const adminRouter=express.Router();
const qualifyArchiveLabel=(label:string)=>label.replace(/\b(first_name|middle_name|last_name|suffix|title|appointment_reference|id)\b/g,'t.$1');
adminRouter.put('/security-notice',async(req,res)=>{
 if(typeof req.body.content!=='string'||req.body.content.length>5000)return res.status(400).json({error:'Enter a notice of up to 5,000 characters.'});
 const content=req.body.content.trim(),actor=(req as any).user,conn=await pool.getConnection();
 try{await conn.beginTransaction();const [rows]=await conn.query<any[]>("SELECT is_archived FROM announcements WHERE id='facility-security-notice' FOR UPDATE");
 await conn.query("INSERT INTO announcements(id,title,content,level,posted_by,created_at,is_active,is_archived,archived_at,archived_by,archive_reason) VALUES('facility-security-notice','Official security notice',?,'warning',?,NOW(),?,?,IF(?=1,NOW(),NULL),IF(?=1,?,NULL),IF(?=1,'Notice cleared by administrator',NULL)) ON DUPLICATE KEY UPDATE content=VALUES(content),posted_by=VALUES(posted_by),is_active=VALUES(is_active),is_archived=VALUES(is_archived),archived_at=VALUES(archived_at),archived_by=VALUES(archived_by),archive_reason=VALUES(archive_reason)",[content,String(actor.id),content?1:0,content?0:1,content?0:1,content?0:1,actor.id,content?0:1]);
 const archiveAction=!content?'ARCHIVE':rows[0]?.is_archived?'RESTORE':null;
 if(archiveAction)await conn.query("INSERT INTO record_archive_events(record_type,record_id,action,record_label,reason,actor_user_id) VALUES('ANNOUNCEMENT','facility-security-notice',?,'Official security notice',?,?)",[archiveAction,content?'Notice republished':'Notice cleared by administrator',actor.id]);
 await conn.query("INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details) VALUES(?,?,'SECURITY_NOTICE_UPDATED','ANNOUNCEMENT','facility-security-notice','SUCCESS',?)",[actor.id,actor.role,JSON.stringify({published:Boolean(content)})]);await conn.commit();broadcast('ANNOUNCEMENT_BROADCAST',{title:'Official security notice',content});res.json({success:true,content});
 }catch{await conn.rollback();res.status(500).json({error:'Could not publish the notice.'})}finally{conn.release()}
});
adminRouter.get('/audit-logs',async(req,res)=>{const f=queryFilters(req.query);const [rows]=await pool.query<any[]>(`SELECT a.id,a.actor_user_id,a.actor_role,a.action,a.target_type,a.target_id,a.result,a.details,a.ip_address,a.created_at,u.first_name,u.last_name FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id ${f.sql} ORDER BY a.created_at DESC LIMIT 1000`,f.values);res.json(rows)});
const archiveSpec:any={USERS:{table:'users',id:'id',label:"CONCAT_WS(' ',first_name,middle_name,last_name,suffix)",created:'registered_at',status:'account_status',type:'USER'},PDLS:{table:'pdls',id:'id',label:"CONCAT_WS(' ',first_name,middle_name,last_name,suffix)",created:'NULL',status:'status',type:'PDL'},ANNOUNCEMENTS:{table:'announcements',id:'id',label:'title',created:'created_at',status:'level',type:'ANNOUNCEMENT'},INCIDENTS:{table:'security_incidents',id:'id',label:'id',created:'NULL',status:'incident_type',type:'SECURITY_INCIDENT'}};
adminRouter.get('/archive',async(req,res)=>{const requested=String(req.query.type||'').toUpperCase();const specs=(Object.values(archiveSpec) as any[]).filter((x:any)=>!requested||x.type===requested);const records:any[]=[];for(const x of specs){const [rows]=await pool.query<any[]>(`SELECT '${x.type}' AS record_type,CAST(t.${x.id} AS CHAR) AS record_id,${qualifyArchiveLabel(x.label)} AS record_label,${x.created==='NULL'?'NULL':'t.'+x.created} AS original_created_at,t.${x.status} AS previous_status,t.archived_at,t.archive_reason,t.archived_by,CONCAT_WS(' ',u.first_name,u.last_name) AS archived_by_name FROM ${x.table} t LEFT JOIN users u ON u.id=t.archived_by WHERE t.is_archived=1${x.type==="USER"?" AND t.role<>'VISITOR'":""}`);records.push(...rows)}const q=String(req.query.q||'').toLowerCase();res.json(records.filter(r=>!q||`${r.record_type} ${r.record_id} ${r.record_label} ${r.archive_reason||''}`.toLowerCase().includes(q)).sort((a,b)=>new Date(b.archived_at).getTime()-new Date(a.archived_at).getTime()))});
adminRouter.post('/archive/:type/:id',async(req,res)=>{const spec=(archiveSpec[String(req.params.type).toUpperCase()] || Object.values(archiveSpec).find((entry:any)=>entry.type===String(req.params.type).toUpperCase()));if(!spec)return res.status(400).json({error:'Record type cannot be archived.'});const reason=String(req.body.reason||'').trim().slice(0,1000);if(!reason)return res.status(400).json({error:'Provide an archive reason.'});const actor=(req as any).user;if(spec.type==='USER'&&String(req.params.id)===String(actor.id))return res.status(409).json({error:'You cannot archive your own administrator account.'});const conn=await pool.getConnection();try{await conn.beginTransaction();const [found]=await conn.query<any[]>(`SELECT t.${spec.id} AS id,${spec.label} AS label,${spec.created} AS created_at,${spec.status} AS previous_status,${spec.type==='USER'?'t.role':'NULL'} AS record_role FROM ${spec.table} t WHERE t.${spec.id}=? AND t.is_archived=0 FOR UPDATE`,[req.params.id]);if(!found[0]){await conn.rollback();return res.status(404).json({error:'Active record not found.'})}const row=found[0];if(spec.type==='USER'&&['ADMIN','SUPER_ADMIN','WORKER','GUARD','VERIFICATION_OFFICER'].includes(row.record_role)&&actor.role!=='SUPER_ADMIN'){await conn.rollback();return res.status(403).json({error:'Only a Super Admin may archive staff accounts.'})}if(spec.type==='USER'&&row.record_role==='SUPER_ADMIN'){const [[count]]=await conn.query<any[]>(`SELECT COUNT(*) AS n FROM users WHERE role='SUPER_ADMIN' AND is_archived=0`);if(Number(count.n)<=1){await conn.rollback();return res.status(409).json({error:'The last active Super Admin cannot be archived.'})}}await conn.query(`UPDATE ${spec.table} SET is_archived=1,archived_at=NOW(),archived_by=?,archive_reason=? WHERE ${spec.id}=? AND is_archived=0`,[actor.id,reason,req.params.id]);await conn.query('INSERT INTO record_archive_events(record_type,record_id,action,record_label,original_created_at,previous_status,reason,actor_user_id) VALUES(?,?,?,?,?,?,?,?)',[spec.type,String(req.params.id),'ARCHIVE',row.label,row.created_at,row.previous_status,reason,actor.id]);await conn.query('INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details,ip_address) VALUES(?,?,?,?,?,?,?,?)',[actor.id,actor.role,'ARCHIVE',spec.type,String(req.params.id),'SUCCESS',JSON.stringify({reason,previousStatus:row.previous_status}),req.ip]);if(spec.type==='USER'){await conn.query('DELETE FROM auth_sessions WHERE user_id=?',[req.params.id]);await conn.query("UPDATE profile_change_requests SET status='CANCELLED',new_password_hash=NULL,proofs='[]',review_reason='Cancelled because the account was archived.' WHERE user_id=? AND status IN ('VERIFYING','PENDING_APPROVAL')",[req.params.id]);await conn.query('DELETE FROM account_change_requests WHERE user_id=?',[req.params.id]);await conn.query('UPDATE auth_otps SET used_at=NOW() WHERE user_id=?',[req.params.id]);}
await conn.commit();if(spec.type==='USER')req.app.emit('sessions-invalidated',String(req.params.id));res.json({success:true})}catch{await conn.rollback();res.status(500).json({error:'Could not archive this record.'})}finally{conn.release()}});
adminRouter.post('/archive/:type/:id/restore',async(req,res)=>{const spec=(archiveSpec[String(req.params.type).toUpperCase()] || Object.values(archiveSpec).find((entry:any)=>entry.type===String(req.params.type).toUpperCase()));if(!spec)return res.status(400).json({error:'Record type cannot be restored.'});const actor=(req as any).user;const conn=await pool.getConnection();try{await conn.beginTransaction();const [found]=await conn.query<any[]>(`SELECT t.${spec.id} AS id,${spec.label} AS label,${spec.created} AS created_at,${spec.status} AS previous_status,${spec.type==='USER'?'t.role':'NULL'} AS record_role FROM ${spec.table} t WHERE t.${spec.id}=? AND t.is_archived=1 FOR UPDATE`,[req.params.id]);if(!found[0]){await conn.rollback();return res.status(404).json({error:'Archived record not found.'})}const row=found[0];if(spec.type==='USER'&&['ADMIN','SUPER_ADMIN','WORKER','GUARD','VERIFICATION_OFFICER'].includes(row.record_role)&&actor.role!=='SUPER_ADMIN'){await conn.rollback();return res.status(403).json({error:'Only a Super Admin may restore staff accounts.'})}await conn.query(`UPDATE ${spec.table} SET is_archived=0,archived_at=NULL,archived_by=NULL,archive_reason=NULL WHERE ${spec.id}=?`,[req.params.id]);await conn.query('INSERT INTO record_archive_events(record_type,record_id,action,record_label,original_created_at,previous_status,actor_user_id) VALUES(?,?,?,?,?,?,?)',[spec.type,String(req.params.id),'RESTORE',row.label,row.created_at,row.previous_status,actor.id]);await conn.query('INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details,ip_address) VALUES(?,?,?,?,?,?,?,?)',[actor.id,actor.role,'RESTORE',spec.type,String(req.params.id),'SUCCESS',JSON.stringify({recordLabel:row.label}),req.ip]);await conn.commit();res.json({success:true})}catch{await conn.rollback();res.status(500).json({error:'Could not restore this record.'})}finally{conn.release()}});
adminRouter.get('/archive/:type/:id',async(req,res)=>{const spec=(archiveSpec[String(req.params.type).toUpperCase()] || Object.values(archiveSpec).find((entry:any)=>entry.type===String(req.params.type).toUpperCase()));if(!spec)return res.status(400).json({error:'Unknown record type.'});const columns:any={USER:'id,first_name,middle_name,last_name,suffix,email,mobile_number,account_status,registered_at,last_login_at',PDL:'id,pdl_number,first_name,middle_name,last_name,suffix,sex,date_of_birth,jail_facility_id,cell_dormitory,status,primary_offense,case_status',ANNOUNCEMENT:'id,title,content,level,posted_by,created_at,is_active',SECURITY_INCIDENT:'id,timestamp,visitor_name,facility,incident_type,description,action_taken,reporting_officer'};const [rows]=await pool.query<any[]>(`SELECT ${columns[spec.type]},archived_at,archived_by,archive_reason,is_archived FROM ${spec.table} WHERE ${spec.id}=? AND is_archived=1 AND ${spec.type==="USER"?"role<>'VISITOR'":"1=1"}`,[req.params.id]);if(!rows[0])return res.status(404).json({error:'Archived record not found.'});await recordAudit((req as any).user,'ARCHIVED_RECORD_VIEWED',spec.type,req.params.id,'SUCCESS',{},req.ip);res.json(rows[0])});
adminRouter.get('/archive/:type/:id/history',async(req,res)=>{const type=String(req.params.type).toUpperCase();if(!(Object.values(archiveSpec) as any[]).some((x:any)=>x.type===type))return res.status(400).json({error:'Unknown record type.'});const [rows]=await pool.query<any[]>(`SELECT e.*,u.first_name,u.last_name FROM record_archive_events e LEFT JOIN users u ON u.id=e.actor_user_id WHERE e.record_type=? AND e.record_id=? ORDER BY e.performed_at DESC`,[type,req.params.id]);res.json(rows)});
adminRouter.get('/audit-logs/export',async(req,res)=>{const f=queryFilters(req.query);const [rows]=await pool.query<any[]>(`SELECT a.created_at,a.actor_user_id,a.actor_role,a.action,a.target_type,a.target_id,a.result FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id ${f.sql} ORDER BY a.created_at DESC LIMIT 10000`,f.values);await recordAudit((req as any).user,'EXPORT','AUDIT_LOG',null,'SUCCESS',{format:'PDF',recordCount:rows.length,filters:{action:req.query.action||null,role:req.query.role||null,recordType:req.query.recordType||null,from:req.query.from||null,to:req.query.to||null}},req.ip);sendCsv(res,'audit-logs.csv',['Date/Time','Actor ID','Role','Action','Record Type','Record ID','Result'],rows.map(r=>[r.created_at,r.actor_user_id,r.actor_role,r.action,r.target_type,r.target_id,r.result]))});
adminRouter.get('/reports/pdls/export',async(req,res)=>{const status=String(req.query.pdlStatus||'').slice(0,50),q=String(req.query.q||'').trim().slice(0,100);const where=['is_archived=0'],values:any[]=[];if(status){where.push('status=?');values.push(status)}if(q){where.push("(pdl_number LIKE ? OR first_name LIKE ? OR last_name LIKE ?)");values.push(...Array(3).fill(`%${q}%`))}const [rows]=await pool.query<any[]>(`SELECT id,pdl_number,CONCAT_WS(' ',first_name,middle_name,last_name,suffix) AS full_name,sex,status,jail_facility_id,cell_dormitory FROM pdls WHERE ${where.join(' AND ')} ORDER BY last_name,first_name`,values);await recordAudit((req as any).user,'EXPORT','PDL_RECORDS',null,'SUCCESS',{format:'PDF',recordCount:rows.length,filters:{status:status||null,q:q||null}},req.ip);sendCsv(res,'pdl-records.csv',['PDL ID','PDL Number','Name','Sex','Status','Facility ID','Cell/Dormitory'],rows.map(r=>[r.id,r.pdl_number,r.full_name,r.sex,r.status,r.jail_facility_id,r.cell_dormitory]))});
adminRouter.get('/reports/visitors/export',async(req,res)=>{const from=String(req.query.from||''),to=String(req.query.to||''),where:string[]=[],values:any[]=[];if(/^\d{4}-\d{2}-\d{2}$/.test(from)){where.push('v.visit_date>=?');values.push(from)}if(/^\d{4}-\d{2}-\d{2}$/.test(to)){where.push('v.visit_date<=?');values.push(to)}const [rows]=await pool.query<any[]>(`SELECT v.log_type,v.visit_date,v.time_in,v.time_out,v.visitor_name,v.gender,v.address,v.age,v.contact_number,v.relationship_to_pdl,v.purpose_of_visit,v.cell_number,p.pdl_number,CONCAT_WS(' ',p.first_name,p.middle_name,p.last_name,p.suffix) AS pdl_name FROM visitor_log_entries v LEFT JOIN pdls p ON p.id=v.pdl_id ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY v.visit_date DESC,v.time_in DESC LIMIT 10000`,values);await recordAudit((req as any).user,'EXPORT','VISITOR_LOGS',null,'SUCCESS',{format:'PDF',recordCount:rows.length},req.ip);sendCsv(res,'visitor-logs.csv',['Log Type','Date','Time In','Time Out','Visitor','Gender','Address','Age','Contact','Relationship','Purpose','Cell','PDL Number','PDL Name'],rows.map(r=>[r.log_type,r.visit_date,r.time_in,r.time_out,r.visitor_name,r.gender,r.address,r.age,r.contact_number,r.relationship_to_pdl,r.purpose_of_visit,r.cell_number,r.pdl_number,r.pdl_name]))});

app.use('/api/admin',requireAdmin,adminRouter);
app.use('/api/staff',staffRouter);
app.use('/api/incidents',incidentRouter);
app.use('/api/visitor-records',visitorRecordsRouter);
(app as any).on('profile-change-requests-updated',()=>{broadcast('PROFILE_CHANGE_REQUESTS_UPDATED',{});});
(app as any).on('visitor-logs-updated',()=>{broadcast('VISITOR_LOGS_UPDATED',{});});
const workerRouter=express.Router();
workerRouter.get('/pdls',requireDuty('RECORDS'),async(_req,res)=>res.json(await getAllPdls()));
workerRouter.post('/pdls',requireDuty('RECORDS'),async(_req,res)=>res.status(403).json({error:'Only an administrator can create or edit PDL records.'}));
app.use('/api/worker',requireWorker,workerRouter);
app.get('/api/users', requireAdmin, async (_req, res) => { res.json((await getAllUsers()).filter(user=>user.role!=='VISITOR')); });

// PDLs
app.get('/api/pdls', requireAdmin, async (_req, res) => { res.json(await getAllPdls()); });

app.post('/api/pdls', requireAdmin, async (req, res) => {
  if(req.body?.status==='Released'&&(!String(req.body.releaseDate||'')||!String(req.body.releaseMode||'').trim()))return res.status(400).json({error:'Release date and mode are required for administrator approval.'});
  try {
    const pdl = await createPdl(req.body);
    await recordAudit((req as any).user,'CREATE','PDL',String(pdl?.id||''),'SUCCESS',{},req.ip);
    broadcast('PDL_ADDED', pdl);
    res.status(201).json({ success: true, pdl });
  } catch (e: any) { res.status(400).json({ error: 'Could not save the PDL record. Check the submitted fields.' }); }
});

app.put('/api/pdls/:id', requireAdmin, async (req, res) => {
  try {
    const pdl = await createPdl({ ...req.body, id: req.params.id });
    await recordAudit((req as any).user,'UPDATE','PDL',req.params.id,'SUCCESS',{},req.ip);
    broadcast('PDL_UPDATED', pdl);
    res.json({ success: true, pdl });
  } catch (e: any) { res.status(400).json({ error: 'Could not save the PDL record. Check the submitted fields.' }); }
});

app.get('/api/pdl-form-records', requireAdmin, async (req, res) => {
  res.json(await getPdlFormRecords(typeof req.query.pdlId === 'string' ? req.query.pdlId : undefined));
});

app.put('/api/pdl-form-records/:pdlId/:recordType', requireAdmin, async (req, res) => {
  try {
    const record = await savePdlFormRecord({ ...req.body, pdlId: req.params.pdlId, recordType: req.params.recordType });
    await recordAudit((req as any).user,'UPDATE','PDL_FORM',String(record?.id||''),'SUCCESS',{pdlId:req.params.pdlId,recordType:req.params.recordType},req.ip);
    broadcast('PDL_FORM_SAVED', record);
    res.json({ success: true, record });
  } catch (e: any) { res.status(400).json({ error: 'Could not save the PDL form. Check the submitted fields.' }); }
});

// Incidents
app.get('/api/incidents', requireAdmin, async (_req, res) => { res.json(await getIncidents()); });

app.post('/api/incidents', requireAdmin, async (req, res) => {
  try {
    const data=validateIncident(req.body),actor=(req as any).user;
    const inc = await createIncident({...data,timestamp:new Date().toISOString(),reportingOfficer:[actor.firstName,actor.lastName].filter(Boolean).join(' ')});
    await recordAudit((req as any).user,'CREATE','SECURITY_INCIDENT',String(inc?.id||''),'SUCCESS',{},req.ip);
    broadcast('SECURITY_INCIDENT_REPORTED', inc);
    res.status(201).json({ success: true, incident: inc });
  } catch (e: any) { res.status(500).json({ error: 'The request could not be completed.' }); }
});

// Announcements
app.get('/api/announcements', async (_req, res) => { res.json(await getAnnouncements()); });

app.post('/api/announcements', requireAdmin, async (req, res) => {
  try {
    if(typeof req.body.title!=='string'||!req.body.title.trim()||req.body.title.length>200||typeof req.body.content!=='string'||!req.body.content.trim()||req.body.content.length>5000||!['info','warning','critical'].includes(req.body.level||'info'))return res.status(400).json({error:'Provide a title, notice text and valid severity.'});
    const ann = await createAnnouncement({...req.body,postedBy:String((req as any).user.id)});
    await recordAudit((req as any).user,'CREATE','ANNOUNCEMENT',String(ann?.id||''),'SUCCESS',{},req.ip);
    broadcast('ANNOUNCEMENT_BROADCAST', ann);
    res.status(201).json({ success: true, announcement: ann });
  } catch (e: any) { res.status(500).json({ error: 'The request could not be completed.' }); }
});

(app as any).on('session-ended',(sessionId:string)=>{for(const client of clients)if(client.sessionId===sessionId)client.ws.close(1008,'Signed out.');for(const peer of hardwarePeers)if(peer.sessionId===sessionId)peer.ws.close(1008,'Signed out.')});
(app as any).on('sessions-invalidated',(userId:string)=>{for(const client of clients)if(client.userId===userId)client.ws.close(1008,'Sign in again.');for(const peer of hardwarePeers)if(peer.userId===userId)peer.ws.close(1008,'Sign in again.')});

if (process.env.NODE_ENV === 'production') {
  const frontendDirectory = fileURLToPath(new URL('../frontend/dist/', import.meta.url));
  app.use('/api', (_request, response) => response.status(404).json({ error: 'Endpoint not found.' }));
  app.use(express.static(frontendDirectory));
  app.get('*', (_request, response) => response.sendFile('index.html', { root: frontendDirectory }));
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    console.log('🔌 Connecting to MySQL database...');
    await initDatabase();
    await hashLegacyPasswords(hashPass);
    console.log(`✅ MySQL database ready (${process.env.DB_NAME || 'bjmp_visitation'})`);

    server.listen(PORT, () => {
      console.log(`\n===================================================================`);
      console.log(`🏛️  BJMP Imus City Jail Backend & Real-Time WebSocket Server`);
      console.log(`📡  HTTP REST API  : http://localhost:${PORT}`);
      console.log(`⚡  WebSocket      : ws://localhost:${PORT}/ws`);
      console.log(`🗄️  Database       : MySQL → ${process.env.DB_NAME || 'bjmp_visitation'}`);
      console.log(`===================================================================\n`);
    });
  } catch (err: any) {
    console.error('\n❌ Failed to initialize MySQL. Check database settings and availability.\n', err.message);
    process.exit(1);
  }
}

export { app, server };
start();





