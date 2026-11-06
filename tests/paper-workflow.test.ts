import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import {WebSocket} from 'ws';
import {ageOn,validateCompanions,withinVisitWindow,manilaDate} from '../backend/validation.ts';
import {normalizePhilippineMobileNumber,normalizeEmail} from '../backend/identity.ts';
import {geographicOptions,validateAddress,zipSuggestions} from '../backend/geography.ts';
dotenv.config({quiet:true});
const database=`bjmp_paper_test_${Date.now()}_${randomBytes(3).toString('hex')}`,adminPassword=`TestOnly!${randomBytes(12).toString('hex')}`;
const messages:string[]=[];
const hardwareToken=randomBytes(32).toString('hex');
let root:any,db:any,backend:any,base='',smtp:net.Server,owned=false,gate:any;
before(async()=>{
 root=await mysql.createConnection({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT)||3306,user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||''});
 assert.match(database,/^bjmp_paper_test_\d+_[a-f0-9]{6}$/);await root.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`);owned=true;
 smtp=net.createServer(socket=>{let input='',data=false,content='';socket.setEncoding('utf8');socket.write('220 localhost test SMTP\r\n');socket.on('data',chunk=>{input+=chunk;let pos:number;while((pos=input.indexOf('\r\n'))>=0){const line=input.slice(0,pos);input=input.slice(pos+2);if(data){if(line==='.'){messages.push(content);content='';data=false;socket.write('250 queued\r\n')}else content+=line+'\n';continue}if(/^EHLO|^HELO/i.test(line))socket.write('250-localhost\r\n250 AUTH PLAIN\r\n');else if(/^AUTH/i.test(line))socket.write('235 authenticated\r\n');else if(/^DATA/i.test(line)){data=true;socket.write('354 End with dot\r\n')}else if(/^QUIT/i.test(line))socket.end('221 bye\r\n');else socket.write('250 OK\r\n')}})});
 smtp.listen(0,'127.0.0.1');await once(smtp,'listening');
 Object.assign(process.env,{DB_NAME:database,NODE_ENV:'test',PORT:'0',SESSION_SECRET:randomBytes(32).toString('hex'),INITIAL_ADMIN_EMAIL:'paper-admin@example.invalid',INITIAL_ADMIN_PASSWORD:adminPassword,INITIAL_WORKER_PASSWORD:'',SMS_PROVIDER:'mock',SMTP_HOST:'127.0.0.1',SMTP_PORT:String((smtp.address() as net.AddressInfo).port),SMTP_SECURE:'false',SMTP_USER:'test@example.invalid',SMTP_PASS:'test-only',SMTP_FROM:'test@example.invalid',COMPANION_LIMIT:'2',COMPANION_RELATIONSHIPS:'Spouse,Parent,Sibling,Adult Child',HARDWARE_DEVICE_TOKEN:hardwareToken});
 backend=await import('../backend/index.ts');db=await import('../backend/database/db.ts');gate=await import('../backend/gate.ts');if(!backend.server.listening)await once(backend.server,'listening');backend.app.set('trust proxy','loopback');base=`http://127.0.0.1:${(backend.server.address() as net.AddressInfo).port}/api`;
});
after(async()=>{
 if(backend?.server?.listening)await new Promise<void>(resolve=>backend.server.close(()=>resolve()));if(db?.pool)await db.pool.end();if(smtp?.listening)await new Promise<void>(resolve=>smtp.close(()=>resolve()));
 if(owned&&root){assert.match(database,/^bjmp_paper_test_\d+_[a-f0-9]{6}$/);await root.query(`DROP DATABASE \`${database}\``)}await root?.end();
});
let nextIp=1;
class Browser{
 cookies=new Map<string,string>();ip=`10.42.${Math.floor(nextIp/250)}.${nextIp++%250+1}`;
 async request(path:string,body?:any,method=body?'POST':'GET'){
 const response=await fetch(base+path,{signal:AbortSignal.timeout(10000),method,headers:{'Content-Type':'application/json','X-Forwarded-For':this.ip,Cookie:[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; ')},...(body?{body:JSON.stringify(body)}:{})});
 for(const cookie of response.headers.getSetCookie()){const [pair]=cookie.split(';'),i=pair.indexOf('='),key=pair.slice(0,i),value=pair.slice(i+1);if(/Max-Age=0(?:;|$)/.test(cookie))this.cookies.delete(key);else this.cookies.set(key,value)}return {status:response.status,body:await response.json()};
 }
}
function address(){const region=geographicOptions('regions').find((x:any)=>x.code==='0400000000'),province=geographicOptions('provinces',region.code).find((x:any)=>x.name==='Cavite'),city=geographicOptions('cities',province.code).find((x:any)=>x.name==='City of Imus'),barangay=geographicOptions('barangays',city.code)[0];return validateAddress({regionCode:region.code,provinceCode:province.code,cityCode:city.code,barangayCode:barangay.code,houseNumber:'17',streetName:'Fictional Test Street',zipCode:'4103'})}
function details(email:string,phone=''){return {firstName:'Synthetic',middleName:'Test',lastName:'Visitor',suffix:'Jr.',dateOfBirth:'1980-02-15',gender:'Female',email,mobileNumber:phone,password:'Synthetic!Password123',address:address()}}
function mailCode(index=messages.length-1){const raw=messages[index];const decoded=raw.replace(/=\n/g,'').replace(/=([A-F0-9]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));const match=decoded.match(/code is (\d{6})/);assert.ok(match,'local test SMTP captured an OTP');return match[1]}
function nextEvent(ws:WebSocket,predicate:(event:any)=>boolean){return new Promise<any>((resolve,reject)=>{const timeout=setTimeout(()=>{ws.off('message',handler);reject(Error('Test hardware event timed out'))},5000);function handler(raw:any){const event=JSON.parse(String(raw));if(predicate(event)){clearTimeout(timeout);ws.off('message',handler);resolve(event)}}ws.on('message',handler)})}
const admin=new Browser(),visitor=new Browser();let visitorUser:any;
const hours='Visiting hours (08:00 AM - 04:00 PM)',password='PaperSynthetic!Password123';
let paper:any,authModule:any,people:any[]=[],visit:any,officerId:string;
async function syntheticVisitor(i:number){
  const user=await db.createUser({...details(`paper-visitor-${i}@example.invalid`),firstName:'Fictional',middleName:'',lastName:`Visitor${i}`,suffix:'',dateOfBirth:'1980-01-01',passwordHash:await authModule.hashPass(password),role:'VISITOR',accountStatus:'ACTIVATED',emailVerifiedAt:new Date(),biometricScannedAt:new Date(),biometricReferenceNumber:`paper-template-${i}`});
  await db.pool.query("INSERT INTO kyc_submissions(user_id,id_type,id_number_encrypted,id_number_hash,id_number_last4,full_name,status,automated_check) VALUES(?,'Test','test-only',?,'1234',?,'VERIFIED','{}')",[user.id,`synthetic-paper-id-${i}`,`Fictional Visitor${i}`]);
  return user;
}
async function link(userId:string,pdl='paper-pdl'){return admin.request(`/visitation/pdls/${pdl}/visitors`,{userId,relationship:'Sibling'});}
const booking=(date='2030-01-01',extra:any={})=>({pdlId:'paper-pdl',visitType:'Contact Visit',relationshipToPDL:'Sibling',visitDate:date,timeSlot:hours,companions:[],...extra});

test('paper migration is repeatable, retains records and issues unique permanent visitor QR identifiers',async()=>{
  authModule=await import('../backend/auth.ts');paper=await import('../backend/visitation.ts');
  assert.equal((await admin.request('/auth/login',{identifier:'paper-admin@example.invalid',password:adminPassword})).status,200);
  await db.pool.query("INSERT INTO pdls(id,pdl_number,first_name,last_name,sex,jail_facility_id,cell_dormitory,status) VALUES('paper-pdl','PAPER-FICTIONAL-001','Fictional','PDL','Male','imus-city-jail-male','Test dorm','In Custody')");
  for(let i=0;i<9;i++)people.push(await syntheticVisitor(i));
  const qr=people.map(p=>p.permanentQrToken);assert.equal(new Set(qr).size,9);assert.ok(qr.every(q=>/^[a-f0-9]{64}$/.test(q)));
  await db.initDatabase();assert.deepEqual((await db.getAllUsers()).filter(u=>u.role==='VISITOR').map(u=>u.permanentQrToken).sort(),qr.sort());
  const facilities = (await admin.request('/facilities')).body;
  assert.ok(facilities.some(f => f.id === 'imus-city-jail-male'));
  assert.ok(facilities.some(f => f.id === 'imus-city-jail-female'));
  assert.equal((await db.getAllPdls()).length,1);assert.equal((await admin.request('/visitation/admin')).body.visitorLimit,7);
  visitorUser=people[0];assert.equal((await visitor.request('/auth/login',{identifier:visitorUser.email,password})).status,200);
});
test('activated visitors see no unrelated PDLs and cannot select dates before approved linkage and day assignment',async()=>{
  assert.deepEqual((await visitor.request('/visitor/pdls')).body,[]);assert.deepEqual((await visitor.request('/visitation/linked-pdls')).body,[]);
  assert.equal((await visitor.request('/appointments',booking())).status,400);
  assert.equal((await visitor.request('/visitation/pdls/paper-pdl/day',{weekday:2,reason:'Unauthorized'},'PUT')).status,403);
});
test('weekly day and named connections notify both verified contacts without requiring a selected date',async()=>{
  assert.equal((await admin.request('/visitation/pdls/paper-pdl/day',{weekday:2,reason:'Synthetic Tuesday schedule'},'PUT')).status,200);
  await db.pool.query("UPDATE users SET mobile_number='+639179990000',phone_verified_at=NOW() WHERE id=?",[people[0].id]);
  assert.equal((await link(people[0].id)).status,201);await paper.dispatchScheduleNotifications();
  const [jobs]=await db.pool.query('SELECT channel,message,status FROM pdl_schedule_notifications WHERE user_id=?',[people[0].id]);
  assert.deepEqual(jobs.map(j=>j.channel).sort(),['email','sms']);assert.ok(jobs.every(j=>j.message.includes('Fictional PDL')&&j.message.includes('Tuesday')));
  assert.equal((await db.getAllAppointments()).length,0);const linked=(await visitor.request('/visitation/linked-pdls')).body;
  assert.equal(linked.length,1);assert.equal(linked[0].weekday,2);assert.equal(linked[0].primaryOffense,undefined);
});
test('concurrent approved-list additions enforce the seven-name limit without deleting archived connections',async()=>{
  const results=await Promise.all(people.slice(1).map(p=>link(p.id)));assert.equal(results.filter(r=>r.status===201).length,6);assert.equal(results.filter(r=>r.status===400).length,2);
  const [rows]=await db.pool.query("SELECT user_id FROM pdl_visitor_links WHERE pdl_id='paper-pdl' AND is_active=1");assert.equal(rows.length,7);
  const remove=String(rows.find(r=>String(r.user_id)!==people[0].id).user_id);
  assert.equal((await admin.request(`/visitation/pdls/paper-pdl/visitors/${remove}/archive`,{reason:'Synthetic list correction'})).status,200);
  const [preserved]=await db.pool.query('SELECT is_active,archive_reason FROM pdl_visitor_links WHERE pdl_id=? AND user_id=?',['paper-pdl',remove]);assert.equal(preserved[0].is_active,0);assert.ok(preserved[0].archive_reason);
  assert.equal((await admin.request('/visitation/policy',{visitorLimit:5},'PUT')).status,400);
  assert.equal((await admin.request('/visitation/policy',{visitorLimit:8},'PUT')).status,200);
});
test('date selection enforces assigned weekdays, fixed hours, uniqueness and approved companion membership without an approval cycle',async()=>{
  assert.equal((await visitor.request('/appointments',booking('2030-01-02'))).status,400);
  assert.equal((await visitor.request('/appointments',booking('2030-01-01',{timeSlot:'Morning Batch (09:00 AM - 11:30 AM)'}))).status,400);
  assert.equal((await visitor.request('/appointments',booking('2030-01-01',{companions:[{fullName:'Unlisted Person',dateOfBirth:'1980-01-01',relationshipToPdl:'Sibling'}]}))).status,400);
  const result=await visitor.request('/appointments',booking());assert.equal(result.status,201,JSON.stringify(result.body));visit=result.body.appointment;
  assert.equal(visit.status,'Approved');assert.equal(visit.selectionMode,'PDL_DAY');
  await paper.dispatchScheduleNotifications();
  const [notices] = await db.pool.query('SELECT channel,status,message FROM pdl_schedule_notifications WHERE appointment_id=?',[visit.id]);
  assert.deepEqual(notices.map(n => n.channel+':'+n.status).sort(), ['email:ACCEPTED','sms:MOCK']);
  assert.ok(notices.every(n => n.message.includes('2030-01-01') && n.message.includes('Male Dormitory')));
  assert.equal((await visitor.request('/appointments',booking())).status,400);
  assert.equal((await admin.request(`/appointments/${visit.id}/status`,{status:'Pending Review'},'PATCH')).status,400);
});
test('visitors can change their own unused date, cannot change another visitor record, and receive a new confirmation',async()=>{
  const outsider=new Browser();await outsider.request('/auth/login',{identifier:people[1].email,password});
  assert.equal((await outsider.request(`/visitation/visits/${visit.id}/date`,{visitDate:'2030-01-08'},'PATCH')).status,404);
  assert.equal((await visitor.request(`/visitation/visits/${visit.id}/date`,{visitDate:'2030-01-09'},'PATCH')).status,400);
  assert.equal((await visitor.request(`/visitation/visits/${visit.id}/date`,{visitDate:'2030-01-08'},'PATCH')).status,200);
  await paper.dispatchScheduleNotifications();
  const [notices] = await db.pool.query("SELECT channel,status,message FROM pdl_schedule_notifications WHERE appointment_id=? AND message LIKE '%2030-01-08%'",[visit.id]);
  assert.deepEqual(notices.map(n => n.channel+':'+n.status).sort(), ['email:ACCEPTED','sms:MOCK']);
  assert.ok(notices.every(n => n.message.includes('date was changed')));
  assert.equal((await visitor.request(`/visitation/visits/${visit.id}/date`,{visitDate:'2030-01-01'},'PATCH')).status,200);
});
test('permanent QR plus current linkage, schedule, fingerprint proof and visiting hours are all required; entry and exit are single-use',async()=>{
  const ActualDate=Date;const fixed=new ActualDate('2030-01-01T00:30:00Z');
  // Fixed calendar and synthetic identity are confined to this isolated test process.
  class FixedDate extends ActualDate{constructor(...args:any[]){super(fixed.getTime());if(args.length)return Reflect.construct(ActualDate,args,new.target);}static now(){return fixed.getTime();}}
  (globalThis as any).Date=FixedDate;
  try{
    assert.equal(withinVisitWindow('2030-01-01',hours),true);assert.equal(withinVisitWindow('2030-01-01',hours,new ActualDate('2030-01-01T08:00:00Z')),false);
    const actor=(await admin.request('/auth/me')).body.user;
    const proof=await gate.createGateProof(actor.id,people[0].id,visit.id,'paper-template-0');
    assert.equal((await admin.request('/gate/scan',{code:visit.qrToken,proof})).status,403);
    assert.equal((await admin.request('/gate/scan',{code:people[1].permanentQrToken,proof})).status,403);
    assert.equal((await admin.request('/gate/scan',{code:people[0].permanentQrToken,proof})).status,200);
    const admitted=await Promise.all([admin.request(`/gate/visits/${visit.id}/admit`,{requestId:proof}),admin.request(`/gate/visits/${visit.id}/admit`,{requestId:proof})]);assert.equal(admitted.filter(r=>r.status===200).length,1);
    const exits=await Promise.all([admin.request(`/gate/visits/${visit.id}/exit`,{}),admin.request(`/gate/visits/${visit.id}/exit`,{})]);assert.deepEqual(exits.map(r=>r.status).sort(),[200,409]);
    const [logs]=await db.pool.query('SELECT action FROM gate_logs WHERE appointment_id=?',[visit.id]);assert.equal(logs.length,2);
    const [attendance]=await db.pool.query('SELECT time_out FROM visitor_log_entries WHERE appointment_id=?',[visit.id]);assert.equal(attendance.length,2);assert.ok(attendance.every(a=>a.time_out));
  }finally{(globalThis as any).Date=ActualDate;}
});
test('changing a PDL day notifies linked visitors without selections and invalidates old upcoming selections and schedule proofs',async()=>{
  const result=await visitor.request('/appointments',booking('2030-01-08'));assert.equal(result.status,201);const old=result.body.appointment;
  const actor=(await admin.request('/auth/me')).body.user;await gate.createGateProof(actor.id,people[0].id,old.id,'paper-template-0');
  assert.equal((await admin.request('/visitation/pdls/paper-pdl/day',{weekday:3,reason:'Synthetic Wednesday schedule'},'PUT')).status,200);
  const [proofs]=await db.pool.query('SELECT COUNT(*) AS n FROM gate_verification_sessions WHERE appointment_id=?',[old.id]);assert.equal(proofs[0].n,0);
  const [jobs]=await db.pool.query('SELECT COUNT(DISTINCT user_id) AS n FROM pdl_schedule_notifications WHERE message LIKE ?',['%Wednesday%']);assert.ok(jobs[0].n>=6);
  assert.equal((await db.getAllAppointments()).find(a=>a.id===old.id).status,'Cancelled');assert.equal((await db.getAllAppointments()).find(a=>a.id===visit.id).status,'Completed');
  assert.equal((await visitor.request('/appointments',booking('2030-01-08'))).status,400);assert.equal((await visitor.request('/appointments',booking('2030-01-09'))).status,201);
});
test('administrator-created Officer accounts verify contacts, then enforce and update individual duty assignments',async()=>{
  const request={firstName:'Fictional',middleName:'',lastName:'Officer',dateOfBirth:'1985-01-01',suffix:'',email:'paper-officer@example.invalid',password,badgeNumber:'TEST-OFFICER-001',officerDuties:['RECORDS']};
  const created=await admin.request('/staff',request);assert.equal(created.status,201,JSON.stringify(created.body));const otp=mailCode();
  const officer=new Browser(),signed=await officer.request('/auth/login',{identifier:request.email,password});assert.equal(signed.status,200);officerId=signed.body.user.id;assert.equal(signed.body.user.role,'OFFICER');
  assert.equal((await officer.request('/worker/pdls')).status,403);assert.equal((await officer.request('/auth/verify-otp',{code:otp})).status,200);
  assert.equal((await officer.request('/worker/pdls')).status,200);assert.equal((await officer.request('/worker/visitors/today')).status,403);assert.equal((await officer.request('/admin/kyc')).status,403);assert.equal((await officer.request('/enrollment/visitors')).status,403);assert.equal((await officer.request('/staff',request)).status,403);
  assert.equal((await admin.request(`/staff/${officerId}`,{badgeNumber:request.badgeNumber,status:'ACTIVE',officerDuties:['GATE']},'PATCH')).status,200);assert.equal((await officer.request('/auth/me')).status,401);
  await officer.request('/auth/login',{identifier:request.email,password});assert.equal((await officer.request('/worker/pdls')).status,403);assert.equal((await officer.request('/worker/visitors/today')).status,200);
  const history=await officer.request('/worker/visit-history?q=Fictional');assert.equal(history.status,200);assert.ok(history.body.some(v=>v.time_out&&v.entry_officer));
  assert.equal((await admin.request(`/admin/archive/USER/${officerId}`,{reason:'Synthetic archived Officer'})).status,200);assert.equal((await officer.request('/auth/me')).status,401);
  assert.equal((await admin.request(`/admin/archive/USER/${officerId}/restore`,{})).status,200);assert.equal((await officer.request('/auth/me')).status,401);assert.equal((await officer.request('/auth/login',{identifier:request.email,password})).status,200);
});
test('incident corrections preserve original reporter and timestamp and record full audited history',async()=>{
  const payload={visitorName:'Fictional Test Visitor',facility:'Synthetic test facility',incidentType:'Fake/Expired ID',description:'Synthetic test observation only',actionTaken:'Synthetic review recorded',reportingOfficer:'Spoofed name',timestamp:'fake date'};
  const r=await admin.request('/incidents',payload);assert.equal(r.status,201);const original=r.body.incident;assert.notEqual(original.reporting_officer,'Spoofed name');assert.notEqual(original.timestamp,'fake date');
  assert.equal((await visitor.request(`/incidents/${original.id}`,{...payload,reason:'Unauthorized'},'PATCH')).status,403);
  const updated=await admin.request(`/incidents/${original.id}`,{...payload,description:'Synthetic corrected observation',reason:'Correction in isolated test'},'PATCH');assert.equal(updated.status,200);assert.equal(updated.body.incident.timestamp,original.timestamp);assert.equal(updated.body.incident.reporting_officer,original.reporting_officer);
  const history=await admin.request(`/incidents/${original.id}/history`);assert.ok(history.body.some(h=>h.action==='INCIDENT_UPDATED'));
});
test('mobile-only password recovery uses verified SMS, keeps generic public responses and invalidates previous sessions',async()=>{
  const phone='+639179998888',u=await db.createUser({...details('',phone),passwordHash:await authModule.hashPass(password),accountStatus:'ACTIVE'});await db.pool.query('UPDATE users SET phone_verified_at=NOW() WHERE id=?',[u.id]);
  const browser=new Browser();await browser.request('/auth/login',{identifier:phone,password});const actualFetch=globalThis.fetch,captured:string[]=[];
  const old={provider:process.env.SMS_PROVIDER,url:process.env.SMS_API_URL,account:process.env.SMS_ACCOUNT_ID,token:process.env.SMS_AUTH_TOKEN,from:process.env.SMS_FROM};
  Object.assign(process.env,{SMS_PROVIDER:'twilio',SMS_API_URL:'https://sms.synthetic.invalid/Messages.json',SMS_ACCOUNT_ID:'test',SMS_AUTH_TOKEN:'test',SMS_FROM:'test'});
  globalThis.fetch=(async(input:any,init:any)=>{if(String(input)==='https://sms.synthetic.invalid/Messages.json'){captured.push(String(new URLSearchParams(init.body).get('Body')));return new Response(JSON.stringify({sid:'SYNTHETIC-ONLY'}),{status:201,headers:{'Content-Type':'application/json'}});}return actualFetch(input,init);}) as any;
  try{
    const recovery=new Browser(),present=await recovery.request('/auth/forgot-password',{identifier:phone}),absent=await new Browser().request('/auth/forgot-password',{identifier:'+639170000001'});assert.deepEqual(present.body,absent.body);assert.equal(captured.length,1);
    const code=captured[0].match(/code is (\d{6})/)![1],verified=await recovery.request('/auth/verify-reset',{identifier:phone,code});assert.equal(verified.status,200);
    assert.equal((await recovery.request('/auth/reset-password',{identifier:phone,token:verified.body.token,password:'Replacement!Paper123',confirmPassword:'Replacement!Paper123'})).status,200);
    assert.equal((await browser.request('/auth/me')).status,401);assert.equal((await browser.request('/auth/login',{identifier:phone,password:'Replacement!Paper123'})).status,200);
  }finally{globalThis.fetch=actualFetch;for(const [key,value] of Object.entries({SMS_PROVIDER:old.provider,SMS_API_URL:old.url,SMS_ACCOUNT_ID:old.account,SMS_AUTH_TOKEN:old.token,SMS_FROM:old.from})){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});

test('records-assigned Officers persist PDL signature input and visitors cannot read or alter the underlying record',async()=>{
 assert.equal((await admin.request(`/staff/${officerId}`,{badgeNumber:'TEST-OFFICER-001',status:'ACTIVE',officerDuties:['RECORDS']},'PATCH')).status,200);
 const officer=new Browser();assert.equal((await officer.request('/auth/login',{identifier:'paper-officer@example.invalid',password})).status,200);
 const pdl=(await officer.request('/worker/pdls')).body.find(p=>p.id==='paper-pdl');
 const signature='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+j8AAAAASUVORK5CYII=';
 const saved=await officer.request('/worker/pdls',{...pdl,signatureDataUrl:signature,signatureCapturedAt:new Date().toISOString()});assert.equal(saved.status,200);assert.equal(saved.body.pdl.signatureDataUrl,signature);
 assert.equal((await officer.request('/worker/pdls')).body.find(p=>p.id==='paper-pdl').signatureDataUrl,signature);
 assert.equal((await visitor.request('/pdl-form-records?pdlId=paper-pdl')).status,403);assert.equal((await visitor.request('/worker/pdls',{...pdl,signatureDataUrl:''})).status,403);
});
