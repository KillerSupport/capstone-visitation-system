import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes, { auth as authenticate, admin as requireAdmin, worker as requireWorker, visitorActive, hashPass, resolveSocketSession, kycReviewer } from './auth.js';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomBytes, randomUUID, createHash, createHmac, createCipheriv } from 'node:crypto';
import {
  pool,
  initDatabase,
  getAllUsers,
  getUserById,
  getUserByEmail,
  hashLegacyPasswords,
  createUser,
  updateUserStatus,
  getAllPdls,
  createPdl,
  getPdlFormRecords,
  savePdlFormRecord,
  getAllAppointments,
  createAppointment,
  updateAppointmentStatus,
  logGateScan,
  getGateLogs,
  getIncidents,
  createIncident,
  getAnnouncements,
  createAnnouncement,
  getStats,
} from './database/db.js';

const app = express();
const PORT = process.env.PORT || 4001;
app.use(helmet());
app.use(cors({ origin: process.env.APP_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use('/api/auth', authRoutes);

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
      const allowed=targetUserId ? client.userId===targetUserId || ['ADMIN','SUPER_ADMIN'].includes(client.role||'') : eventType==='ANNOUNCEMENT_BROADCAST' || ['ADMIN','SUPER_ADMIN'].includes(client.role||'');
      if (allowed) client.ws.send(message);
    }
  }
}

wss.on('connection', async (ws: WebSocket, request) => {
  const session=await resolveSocketSession(request.headers.cookie);
  if(!session){ws.close(1008,'Authentication required');return}
  const client: ConnectedClient = { ws, id: `client-${Date.now()}-${Math.random().toString(36).substring(7)}`, userId:session.id, role:session.role };
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
      if (msg.type === 'PING') {
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
    timestamp: new Date().toISOString(),
  });
});

// Protected API routes require a valid HttpOnly session.
app.use('/api', authenticate);


function getKycKey() {
  const raw=process.env.KYC_ENCRYPTION_KEY||'';
  const key=/^[a-f0-9]{64}$/i.test(raw)?Buffer.from(raw,'hex'):Buffer.from(raw,'base64');
  if(key.length!==32) throw new Error('KYC_ENCRYPTION_KEY must contain 32 bytes (hex or base64).');
  return key;
}
function encryptSensitive(value:string) {
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',getKycKey(),iv),data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64');
}
function imageInput(value:string) {
  const match=/^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(String(value||''));
  if(!match) throw new Error('Upload a JPG or PNG image.');
  const data=Buffer.from(match[2],'base64');
  if(data.length<2048||data.length>5*1024*1024) throw new Error('Each ID image must be between 2 KB and 5 MB.');
  const mime=match[1],valid=mime==='image/png'?data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):data[0]===255&&data[1]===216&&data[2]===255;
  if(!valid) throw new Error('The image contents do not match the selected file type.');
  let width=0,height=0;
  if(mime==='image/png'){width=data.readUInt32BE(16);height=data.readUInt32BE(20)}
  else {let i=2;while(i<data.length-9){if(data[i++]!==255)continue;const marker=data[i++];const len=data.readUInt16BE(i);if([192,193,194,195,198,199,201,202,203,205,206,207].includes(marker)){height=data.readUInt16BE(i+3);width=data.readUInt16BE(i+5);break}i+=len}}
  if(width<300||height<180||width>10000||height>10000) throw new Error('ID image is too small or has invalid dimensions.');
  return {data,mime,width,height,hash:createHash('sha256').update(data).digest('hex')};
}
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
  const q=String(query.q||'').trim().slice(0,100);if(q){where.push(`(CAST(${alias}.id AS CHAR) LIKE ? OR ${alias}.target_id LIKE ? OR ${alias}.action LIKE ? OR ${alias}.details LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)`);values.push(...Array(6).fill(`%${q}%`))}
  return {sql:where.length?`WHERE ${where.join(' AND ')}`:'',values};
}
function csvCell(value:any) { let text=String(value??''); if(/^[=+@\-\t\r]/.test(text))text=`'${text}`;return `"${text.replace(/"/g,'""')}"`; }
function sendCsv(res:any,filename:string,headers:string[],rows:any[][]) {res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);res.send([headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n'));}

async function getWorkerAppointments() {
  const [rows]=await pool.query<any[]>(`SELECT a.id,a.appointment_reference,a.user_id,a.visitor_name,a.pdl_id,a.pdl_name,a.pdl_number,a.visit_date,a.time_slot,a.status,a.relationship_to_pdl,a.visit_type,a.jail_facility_name,u.account_status,u.mobile_number,
    (SELECT k.status FROM kyc_submissions k WHERE k.user_id=u.id ORDER BY k.submitted_at DESC LIMIT 1) AS kyc_status, (a.visit_date=CURDATE()) AS is_today
    FROM appointments a JOIN users u ON u.id=a.user_id WHERE a.is_archived=0 AND u.is_archived=0 AND NOT EXISTS (SELECT 1 FROM pdls p WHERE p.id=a.pdl_id AND p.is_archived=1) AND a.visit_date=CURDATE() ORDER BY a.time_slot,a.visitor_name`);
  return rows.map((r:any)=>({id:r.id,appointmentReference:r.appointment_reference,visitor:{id:String(r.user_id),name:r.visitor_name,visitorId:`VIS-${String(r.user_id).padStart(5,'0')}`,mobileMasked:r.mobile_number?String(r.mobile_number).replace(/(\+63\d{2})\d{5}(\d{2})$/,'$1•••••$2'):null,accountStatus:r.account_status,verificationStatus:r.kyc_status||'NOT_SUBMITTED'},visit:{status:r.status,scheduledDate:String(r.visit_date).slice(0,10),scheduledTime:r.time_slot,relationship:r.relationship_to_pdl,visitType:r.visit_type,facility:r.jail_facility_name},pdl:{name:r.pdl_name,pdlId:r.pdl_number}}));
}
const adminRouter=express.Router();
const kycRouter=express.Router();
adminRouter.get('/users',async(_req,res)=>res.json(await getAllUsers()));
adminRouter.get('/users/:id',async(req,res)=>{const u=await getUserById(req.params.id);if(!u)return res.status(404).json({error:'User not found.'});const [kyc]=await pool.query<any[]>('SELECT id,id_type,CONCAT(REPEAT(\'•\',GREATEST(0,CHAR_LENGTH(id_number_last4)-4)),RIGHT(id_number_last4,4)) AS masked_id_number,status,automated_check,submitted_at,reviewed_at,reviewer_id,rejection_reason,full_name,date_of_birth,address FROM kyc_submissions WHERE user_id=? ORDER BY submitted_at DESC',[req.params.id]);const [visits]=await pool.query<any[]>('SELECT appointment_reference,pdl_name,pdl_number,visit_date,time_slot,status,relationship_to_pdl FROM appointments WHERE user_id=? ORDER BY visit_date DESC LIMIT 200',[req.params.id]);await recordAudit((req as any).user,'USER_PROFILE_VIEWED','USER',req.params.id,'SUCCESS',{},req.ip);res.json({user:u,kyc:kyc.map((x:any)=>({...x,idNumberMasked:x.masked_id_number})),visits})});
kycRouter.get('/',async(req,res)=>{const status=String(req.query.status||'');const [rows]=await pool.query<any[]>(`SELECT k.id,k.user_id,k.id_type,k.status,k.automated_check,k.submitted_at,k.reviewed_at,k.reviewer_id,k.rejection_reason,k.full_name,u.first_name,u.last_name,CONCAT_WS(' ',ru.first_name,ru.last_name) AS reviewer_name FROM kyc_submissions k JOIN users u ON u.id=k.user_id LEFT JOIN users ru ON ru.id=k.reviewer_id ${status? 'WHERE k.status=?':''} ORDER BY k.submitted_at DESC`,status?[status]:[]);res.json(rows)});
kycRouter.get('/:id',async(req,res)=>{const [rows]=await pool.query<any[]>('SELECT k.*,u.first_name,u.middle_name,u.last_name,u.email,u.mobile_number FROM kyc_submissions k JOIN users u ON u.id=k.user_id WHERE k.id=?',[req.params.id]);if(!rows[0])return res.status(404).json({error:'Submission not found.'});await recordAudit((req as any).user,'KYC_SUBMISSION_VIEWED','KYC',req.params.id,'SUCCESS',{},req.ip);const x=rows[0];res.json({submission:{id:x.id,userId:x.user_id,userProvided:{name:x.full_name,idType:x.id_type,idNumberMasked:'••••'+String(x.id_number_last4),dateOfBirth:x.date_of_birth,address:x.address},extracted:{available:false,reason:'No OCR provider is connected; administrator review is required.'},automatedCheck:x.automated_check,status:x.status,submittedAt:x.submitted_at,rejectionReason:x.rejection_reason,documents:[{side:'front',url:`/api/admin/kyc/${x.id}/document/front`},{side:'back',url:`/api/admin/kyc/${x.id}/document/back`}]}})});
kycRouter.get('/:id/document/:side',async(req,res)=>{if(!['front','back'].includes(req.params.side))return res.status(400).json({error:'Invalid document side.'});const [rows]=await pool.query<any[]>('SELECT d.mime_type,d.image_data FROM kyc_documents d WHERE d.submission_id=? AND d.side=?',[req.params.id,req.params.side]);if(!rows[0])return res.status(404).json({error:'Document not found.'});await recordAudit((req as any).user,'KYC_DOCUMENT_VIEWED','KYC',req.params.id,'SUCCESS',{side:req.params.side},req.ip);res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.type(rows[0].mime_type).send(rows[0].image_data)});
kycRouter.patch('/:id/review',async(req,res)=>{const status=String(req.body.status||'');if(!['VERIFIED','REJECTED','NEEDS_RESUBMISSION'].includes(status))return res.status(400).json({error:'Invalid review result.'});if(status==='REJECTED'&&!String(req.body.reason||'').trim())return res.status(400).json({error:'Provide a rejection reason.'});const conn=await pool.getConnection();try{await conn.beginTransaction();const [found]=await conn.query<any[]>('SELECT user_id FROM kyc_submissions WHERE id=? FOR UPDATE',[req.params.id]);if(!found[0]){await conn.rollback();return res.status(404).json({error:'Submission not found.'})}await conn.query('UPDATE kyc_submissions SET status=?,reviewed_at=NOW(),reviewer_id=?,rejection_reason=? WHERE id=?',[status,(req as any).user.id,status==='VERIFIED'?null:String(req.body.reason||'').trim()||null,req.params.id]);const accountStatus=status==='VERIFIED'?'PENDING_BIOMETRICS':'PENDING_VERIFICATION';await conn.query('UPDATE users SET account_status=? WHERE id=?',[accountStatus,found[0].user_id]);await conn.query('INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details,ip_address) VALUES(?,?,?,?,?,?,?,?)',[(req as any).user.id,(req as any).user.role,`KYC_${status}`,'KYC',req.params.id,'SUCCESS',JSON.stringify({reason:status==='VERIFIED'?null:String(req.body.reason||'').trim()}),req.ip]);await conn.commit();res.json({success:true,status,accountStatus})}catch{await conn.rollback();res.status(500).json({error:'Could not save the review.'})}finally{conn.release()}});
adminRouter.get('/audit-logs',async(req,res)=>{const f=queryFilters(req.query);const [rows]=await pool.query<any[]>(`SELECT a.id,a.actor_user_id,a.actor_role,a.action,a.target_type,a.target_id,a.result,a.details,a.ip_address,a.created_at,u.first_name,u.last_name FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id ${f.sql} ORDER BY a.created_at DESC LIMIT 1000`,f.values);res.json(rows)});
const archiveSpec:any={USERS:{table:'users',id:'id',label:"CONCAT_WS(' ',first_name,middle_name,last_name,suffix)",created:'registered_at',status:'account_status',type:'USER'},PDLS:{table:'pdls',id:'id',label:"CONCAT_WS(' ',first_name,middle_name,last_name,suffix)",created:'NULL',status:'status',type:'PDL'},VISITS:{table:'appointments',id:'id',label:'appointment_reference',created:'created_at',status:'status',type:'APPOINTMENT'},ANNOUNCEMENTS:{table:'announcements',id:'id',label:'title',created:'created_at',status:'level',type:'ANNOUNCEMENT'},INCIDENTS:{table:'security_incidents',id:'id',label:'id',created:'NULL',status:'incident_type',type:'SECURITY_INCIDENT'}};
adminRouter.get('/archive',async(req,res)=>{const requested=String(req.query.type||'').toUpperCase();const specs=(Object.values(archiveSpec) as any[]).filter((x:any)=>!requested||x.type===requested);const records:any[]=[];for(const x of specs){const [rows]=await pool.query<any[]>(`SELECT '${x.type}' AS record_type,CAST(t.${x.id} AS CHAR) AS record_id,${x.label} AS record_label,${x.created} AS original_created_at,${x.status} AS previous_status,t.archived_at,t.archive_reason,t.archived_by,CONCAT_WS(' ',u.first_name,u.last_name) AS archived_by_name FROM ${x.table} t LEFT JOIN users u ON u.id=t.archived_by WHERE t.is_archived=1`);records.push(...rows)}const q=String(req.query.q||'').toLowerCase();res.json(records.filter(r=>!q||`${r.record_type} ${r.record_id} ${r.record_label} ${r.archive_reason||''}`.toLowerCase().includes(q)).sort((a,b)=>new Date(b.archived_at).getTime()-new Date(a.archived_at).getTime()))});
adminRouter.post('/archive/:type/:id',async(req,res)=>{const spec=archiveSpec[String(req.params.type).toUpperCase()];if(!spec)return res.status(400).json({error:'Record type cannot be archived.'});const reason=String(req.body.reason||'').trim().slice(0,1000);if(!reason)return res.status(400).json({error:'Provide an archive reason.'});const actor=(req as any).user;if(spec.type==='USER'&&String(req.params.id)===String(actor.id))return res.status(409).json({error:'You cannot archive your own administrator account.'});const conn=await pool.getConnection();try{await conn.beginTransaction();const [found]=await conn.query<any[]>(`SELECT t.${spec.id} AS id,${spec.label} AS label,${spec.created} AS created_at,${spec.status} AS previous_status,${spec.type==='USER'?'t.role':'NULL'} AS record_role FROM ${spec.table} t WHERE t.${spec.id}=? AND t.is_archived=0 FOR UPDATE`,[req.params.id]);if(!found[0]){await conn.rollback();return res.status(404).json({error:'Active record not found.'})}const row=found[0];if(spec.type==='USER'&&['ADMIN','SUPER_ADMIN','WORKER','GUARD','VERIFICATION_OFFICER'].includes(row.record_role)&&actor.role!=='SUPER_ADMIN'){await conn.rollback();return res.status(403).json({error:'Only a Super Admin may archive staff accounts.'})}if(spec.type==='USER'&&row.record_role==='SUPER_ADMIN'){const [[count]]=await conn.query<any[]>(`SELECT COUNT(*) AS n FROM users WHERE role='SUPER_ADMIN' AND is_archived=0`);if(Number(count.n)<=1){await conn.rollback();return res.status(409).json({error:'The last active Super Admin cannot be archived.'})}}await conn.query(`UPDATE ${spec.table} SET is_archived=1,archived_at=NOW(),archived_by=?,archive_reason=? WHERE ${spec.id}=? AND is_archived=0`,[actor.id,reason,req.params.id]);await conn.query('INSERT INTO record_archive_events(record_type,record_id,action,record_label,original_created_at,previous_status,reason,actor_user_id) VALUES(?,?,?,?,?,?,?,?)',[spec.type,String(req.params.id),'ARCHIVE',row.label,row.created_at,row.previous_status,reason,actor.id]);await conn.query('INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details,ip_address) VALUES(?,?,?,?,?,?,?,?)',[actor.id,actor.role,'ARCHIVE',spec.type,String(req.params.id),'SUCCESS',JSON.stringify({reason,previousStatus:row.previous_status}),req.ip]);await conn.commit();res.json({success:true})}catch{await conn.rollback();res.status(500).json({error:'Could not archive this record.'})}finally{conn.release()}});
adminRouter.post('/archive/:type/:id/restore',async(req,res)=>{const spec=archiveSpec[String(req.params.type).toUpperCase()];if(!spec)return res.status(400).json({error:'Record type cannot be restored.'});const actor=(req as any).user;const conn=await pool.getConnection();try{await conn.beginTransaction();const [found]=await conn.query<any[]>(`SELECT t.${spec.id} AS id,${spec.label} AS label,${spec.created} AS created_at,${spec.status} AS previous_status,${spec.type==='USER'?'t.role':'NULL'} AS record_role FROM ${spec.table} t WHERE t.${spec.id}=? AND t.is_archived=1 FOR UPDATE`,[req.params.id]);if(!found[0]){await conn.rollback();return res.status(404).json({error:'Archived record not found.'})}const row=found[0];if(spec.type==='USER'&&['ADMIN','SUPER_ADMIN','WORKER','GUARD','VERIFICATION_OFFICER'].includes(row.record_role)&&actor.role!=='SUPER_ADMIN'){await conn.rollback();return res.status(403).json({error:'Only a Super Admin may restore staff accounts.'})}await conn.query(`UPDATE ${spec.table} SET is_archived=0,archived_at=NULL,archived_by=NULL,archive_reason=NULL WHERE ${spec.id}=?`,[req.params.id]);await conn.query('INSERT INTO record_archive_events(record_type,record_id,action,record_label,original_created_at,previous_status,actor_user_id) VALUES(?,?,?,?,?,?,?)',[spec.type,String(req.params.id),'RESTORE',row.label,row.created_at,row.previous_status,actor.id]);await conn.query('INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details,ip_address) VALUES(?,?,?,?,?,?,?,?)',[actor.id,actor.role,'RESTORE',spec.type,String(req.params.id),'SUCCESS',JSON.stringify({recordLabel:row.label}),req.ip]);await conn.commit();res.json({success:true})}catch{await conn.rollback();res.status(500).json({error:'Could not restore this record.'})}finally{conn.release()}});
adminRouter.get('/archive/:type/:id',async(req,res)=>{const spec=archiveSpec[String(req.params.type).toUpperCase()];if(!spec)return res.status(400).json({error:'Unknown record type.'});const columns:any={USER:'id,first_name,middle_name,last_name,suffix,email,mobile_number,account_status,registered_at,last_login_at',PDL:'id,pdl_number,first_name,middle_name,last_name,suffix,sex,date_of_birth,jail_facility_id,cell_dormitory,status,primary_offense,case_status',APPOINTMENT:'id,appointment_reference,visitor_name,pdl_name,pdl_number,visit_date,time_slot,status,visit_type,relationship_to_pdl,created_at',ANNOUNCEMENT:'id,title,content,level,posted_by,created_at,is_active',SECURITY_INCIDENT:'id,timestamp,visitor_name,facility,incident_type,description,action_taken,reporting_officer'};const [rows]=await pool.query<any[]>(`SELECT ${columns[spec.type]},archived_at,archived_by,archive_reason,is_archived FROM ${spec.table} WHERE ${spec.id}=? AND is_archived=1`,[req.params.id]);if(!rows[0])return res.status(404).json({error:'Archived record not found.'});await recordAudit((req as any).user,'ARCHIVED_RECORD_VIEWED',spec.type,req.params.id,'SUCCESS',{},req.ip);res.json(rows[0])});
adminRouter.get('/archive/:type/:id/history',async(req,res)=>{const type=String(req.params.type).toUpperCase();if(!(Object.values(archiveSpec) as any[]).some((x:any)=>x.type===type))return res.status(400).json({error:'Unknown record type.'});const [rows]=await pool.query<any[]>(`SELECT e.*,u.first_name,u.last_name FROM record_archive_events e LEFT JOIN users u ON u.id=e.actor_user_id WHERE e.record_type=? AND e.record_id=? ORDER BY e.performed_at DESC`,[type,req.params.id]);res.json(rows)});
adminRouter.get('/audit-logs/export',async(req,res)=>{const f=queryFilters(req.query);const [rows]=await pool.query<any[]>(`SELECT a.created_at,a.actor_user_id,a.actor_role,a.action,a.target_type,a.target_id,a.result FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id ${f.sql} ORDER BY a.created_at DESC LIMIT 10000`,f.values);await recordAudit((req as any).user,'EXPORT','AUDIT_LOG',null,'SUCCESS',{format:'CSV',recordCount:rows.length,filters:{action:req.query.action||null,role:req.query.role||null,recordType:req.query.recordType||null,from:req.query.from||null,to:req.query.to||null}},req.ip);sendCsv(res,'audit-logs.csv',['Date/Time','Actor ID','Role','Action','Record Type','Record ID','Result'],rows.map(r=>[r.created_at,r.actor_user_id,r.actor_role,r.action,r.target_type,r.target_id,r.result]))});
adminRouter.get('/reports/pdls/export',async(req,res)=>{const status=String(req.query.pdlStatus||'').slice(0,50),q=String(req.query.q||'').trim().slice(0,100);const where=['is_archived=0'],values:any[]=[];if(status){where.push('status=?');values.push(status)}if(q){where.push("(pdl_number LIKE ? OR first_name LIKE ? OR last_name LIKE ?)");values.push(...Array(3).fill(`%${q}%`))}const [rows]=await pool.query<any[]>(`SELECT id,pdl_number,CONCAT_WS(' ',first_name,middle_name,last_name,suffix) AS full_name,sex,status,jail_facility_id,cell_dormitory FROM pdls WHERE ${where.join(' AND ')} ORDER BY last_name,first_name`,values);await recordAudit((req as any).user,'EXPORT','PDL_RECORDS',null,'SUCCESS',{format:'CSV',recordCount:rows.length,filters:{status:status||null,q:q||null}},req.ip);sendCsv(res,'pdl-records.csv',['PDL ID','PDL Number','Name','Sex','Status','Facility ID','Cell/Dormitory'],rows.map(r=>[r.id,r.pdl_number,r.full_name,r.sex,r.status,r.jail_facility_id,r.cell_dormitory]))});
adminRouter.get('/reports/visits/export',async(req,res)=>{const from=String(req.query.from||''),to=String(req.query.to||''),status=String(req.query.status||'');const where=['is_archived=0'],values:any[]=[];if(/^\d{4}-\d{2}-\d{2}$/.test(from)){where.push('visit_date>=?');values.push(from)}if(/^\d{4}-\d{2}-\d{2}$/.test(to)){where.push('visit_date<=?');values.push(to)}if(status){where.push('status=?');values.push(status)}const [rows]=await pool.query<any[]>(`SELECT appointment_reference,visitor_name,pdl_name,pdl_number,visit_date,time_slot,status,visit_type FROM appointments WHERE ${where.join(' AND ')} ORDER BY visit_date,time_slot LIMIT 10000`,values);await recordAudit((req as any).user,'EXPORT','VISIT_RECORDS',null,'SUCCESS',{format:'CSV',recordCount:rows.length,filters:{from:from||null,to:to||null,status:status||null}},req.ip);sendCsv(res,'visit-records.csv',['Visit Reference','Visitor','PDL','PDL Reference','Date','Time','Status','Visit Type'],rows.map(r=>[r.appointment_reference,r.visitor_name,r.pdl_name,r.pdl_number,r.visit_date,r.time_slot,r.status,r.visit_type]))});
app.use('/api/admin/kyc',kycReviewer,kycRouter);
app.use('/api/admin',requireAdmin,adminRouter);
app.get('/api/kyc/status',async(req,res)=>{const [rows]=await pool.query<any[]>('SELECT id,id_type,status,automated_check,submitted_at,reviewed_at,rejection_reason FROM kyc_submissions WHERE user_id=? ORDER BY submitted_at DESC LIMIT 1',[(req as any).user.id]);res.json({status:rows[0]||{status:'NOT_SUBMITTED'}})});
app.post('/api/kyc/submissions',async(req,res)=>{try{
  const user=(req as any).user;
  if(user.role!=='VISITOR')return res.status(403).json({error:'You do not have permission.'});
  if(!user.emailVerified&&!user.phoneVerified)return res.status(403).json({error:'Verify your email or mobile number first.'});
  const idType=String(req.body.idType||'').trim(), idNumber=String(req.body.idNumber||'').trim(), fullName=String(req.body.fullName||'').trim();
  const allowed=(process.env.ACCEPTED_ID_TYPES||'Philippine National ID (PhilSys),Driver\'s License (LTO),Philippine Passport (DFA),UMID (Unified Multi-Purpose ID),Postal ID (Digitized),Social Security System (SSS) ID,Voter\'s ID / Comelec Certification,PRC Professional Identification Card,Senior Citizen ID,PhilHealth Identification Card').split(',').map(x=>x.trim());
  if(!allowed.includes(idType))return res.status(400).json({error:'Choose an accepted Philippine ID type.'});
  if(idNumber.length<4||idNumber.length>80||!fullName||fullName.length>255)return res.status(400).json({error:'Enter the name and ID number shown on your document.'});
  const [existingKyc]=await pool.query<any[]>('SELECT status FROM kyc_submissions WHERE user_id=? ORDER BY submitted_at DESC LIMIT 1',[user.id]);
  if(existingKyc[0]&&!['REJECTED','NEEDS_RESUBMISSION'].includes(existingKyc[0].status))return res.status(409).json({error:'A document review is already in progress or complete.'});
  const front=imageInput(req.body.frontImage), back=req.body.backImage?imageInput(req.body.backImage):null;
  const digest=createHmac('sha256',getKycKey()).update(idNumber.toUpperCase().replace(/\s/g,'')).digest('hex');
  const [dupe]=await pool.query<any[]>('SELECT user_id FROM kyc_submissions WHERE id_number_hash=? AND user_id<>? LIMIT 1',[digest,user.id]);
  if(dupe.length)return res.status(409).json({error:'This ID document is already associated with another account.'});
  const norm=(x:string)=>x.toLowerCase().replace(/[^a-z0-9]/g,'');
  const submittedName=norm(fullName), profileName=norm([user.firstName,user.middleName,user.lastName,user.suffix].filter(Boolean).join(' '));
  const checks={fileType:'PASS',fileSize:'PASS',imageDimensions:'PASS',nameMatch:submittedName===profileName?'MATCH':'REVIEW_REQUIRED',dateOfBirthMatch:req.body.dateOfBirth&&user.dateOfBirth?String(req.body.dateOfBirth).slice(0,10)===String(user.dateOfBirth).slice(0,10)?'MATCH':'REVIEW_REQUIRED':'NOT_PROVIDED',ocr:'NOT_CONFIGURED',officialIdVerification:'NOT_CONNECTED',overall:'ADMIN_REVIEW_REQUIRED'};
  const conn=await pool.getConnection();try{await conn.beginTransaction();const [insert]=await conn.query<any>('INSERT INTO kyc_submissions(user_id,id_type,id_number_encrypted,id_number_hash,id_number_last4,full_name,date_of_birth,address,status,automated_check) VALUES(?,?,?,?,?,?,?,?,?,?)',[user.id,idType,encryptSensitive(idNumber),digest,idNumber.slice(-4),fullName,req.body.dateOfBirth||null,String(req.body.address||'').slice(0,1000)||null,'PENDING_REVIEW',JSON.stringify(checks)]);for(const [side,file] of [['front',front],['back',back]] as const){if(file)await conn.query('INSERT INTO kyc_documents(submission_id,side,mime_type,sha256,image_data) VALUES(?,?,?,?,?)',[insert.insertId,side,file.mime,file.hash,file.data])}await conn.query('INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details,ip_address) VALUES(?,?,?,?,?,?,?,?)',[user.id,user.role,'KYC_SUBMITTED','KYC',String(insert.insertId),'SUCCESS',JSON.stringify({idType}),req.ip]);await conn.commit();res.status(201).json({success:true,status:'PENDING_REVIEW',automatedCheck:checks})}catch{await conn.rollback();res.status(500).json({error:'Could not submit documents for review.'})}finally{conn.release()}
}catch(e:any){res.status(400).json({error:e?.message||'Invalid verification submission.'})}});
const workerRouter=express.Router();
const workerActionLimit=rateLimit({windowMs:60000,limit:30,standardHeaders:true,legacyHeaders:false,message:{error:'Too many processing attempts. Please wait before trying again.'}});
workerRouter.get('/visitors/today',async(_req,res)=>res.json(await getWorkerAppointments()));
workerRouter.get('/history',async(req,res)=>{const [rows]=await pool.query<any[]>(`SELECT id,action,target_type,target_id,result,details,created_at FROM audit_logs WHERE actor_user_id=? AND target_type IN ('APPOINTMENT','VISITOR') ORDER BY created_at DESC LIMIT 200`,[(req as any).user.id]);res.json(rows)});
workerRouter.get('/visitors/search',async(req,res)=>{const term=String(req.query.q||'').trim();if(term.length<2)return res.json([]);const [rows]=await pool.query<any[]>(`SELECT a.id,a.appointment_reference,a.user_id,a.visitor_name,a.pdl_name,a.pdl_number,a.visit_date,a.time_slot,a.status,a.relationship_to_pdl,a.visit_type,a.jail_facility_name,u.account_status,u.mobile_number,(SELECT k.status FROM kyc_submissions k WHERE k.user_id=u.id ORDER BY k.submitted_at DESC LIMIT 1) AS kyc_status FROM appointments a JOIN users u ON u.id=a.user_id WHERE a.is_archived=0 AND u.is_archived=0 AND NOT EXISTS (SELECT 1 FROM pdls p WHERE p.id=a.pdl_id AND p.is_archived=1) AND a.visit_date>=CURDATE() AND (a.visitor_name LIKE ? OR a.appointment_reference LIKE ? OR a.pdl_name LIKE ? OR a.pdl_number LIKE ?) ORDER BY a.visit_date,a.time_slot LIMIT 50`,[`%${term}%`,`%${term}%`,`%${term}%`,`%${term}%`]);res.json(rows.map((r:any)=>({id:r.id,appointmentReference:r.appointment_reference,visitor:{id:String(r.user_id),name:r.visitor_name,visitorId:`VIS-${String(r.user_id).padStart(5,'0')}`,mobileMasked:r.mobile_number?String(r.mobile_number).replace(/(\+63\d{2})\d{5}(\d{2})$/,'$1•••••$2'):null,accountStatus:r.account_status,verificationStatus:r.kyc_status||'NOT_SUBMITTED'},visit:{status:r.status,scheduledDate:String(r.visit_date).slice(0,10),scheduledTime:r.time_slot,relationship:r.relationship_to_pdl,visitType:r.visit_type,facility:r.jail_facility_name},pdl:{name:r.pdl_name,pdlId:r.pdl_number}})))});
workerRouter.post('/scan',workerActionLimit,async(req,res)=>{const key=String(req.body.code||'').trim();if(!key)return res.status(400).json({error:'Scan or enter the visitor pass code.'});const [rows]=await pool.query<any[]>(`SELECT a.id,a.appointment_reference,a.user_id,a.visitor_name,a.pdl_name,a.pdl_number,a.visit_date,a.time_slot,a.status,a.relationship_to_pdl,a.visit_type,a.jail_facility_name,a.qr_token,u.account_status,u.mobile_number,(a.visit_date=CURDATE()) AS is_today,(SELECT k.status FROM kyc_submissions k WHERE k.user_id=u.id ORDER BY k.submitted_at DESC LIMIT 1) AS kyc_status FROM appointments a JOIN users u ON u.id=a.user_id WHERE a.is_archived=0 AND u.is_archived=0 AND NOT EXISTS (SELECT 1 FROM pdls p WHERE p.id=a.pdl_id AND p.is_archived=1) AND (a.qr_token=? OR a.appointment_reference=?) AND a.visit_date>=CURDATE() LIMIT 1`,[key,key]);const r=rows[0];if(!r)return res.status(404).json({error:'No visit pass matched that code.'});const data={id:r.id,appointmentReference:r.appointment_reference,visitor:{id:String(r.user_id),name:r.visitor_name,visitorId:`VIS-${String(r.user_id).padStart(5,'0')}`,mobileMasked:r.mobile_number?String(r.mobile_number).replace(/(\+63\d{2})\d{5}(\d{2})$/,'$1•••••$2'):null,accountStatus:r.account_status,verificationStatus:r.kyc_status||'NOT_SUBMITTED'},visit:{status:r.status,scheduledDate:String(r.visit_date).slice(0,10),scheduledTime:r.time_slot,relationship:r.relationship_to_pdl,visitType:r.visit_type,facility:r.jail_facility_name},pdl:{name:r.pdl_name,pdlId:r.pdl_number}};await recordAudit((req as any).user,'VISITOR_QR_SCANNED','APPOINTMENT',String(r.id),'SUCCESS',{},req.ip);res.json({result:data,canProceed:r.status==='Approved'&&Boolean(r.is_today)&&['ACTIVATED','ACTIVE'].includes(r.account_status)&&r.kyc_status==='VERIFIED'})});
workerRouter.post('/visits/:id/verify',workerActionLimit,async(req,res)=>{const [rows]=await pool.query<any[]>(`SELECT a.id,a.status,(a.visit_date=CURDATE()) AS is_today,u.account_status,(SELECT k.status FROM kyc_submissions k WHERE k.user_id=u.id ORDER BY k.submitted_at DESC LIMIT 1) AS kyc_status FROM appointments a JOIN users u ON u.id=a.user_id WHERE a.id=? AND a.is_archived=0 AND u.is_archived=0 AND NOT EXISTS (SELECT 1 FROM pdls p WHERE p.id=a.pdl_id AND p.is_archived=1)`,[req.params.id]);if(!rows[0])return res.status(404).json({error:'Visit not found.'});const eligible=rows[0].status==='Approved'&&Boolean(rows[0].is_today)&&['ACTIVE','ACTIVATED'].includes(rows[0].account_status)&&rows[0].kyc_status==='VERIFIED';await recordAudit((req as any).user,eligible?'VISIT_FINGERPRINT_UNAVAILABLE':'VISIT_VERIFICATION_FAILED','APPOINTMENT',req.params.id,eligible?'BLOCKED':'FAILURE',{reason:eligible?'No biometric verification provider is connected.':'Visit is not eligible for admission.'},req.ip);res.json({success:false,result:eligible?'UNAVAILABLE':'FAILED',message:eligible?'Fingerprint device is not connected. Refer the visitor to the records desk; do not admit based on QR matching alone.':'Verification failed. Refer the visitor to the records desk.'})});
app.use('/api/worker',requireWorker,workerRouter);

// Users (staff only)
app.get('/api/users', requireAdmin, async (_req, res) => { res.json(await getAllUsers()); });

app.get('/api/users/:id', requireAdmin, async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.patch('/api/users/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, officerName } = req.body;
    if (!['ACTIVE','ACTIVATED','PENDING_VERIFICATION','PENDING_BIOMETRICS','SUSPENDED','REJECTED'].includes(status)) return res.status(400).json({error:'Invalid account status.'});
    const target=await getUserById(req.params.id); if(!target)return res.status(404).json({error:'User not found'});
    if (['ACTIVE','ACTIVATED'].includes(status) && !target.biometricScannedAt) return res.status(503).json({error:'Fingerprint verification hardware is not connected; account activation is unavailable.'});
    if (['ACTIVE','ACTIVATED','PENDING_BIOMETRICS'].includes(status) && !['ACTIVE','ACTIVATED','PENDING_BIOMETRICS'].includes(target.accountStatus)) {
      const [contact]=await pool.query<any[]>('SELECT email_verified_at,phone_verified_at FROM users WHERE id=?',[req.params.id]);
      const [kyc]=await pool.query<any[]>('SELECT status FROM kyc_submissions WHERE user_id=? ORDER BY submitted_at DESC LIMIT 1',[req.params.id]);
      if ((!contact[0]?.email_verified_at&&!contact[0]?.phone_verified_at)||kyc[0]?.status!=='VERIFIED') return res.status(409).json({error:'Contact verification and approved identity review are required first.'});
    }
    const updated = await updateUserStatus(req.params.id, status, officerName);
    await recordAudit((req as any).user, status==='SUSPENDED'?'ACCOUNT_SUSPENDED':status==='ACTIVE'||status==='ACTIVATED'?'ACCOUNT_REACTIVATED':'ACCOUNT_STATUS_UPDATED','USER',req.params.id,'SUCCESS',{status},req.ip);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    broadcast('USER_STATUS_UPDATED', updated, updated.id);
    broadcast('STATS_UPDATED', await getStats());
    res.json({ success: true, user: updated });
  } catch (e: any) { res.status(500).json({ error: 'The request could not be completed.' }); }
});

// PDLs
app.get('/api/pdls', requireAdmin, async (_req, res) => { res.json(await getAllPdls()); });

app.get('/api/visitor/pdls', visitorActive, async (_req, res) => {
  const records = await getAllPdls();
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(records.filter((p: any) => p.status === 'In Custody').map((p: any) => ({
    id: p.id, pdlNumber: p.pdlNumber, fullName: p.fullName,
    jailFacilityId: p.jailFacilityId, cellDormitory: p.cellDormitory, status: p.status,
  })));
});

app.post('/api/pdls', requireAdmin, async (req, res) => {
  try {
    const pdl = await createPdl(req.body);
    await recordAudit((req as any).user,'CREATE','PDL',String(pdl?.id||''),'SUCCESS',{},req.ip);
    broadcast('PDL_ADDED', pdl);
    broadcast('STATS_UPDATED', await getStats());
    res.status(201).json({ success: true, pdl });
  } catch (e: any) { res.status(400).json({ error: 'Could not save the PDL record. Check the submitted fields.' }); }
});

app.put('/api/pdls/:id', requireAdmin, async (req, res) => {
  try {
    const pdl = await createPdl({ ...req.body, id: req.params.id });
    await recordAudit((req as any).user,'UPDATE','PDL',req.params.id,'SUCCESS',{},req.ip);
    broadcast('PDL_UPDATED', pdl);
    broadcast('STATS_UPDATED', await getStats());
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

// Appointments
app.get('/api/appointments', async (req, res) => {
  const user=(req as any).user;
  if (user.role==='ADMIN'||user.role==='SUPER_ADMIN') return res.json(await getAllAppointments());
  if (['WORKER','GUARD'].includes(user.role)) return res.json(await getWorkerAppointments());
  const rows=await getAllAppointments(); return res.json(rows.filter((a:any)=>String(a.userId)===String(user.id)));
});

app.post('/api/appointments', visitorActive, async (req, res) => {
  try {
    const user=(req as any).user;
    const { pdlId, visitType, relationshipToPDL, visitDate, timeSlot, paabotItemsDescription } = req.body || {};
    const date = typeof visitDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(visitDate) ? new Date(`${visitDate}T00:00:00`) : null;
    const today = new Date(); today.setHours(0,0,0,0);
    if (!pdlId || !date || Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== visitDate || date <= today ||
      !['Contact Visit','Non-Contact (Glass Barrier)','E-Dalaw (Online Video Call)'].includes(visitType) ||
      !['Spouse','Parent','Child','Sibling','Legal Counsel','Relative','Common-Law Partner'].includes(relationshipToPDL) ||
      !['Morning Batch (09:00 AM - 11:30 AM)','Afternoon Batch (01:00 PM - 03:30 PM)'].includes(timeSlot) ||
      typeof relationshipToPDL !== 'string' || relationshipToPDL.length > 80 || !relationshipToPDL.trim() ||
      typeof timeSlot !== 'string' || timeSlot.length > 100) {
      return res.status(400).json({ error: 'Choose a valid current PDL, visit type, relationship, future date, and time slot.' });
    }
    const pdl = (await getAllPdls()).find((record: any) => record.id === pdlId && record.status === 'In Custody');
    if (!pdl) return res.status(400).json({ error: 'That PDL is not currently available for visitation booking.' });
    const [facilities] = await pool.query<any[]>('SELECT id,name FROM jail_facilities WHERE id=?', [pdl.jailFacilityId]);
    if (!facilities[0]) return res.status(400).json({ error: 'The selected PDL facility is not available for booking.' });
    const visitorName = [user.firstName,user.middleName,user.lastName,user.suffix].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
    const appt = await createAppointment({
      id: randomUUID(), appointmentReference: `BJMP-IMUS-${randomUUID().slice(0,8).toUpperCase()}`,
      userId: user.id, visitorName, visitorContact: user.mobileNumber || user.email || '',
      pdlId: pdl.id, pdlName: pdl.fullName, pdlNumber: pdl.pdlNumber,
      jailFacilityId: pdl.jailFacilityId, jailFacilityName: facilities[0].name, cellDormitory: pdl.cellDormitory,
      visitType, relationshipToPdl: relationshipToPDL.trim(), visitDate, timeSlot: timeSlot.trim(),
      paabotItemsDescription: typeof paabotItemsDescription === 'string' ? paabotItemsDescription.slice(0,1000) : '',
      status: 'Pending Review', qrToken: randomBytes(32).toString('hex'),
    });
    await recordAudit(user,'APPOINTMENT_CREATED','APPOINTMENT',String(appt.id),'SUCCESS',{},req.ip);
    broadcast('APPOINTMENT_CREATED', appt, String(user.id));
    broadcast('STATS_UPDATED', await getStats());
    res.status(201).json({ success: true, appointment: appt });
  } catch (e: any) { res.status(400).json({ error: 'Could not create the visit appointment. Check the submitted fields.' }); }
});

app.patch('/api/appointments/:id/status', async (req, res) => {
  try {
    const user=(req as any).user; const requestedStatus=String(req.body.status||'');
    if(!['Pending Review','Approved','Completed','Cancelled'].includes(requestedStatus))return res.status(400).json({error:'Invalid appointment status.'});
    if(user.role==='VISITOR') {
      if(requestedStatus!=='Cancelled')return res.status(403).json({error:'You may only cancel your own appointment.'});
      const [owned]=await pool.query<any[]>('SELECT user_id,status FROM appointments WHERE id=?',[req.params.id]);
      if(!owned[0]||String(owned[0].user_id)!==String(user.id))return res.status(404).json({error:'Appointment not found.'});
      if(['Completed','Cancelled'].includes(owned[0].status))return res.status(409).json({error:'This appointment can no longer be cancelled.'});
    } else if(!['ADMIN','SUPER_ADMIN'].includes(user.role)) return res.status(403).json({error:'You do not have permission.'});
    const updated = await updateAppointmentStatus(req.params.id, requestedStatus);
    if (!updated) return res.status(404).json({ error: 'Appointment not found' });
    await recordAudit(user,'APPOINTMENT_STATUS_UPDATED','APPOINTMENT',req.params.id,'SUCCESS',{status:requestedStatus},req.ip);
    broadcast('APPOINTMENT_STATUS_UPDATED', updated, String(user.id));
    broadcast('STATS_UPDATED', await getStats());
    res.json({ success: true, appointment: updated });
  } catch (e: any) { res.status(500).json({ error: 'The request could not be completed.' }); }
});

app.delete('/api/appointments/:id', requireAdmin, async (req, res) => {
  const actor=(req as any).user,reason=String(req.body?.reason||'Administrator archive').trim().slice(0,1000);
  const conn=await pool.getConnection();try{await conn.beginTransaction();const [rows]=await conn.query<any[]>('SELECT appointment_reference,created_at,status FROM appointments WHERE id=? AND is_archived=0 FOR UPDATE',[req.params.id]);if(!rows[0]){await conn.rollback();return res.status(404).json({error:'Active appointment not found.'})}await conn.query('UPDATE appointments SET is_archived=1,archived_at=NOW(),archived_by=?,archive_reason=? WHERE id=?',[actor.id,reason,req.params.id]);await conn.query('INSERT INTO record_archive_events(record_type,record_id,action,record_label,original_created_at,previous_status,reason,actor_user_id) VALUES(?,?,?,?,?,?,?,?)',['APPOINTMENT',req.params.id,'ARCHIVE',rows[0].appointment_reference,rows[0].created_at,rows[0].status,reason,actor.id]);await conn.query('INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details,ip_address) VALUES(?,?,?,?,?,?,?,?)',[actor.id,actor.role,'ARCHIVE','APPOINTMENT',req.params.id,'SUCCESS',JSON.stringify({reason,previousStatus:rows[0].status}),req.ip]);await conn.commit();}catch{await conn.rollback();return res.status(500).json({error:'Could not archive this visit.'})}finally{conn.release()}
  broadcast('APPOINTMENT_DELETED', { id: req.params.id }); broadcast('STATS_UPDATED', await getStats()); res.json({ success: true });
});

// Gate Scan
app.post('/api/gate/scan', requireAdmin, async (req, res) => {
  try {
    const log = await logGateScan(req.body);
    await recordAudit((req as any).user,'VISITOR_VERIFICATION','VISITOR',String(req.body.userId||''),'SUCCESS',{result:req.body.action},req.ip);
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
  } catch (e: any) { res.status(500).json({ error: 'The request could not be completed.' }); }
});

app.get('/api/gate/logs', requireAdmin, async (_req, res) => { res.json(await getGateLogs()); });

// Incidents
app.get('/api/incidents', requireAdmin, async (_req, res) => { res.json(await getIncidents()); });

app.post('/api/incidents', requireAdmin, async (req, res) => {
  try {
    const inc = await createIncident(req.body);
    await recordAudit((req as any).user,'CREATE','SECURITY_INCIDENT',String(inc?.id||''),'SUCCESS',{},req.ip);
    broadcast('SECURITY_INCIDENT_REPORTED', inc);
    res.status(201).json({ success: true, incident: inc });
  } catch (e: any) { res.status(500).json({ error: 'The request could not be completed.' }); }
});

// Announcements
app.get('/api/announcements', async (_req, res) => { res.json(await getAnnouncements()); });

app.post('/api/announcements', requireAdmin, async (req, res) => {
  try {
    const ann = await createAnnouncement(req.body);
    await recordAudit((req as any).user,'CREATE','ANNOUNCEMENT',String(ann?.id||''),'SUCCESS',{},req.ip);
    broadcast('ANNOUNCEMENT_BROADCAST', ann);
    res.status(201).json({ success: true, announcement: ann });
  } catch (e: any) { res.status(500).json({ error: 'The request could not be completed.' }); }
});

// Stats
app.get('/api/stats', requireAdmin, async (_req, res) => { res.json(await getStats()); });

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    console.log('🔌 Connecting to XAMPP MySQL database...');
    await initDatabase();
    await hashLegacyPasswords(hashPass);
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
