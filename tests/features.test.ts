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
const database=`bjmp_feature_test_${Date.now()}_${randomBytes(3).toString('hex')}`,adminPassword=`TestOnly!${randomBytes(12).toString('hex')}`;
const messages:string[]=[];
const hardwareToken=randomBytes(32).toString('hex');
let root:any,db:any,backend:any,base='',smtp:net.Server,owned=false,gate:any;
before(async()=>{
 root=await mysql.createConnection({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT)||3306,user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||''});
 assert.match(database,/^bjmp_feature_test_\d+_[a-f0-9]{6}$/);await root.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`);owned=true;
 smtp=net.createServer(socket=>{let input='',data=false,content='';socket.setEncoding('utf8');socket.write('220 localhost test SMTP\r\n');socket.on('data',chunk=>{input+=chunk;let pos:number;while((pos=input.indexOf('\r\n'))>=0){const line=input.slice(0,pos);input=input.slice(pos+2);if(data){if(line==='.'){messages.push(content);content='';data=false;socket.write('250 queued\r\n')}else content+=line+'\n';continue}if(/^EHLO|^HELO/i.test(line))socket.write('250-localhost\r\n250 AUTH PLAIN\r\n');else if(/^AUTH/i.test(line))socket.write('235 authenticated\r\n');else if(/^DATA/i.test(line)){data=true;socket.write('354 End with dot\r\n')}else if(/^QUIT/i.test(line))socket.end('221 bye\r\n');else socket.write('250 OK\r\n')}})});
 smtp.listen(0,'127.0.0.1');await once(smtp,'listening');
 Object.assign(process.env,{DB_NAME:database,NODE_ENV:'test',PORT:'0',SESSION_SECRET:randomBytes(32).toString('hex'),INITIAL_ADMIN_EMAIL:'feature-admin@example.invalid',INITIAL_ADMIN_PASSWORD:adminPassword,INITIAL_WORKER_PASSWORD:'',SMS_PROVIDER:'mock',SMTP_HOST:'127.0.0.1',SMTP_PORT:String((smtp.address() as net.AddressInfo).port),SMTP_SECURE:'false',SMTP_USER:'test@example.invalid',SMTP_PASS:'test-only',SMTP_FROM:'test@example.invalid',COMPANION_LIMIT:'2',COMPANION_RELATIONSHIPS:'Spouse,Parent,Sibling,Adult Child',HARDWARE_DEVICE_TOKEN:hardwareToken});
 backend=await import('../backend/index.ts');db=await import('../backend/database/db.ts');gate=await import('../backend/gate.ts');if(!backend.server.listening)await once(backend.server,'listening');backend.app.set('trust proxy','loopback');base=`http://127.0.0.1:${(backend.server.address() as net.AddressInfo).port}/api`;
});
after(async()=>{
 if(backend?.server?.listening)await new Promise<void>(resolve=>backend.server.close(()=>resolve()));if(db?.pool)await db.pool.end();if(smtp?.listening)await new Promise<void>(resolve=>smtp.close(()=>resolve()));
 if(owned&&root){assert.match(database,/^bjmp_feature_test_\d+_[a-f0-9]{6}$/);await root.query(`DROP DATABASE \`${database}\``)}await root?.end();
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
test('age boundaries, future dates, leap dates and Philippine normalized contacts',()=>{
 assert.equal(ageOn('2006-10-19','2026-10-19'),20);assert.equal(ageOn('2006-10-20','2026-10-19'),19);assert.equal(ageOn('2007-10-19','2026-10-19'),19);assert.equal(ageOn('2027-01-01','2026-10-19'),null);assert.equal(ageOn('2006-02-30','2026-10-19'),null);assert.equal(ageOn('2004-02-29','2026-02-28'),21);
 for(const value of ['09123456789','+639123456789'])assert.equal(normalizePhilippineMobileNumber(value),'+639123456789');for(const value of ['+6309123456789','+63912345678','+6391234567890','09abc456789','0912 3456789','(0912)3456789'])assert.equal(normalizePhilippineMobileNumber(value),null);assert.equal(normalizeEmail(' TEST@Example.COM '),'test@example.com');
 assert.equal(withinVisitWindow('2026-10-19','Morning Batch (09:00 AM - 11:30 AM)',new Date('2026-10-19T01:00:00Z')),true);assert.equal(withinVisitWindow('2026-10-19','Morning Batch (09:00 AM - 11:30 AM)',new Date('2026-10-19T04:00:00Z')),false);
});
test('nationwide PSGC includes all 18 regions, NCR, independent cities and dependent barangays',async()=>{
 assert.equal(geographicOptions('regions').length,18);assert.ok(geographicOptions('regions').some((x:any)=>x.code==='1800000000'));
 assert.equal(geographicOptions('provinces','1300000000').length,0);const ncrCities=geographicOptions('cities','1300000000');assert.ok(ncrCities.length>=17);
 for(const region of geographicOptions('regions')){const provinces=geographicOptions('provinces',region.code),cities=provinces.flatMap((p:any)=>geographicOptions('cities',p.code)).concat(geographicOptions('cities',region.code));assert.ok(cities.length>0,region.name);assert.ok(cities.some((c:any)=>geographicOptions('barangays',c.code).length>0),region.name)}
 const city=ncrCities.find((x:any)=>x.name==='City of Makati'),barangay=geographicOptions('barangays',city.code)[0];const a=validateAddress({regionCode:'1300000000',provinceCode:'',cityCode:city.code,barangayCode:barangay.code,houseNumber:'5',streetName:'Test',zipCode:'1200'});assert.equal(a.province,'');assert.ok(a.completeAddress.includes('Makati'));assert.throws(()=>validateAddress({...address(),barangayCode:barangay.code}));assert.throws(()=>validateAddress({...address(),zipCode:'abc'}));assert.ok(zipSuggestions(address().cityCode).some((x:any)=>x.code==='4103'));assert.equal((await new Browser().request('/geography/regions')).body.length,18);
 assert.ok(geographicOptions('barangays','1380600000').length>800,'Manila includes all district barangays');
});
test('sample seed creates exactly 50 fictional PDL records and preserves existing PDL on a second run',async()=>{
 await db.pool.query("INSERT INTO pdls(id,pdl_number,first_name,last_name,sex,jail_facility_id,cell_dormitory,status) VALUES('existing-pdl','EXISTING-001','Existing','Record','Male','imus-city-jail-male','A','In Custody')");const {seedDemoPdls}=await import('../scripts/seed-pdls.ts');await seedDemoPdls();await seedDemoPdls();const pdls=await db.getAllPdls();assert.equal(pdls.length,51);assert.equal(pdls.filter((x:any)=>x.pdlNumber.startsWith('DEMO-FICTIONAL-')).length,50);assert.equal(pdls.find((x:any)=>x.id==='existing-pdl').firstName,'Existing');assert.equal(new Set(pdls.map((x:any)=>x.pdlNumber)).size,51);
});
test('registration rejects under-18 users, future birthdays, arbitrary suffixes, invalid phones and inconsistent addresses',async()=>{
 const today=manilaDate(),birth18=`${Number(today.slice(0,4))-18}${today.slice(4)}`,birth17=`${Number(today.slice(0,4))-17}${today.slice(4)}`;
 for(const [patch,message] of [[{dateOfBirth:birth17},'You must be at least 18 years old to register.'],[{dateOfBirth:'2099-01-01'},'birthdate'],[{suffix:'arbitrary'},'suffix'],[{mobileNumber:'+6309123456789'},'mobile'],[{address:{...address(),cityCode:'invalid'}},'region']]){const r=await new Browser().request('/auth/register',{...details('invalid@example.invalid'),...patch});assert.equal(r.status,400);assert.ok(r.body.error.includes(message as string),r.body.error)}
 const r=await visitor.request('/auth/register',{...details('Visitor@Example.Invalid'),dateOfBirth:birth18});assert.equal(r.status,201);visitorUser=r.body.user;assert.equal(visitorUser.email,'visitor@example.invalid');assert.equal(visitorUser.suffix,'Jr.');assert.equal(visitorUser.dateOfBirth,birth18);assert.ok(visitorUser.address.barangayCode);assert.equal(r.body.user.passwordHash,undefined);
});
test('signup verification remains mandatory; verified visitors sign in immediately without sending login OTP',async()=>{
 const login=new Browser();assert.equal((await login.request('/auth/login',{identifier:visitorUser.email,password:'Synthetic!Password123'})).status,403);
 assert.equal((await visitor.request('/auth/verify-otp',{code:mailCode()})).status,200);await visitor.request('/auth/logout',{});const count=messages.length;const signed=await visitor.request('/auth/login',{identifier:visitorUser.email.toUpperCase(),password:'Synthetic!Password123'});assert.equal(signed.status,200);assert.equal(signed.body.otpRequired,undefined);assert.equal(messages.length,count);assert.ok(visitor.cookies.has('bjmp_session'));assert.equal((await visitor.request('/auth/verify-login-otp',{code:'123456'})).status,410);
 assert.equal((await admin.request('/auth/login',{identifier:'feature-admin@example.invalid',password:adminPassword})).status,200);
});
test('case-insensitive email and normalized mobile uniqueness survive simultaneous direct registration requests',async()=>{
 const emailRace=await Promise.all([new Browser().request('/auth/register',details('race@example.invalid')),new Browser().request('/auth/register',details('RACE@EXAMPLE.INVALID'))]);assert.deepEqual(emailRace.map(x=>x.status).sort(),[201,409]);
 const phoneRace=await Promise.all([new Browser().request('/auth/register',details('','09175551234')),new Browser().request('/auth/register',details('','+639175551234'))]);assert.deepEqual(phoneRace.map(x=>x.status).sort(),[201,409]);const [rows]=await db.pool.query('SELECT mobile_number FROM users WHERE mobile_number=?',['+639175551234']);assert.equal(rows.length,1);
});
test('family companions require age 20+, configured family relationship and limits',()=>{
 assert.deepEqual(validateCompanions([]),[]);assert.equal(validateCompanions([{fullName:'Test Adult',dateOfBirth:'1980-01-01',relationshipToPdl:'Sibling'}])[0].verificationStatus,'PENDING');assert.throws(()=>validateCompanions([{fullName:'Test Child',dateOfBirth:'2010-01-01',relationshipToPdl:'Sibling'}]));assert.throws(()=>validateCompanions([{fullName:'Test Adult',dateOfBirth:'1980-01-01',relationshipToPdl:'Friend'}]));assert.throws(()=>validateCompanions(Array(3).fill({fullName:'Adult',dateOfBirth:'1980-01-01',relationshipToPdl:'Parent'})));
});
let appointment:any;
test('scheduling uses approved connections and assigned dates with adult companions and no appointment-confirmation cycle',async()=>{
 await db.pool.query("UPDATE users SET account_status='ACTIVATED',biometric_reference_number='test-template-42',biometric_scanned_at=NOW() WHERE id=?",[visitorUser.id]);
 const companion=await db.createUser({...details('adult-family@example.invalid'),firstName:'Adult',middleName:'',lastName:'Family',suffix:'',dateOfBirth:'1985-03-10',passwordHash:await backendHash('Synthetic!Password123'),accountStatus:'ACTIVATED',emailVerifiedAt:new Date(),biometricScannedAt:new Date()});
 assert.equal((await admin.request('/visitation/pdls/fictional-pdl-demo-001/day',{weekday:2,reason:'Synthetic test Tuesday'},'PUT')).status,200);
 for(const userId of [visitorUser.id,companion.id])assert.equal((await admin.request('/visitation/pdls/fictional-pdl-demo-001/visitors',{userId,relationship:'Sibling'})).status,201);
 await (await import('../backend/visitation.ts')).dispatchScheduleNotifications();
 const booking={pdlId:'fictional-pdl-demo-001',visitType:'Contact Visit',relationshipToPDL:'Sibling',visitDate:'2030-01-01',timeSlot:'Visiting hours (08:00 AM - 04:00 PM)'};
 for(const companions of [[{fullName:'Too Young',dateOfBirth:'2015-01-01',relationshipToPdl:'Sibling'}],[{fullName:'Non Family',dateOfBirth:'1980-01-01',relationshipToPdl:'Friend'}]])assert.equal((await visitor.request('/appointments',{...booking,companions})).status,400);
 const noCompanion=await visitor.request('/appointments',{...booking,visitDate:'2030-01-08'});assert.equal(noCompanion.status,201,JSON.stringify(noCompanion.body));assert.deepEqual(noCompanion.body.appointment.companions,[]);
 const before=messages.length,r=await visitor.request('/appointments',{...booking,companions:[{fullName:'Adult Family',dateOfBirth:'1985-03-10',relationshipToPdl:'Sibling',relationshipToVisitor:'Sibling'}]});assert.equal(r.status,201);appointment=r.body.appointment;assert.equal(messages.length,before);assert.equal(appointment.status,'Approved');assert.equal(appointment.companions[0].verificationStatus,'PENDING');
 assert.equal((await admin.request(`/appointments/${appointment.id}/status`,{status:'Approved'},'PATCH')).status,200);assert.equal(messages.length,before);
 const reviewed=await admin.request(`/appointments/${appointment.id}/companions`,{index:0,status:'AUTHORIZED',note:'Synthetic identity/entry review for automated test only'},'PATCH');assert.equal(reviewed.status,200);assert.equal(reviewed.body.companions[0].verificationStatus,'AUTHORIZED');assert.equal((await visitor.request(`/appointments/${appointment.id}/companions`,{index:0,status:'AUTHORIZED',note:'unapproved'},'PATCH')).status,403);
});
test('password recovery uses real SMTP adapter, generic responses, expiring single-use codes and invalidates active sessions',async()=>{
 const recovery=new Browser();const absent=await new Browser().request('/auth/forgot-password',{email:'absent@example.invalid'}),present=await recovery.request('/auth/forgot-password',{email:visitorUser.email});assert.deepEqual(absent.body,present.body);const code=mailCode(),count=messages.length;await recovery.request('/auth/forgot-password',{email:visitorUser.email});assert.equal(messages.length,count);
 assert.equal((await recovery.request('/auth/verify-reset',{email:visitorUser.email,code:'000000'})).status,400);const verified=await recovery.request('/auth/verify-reset',{email:visitorUser.email,code});assert.equal(verified.status,200);assert.equal((await recovery.request('/auth/verify-reset',{email:visitorUser.email,code})).status,400);
 const payload={email:visitorUser.email,token:verified.body.token,password:'Replacement!Password123',confirmPassword:'Replacement!Password123'};assert.equal((await recovery.request('/auth/reset-password',{...payload,password:'weak',confirmPassword:'weak'})).status,400);assert.equal((await recovery.request('/auth/reset-password',payload)).status,200);assert.equal((await visitor.request('/auth/me')).status,401);assert.equal((await recovery.request('/auth/reset-password',payload)).status,400);assert.equal((await visitor.request('/auth/login',{identifier:visitorUser.email,password:'Synthetic!Password123'})).status,401);assert.equal((await visitor.request('/auth/login',{identifier:visitorUser.email,password:payload.password})).status,200);
});
test('sensitive changes stay pending, require old and new email verification, exclude own contacts and invalidate sessions',async()=>{
 const [oldReview]=await db.pool.query("INSERT INTO kyc_submissions(user_id,id_type,id_number_encrypted,id_number_hash,id_number_last4,full_name,status,automated_check) VALUES(?,'Test','synthetic-only','synthetic-profile-id','1234','Synthetic Test Visitor','VERIFIED','{}')",[visitorUser.id]);
 const duplicate=await visitor.request('/auth/profile-change',{...(await visitor.request('/auth/me')).body.user,email:'race@example.invalid'});assert.equal(duplicate.status,409);
 const before=(await visitor.request('/auth/me')).body.user;const unchanged=await visitor.request('/auth/profile-change',{...before,firstName:'Updated'});assert.equal(unchanged.status,200);const oldCode=mailCode();assert.equal((await visitor.request('/auth/me')).body.user.firstName,before.firstName);assert.equal((await visitor.request('/auth/profile-change/verify',{code:'000000'})).status,400);assert.equal((await visitor.request('/auth/profile-change/verify',{code:oldCode})).body.complete,true);assert.equal((await visitor.request('/auth/me')).status,401);
 assert.equal((await visitor.request('/auth/login',{identifier:visitorUser.email,password:'Replacement!Password123'})).status,200);const user=(await visitor.request('/auth/me')).body.user;assert.equal(user.firstName,'Updated');assert.equal(user.accountStatus,'PENDING_VERIFICATION');
 const status=(await visitor.request('/kyc/status')).body.status;assert.equal(status.status,'NEEDS_RESUBMISSION');
 assert.equal((await admin.request(`/admin/kyc/${oldReview.insertId}/review`,{status:'VERIFIED'},'PATCH')).status,409);
 assert.equal((await admin.request(`/admin/kyc/${status.id}/review`,{status:'VERIFIED'},'PATCH')).status,409);
 const [previousReview]=await db.pool.query('SELECT status FROM kyc_submissions WHERE id=?',[oldReview.insertId]);assert.equal(previousReview[0].status,'VERIFIED');
 // Advance the per-user resend window in the isolated test database; no production clock is changed.
 await db.pool.query("UPDATE auth_otps SET created_at=DATE_SUB(NOW(),INTERVAL 2 MINUTE) WHERE user_id=? AND purpose='PROFILE_CHANGE'",[user.id]);
 const start=messages.length,newEmail='changed@example.invalid';const changed=await visitor.request('/auth/profile-change',{...user,email:newEmail});assert.equal(changed.status,200);assert.equal(messages.length,start+2);const c1=mailCode(start),c2=mailCode(start+1);assert.equal((await visitor.request('/auth/profile-change/verify',{code:c1})).body.complete,false);assert.equal((await visitor.request('/auth/me')).body.user.email,user.email);assert.equal((await visitor.request('/auth/profile-change/verify',{code:c2})).body.complete,true);assert.equal((await visitor.request('/auth/login',{identifier:newEmail,password:'Replacement!Password123'})).status,200);visitorUser=(await visitor.request('/auth/me')).body.user;assert.equal(visitorUser.email,newEmail);
});
test('entrance requires fingerprint first, rejects invalid identities, wrong QR, expired proof and schedule, and atomically prevents duplicate check-ins',async()=>{
 assert.equal((await admin.request('/worker/scan',{code:visitorUser.permanentQrToken})).status,403);assert.equal((await admin.request('/gate/scan',{action:'ADMITTED',appointmentId:appointment.id})).status,403);
 await db.pool.query("UPDATE users SET account_status='ACTIVATED' WHERE id=?",[visitorUser.id]);
 await db.pool.query("INSERT INTO kyc_submissions(user_id,id_type,id_number_encrypted,id_number_hash,id_number_last4,full_name,status,automated_check,submitted_at) VALUES(?,'Test','synthetic-encrypted','test-hash','1234','Test','VERIFIED','{}',NOW())",[visitorUser.id]);
 await assert.rejects(()=>gate.createGateProof('1',visitorUser.id,appointment.id,'wrong-template'));
 // Protocol-level emulator is restricted to this isolated test process. No physical scan is claimed.
 const socketUrl=base.replace('http:','ws:').replace('/api','/hardware'),device=new WebSocket(socketUrl),desk=new WebSocket(socketUrl,{headers:{Cookie:[...admin.cookies].map(([k,v])=>`${k}=${v}`).join('; ')}});
 const deskAuthenticated=nextEvent(desk,e=>e.type==='AUTHENTICATED');
 try{await Promise.all([once(device,'open'),once(desk,'open')]);const authenticated=nextEvent(device,e=>e.type==='AUTHENTICATED');device.send(JSON.stringify({type:'AUTHENTICATE',device:'esp32e',token:hardwareToken}));await Promise.all([authenticated,deskAuthenticated]);
 const blocked=nextEvent(desk,e=>e.type==='DEVICE_ERROR');desk.send(JSON.stringify({type:'COMMAND',requestId:'test-qr-before-fingerprint',payload:{action:'QR_SCAN_START'}}));assert.ok((await blocked).payload.message.includes('Fingerprint'));
 for(const matched of [false,true]){const requestId=`test-fingerprint-${matched}`,command=nextEvent(device,e=>e.type==='COMMAND'&&e.requestId===requestId),result=nextEvent(desk,e=>e.type==='FINGERPRINT_VERIFY_RESULT'&&e.requestId===requestId);desk.send(JSON.stringify({type:'COMMAND',requestId,payload:{action:'FINGERPRINT_VERIFY',subjectId:visitorUser.id,appointmentId:appointment.id}}));await command;device.send(JSON.stringify({type:'FINGERPRINT_VERIFY_RESULT',requestId,payload:{success:matched,matched,subjectId:visitorUser.id,appointmentId:appointment.id,templateId:'test-template-42'}}));const response=await result;assert.equal(response.payload.matched,matched);assert.equal(Boolean(response.payload.proof),matched);assert.equal(response.payload.templateId,undefined)}
 }finally{device.close();desk.close();await Promise.all([once(device,'close'),once(desk,'close')])}
 const staff=(await admin.request('/auth/me')).body.user;const proof=await gate.createGateProof(staff.id,visitorUser.id,appointment.id,'test-template-42');
 assert.equal((await admin.request(`/worker/visits/${appointment.id}/admit`,{requestId:proof})).status,403);
 assert.equal((await admin.request('/worker/scan',{code:'somebody-elses-qr',proof})).status,403);assert.equal((await admin.request('/worker/scan',{code:visitorUser.permanentQrToken,proof})).status,409);
 const expired=await gate.createGateProof(staff.id,visitorUser.id,appointment.id,'test-template-42');await db.pool.query('UPDATE gate_verification_sessions SET expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND)');assert.equal((await admin.request('/worker/scan',{code:visitorUser.permanentQrToken,proof:expired})).status,403);
 // Test the application sequence against controlled clock + enrolled test identity, never a real hardware success.
 const ActualDate=Date;const fixed=new ActualDate('2026-10-19T02:00:00Z').getTime();
 class FixedDate extends ActualDate{constructor(...args:any[]){super(fixed);if(args.length)return Reflect.construct(ActualDate,args,new.target)}static now(){return fixed}}
 globalThis.Date=FixedDate as any;
 try{
 await db.pool.query("UPDATE appointments SET visit_date='2026-10-19' WHERE id=?",[appointment.id]);
 await db.pool.query("UPDATE pdl_visitation_schedules SET weekday=1 WHERE pdl_id=?",[appointment.pdlId]);
 const token=await gate.createGateProof(staff.id,visitorUser.id,appointment.id,'test-template-42');
 assert.equal((await admin.request('/worker/scan',{code:visitorUser.permanentQrToken,proof:token})).status,200);
 const race=await Promise.all([admin.request(`/worker/visits/${appointment.id}/admit`,{requestId:token}),admin.request(`/worker/visits/${appointment.id}/admit`,{requestId:token})]);assert.deepEqual(race.map(x=>x.status).sort(),[200,403]);
 const [entries]=await db.pool.query("SELECT * FROM visitor_log_entries WHERE appointment_id=?",[appointment.id]);assert.equal(entries.length,4);assert.equal(new Set(entries.map((e:any)=>String(e.visitor_id))).size,2);const [logs]=await db.pool.query("SELECT * FROM gate_logs WHERE appointment_id=? AND action='ADMITTED'",[appointment.id]);assert.equal(logs.length,1);const [audits]=await db.pool.query("SELECT * FROM audit_logs WHERE target_id=? AND action='VISIT_ADMITTED'",[appointment.id]);assert.equal(audits.length,1);
 }finally{globalThis.Date=ActualDate}
});
test('expired reset codes, account suspension and password changes enforce security boundaries',async()=>{
 const user=(await visitor.request('/auth/me')).body.user;
 await db.pool.query("UPDATE auth_otps SET created_at=DATE_SUB(NOW(),INTERVAL 2 MINUTE) WHERE user_id=? AND purpose='PASSWORD_RESET'",[user.id]);
 await db.saveOtp(user.id,'PASSWORD_RESET','a'.repeat(64),new Date(Date.now()-1000));
 assert.equal((await new Browser().request('/auth/verify-reset',{email:user.email,code:'123456'})).status,400);
 await db.pool.query("UPDATE users SET account_status='SUSPENDED' WHERE id=?",[user.id]);assert.equal((await new Browser().request('/auth/login',{identifier:user.email,password:'Replacement!Password123'})).status,401);assert.equal((await visitor.request('/auth/me')).status,401);
 await db.pool.query("UPDATE users SET account_status='ACTIVATED' WHERE id=?",[user.id]);assert.equal((await visitor.request('/auth/login',{identifier:user.email,password:'Replacement!Password123'})).status,200);
 assert.equal((await visitor.request('/auth/change-password',{currentPassword:'wrong',password:'NewSecure!Password123',confirmPassword:'NewSecure!Password123'})).status,400);
 assert.equal((await visitor.request('/auth/change-password',{currentPassword:'Replacement!Password123',password:'NewSecure!Password123',confirmPassword:'NewSecure!Password123'})).status,200);assert.equal((await visitor.request('/auth/me')).status,401);
});
test('admin gate keeps existing ADMIN/SUPER_ADMIN access without widening worker permissions',async()=>{
 const browser=new Browser();await db.createUser({firstName:'Synthetic',lastName:'Supervisor',role:'SUPER_ADMIN',email:'supervisor@example.invalid',passwordHash:await backendHash('Supervisor!Test123'),accountStatus:'ACTIVATED',emailVerifiedAt:new Date()});
 assert.equal((await browser.request('/auth/login',{identifier:'supervisor@example.invalid',password:'Supervisor!Test123'})).status,200);
 assert.equal((await browser.request('/worker/visitors/today')).status,403);
 assert.equal((await browser.request('/gate/visitors/today')).status,200);
 assert.equal((await browser.request('/gate/visitors/search?q=Synthetic')).status,200);
 assert.equal((await browser.request('/gate/scan',{code:'unverified-qr'})).status,403);
});
async function backendHash(value:string){return (await import('../backend/auth.ts')).hashPass(value)}

const legacyWorker=new Browser(),legacyVisitor=new Browser();let legacyProfile:any,workerPdl:any,legacyVisit:any;
test('existing verified accounts retain login access without falsely verifying phones; new accounts remain strict',async()=>{
 const password='LegacySynthetic!Password123';
 for(const [role,email,phone] of [['WORKER','legacy-worker@example.invalid','+639171110001'],['VISITOR','legacy-visitor@example.invalid','+639171110002']])await db.createUser({...details(email,phone),role,accountStatus:'ACTIVATED',emailVerifiedAt:new Date(),passwordHash:await backendHash(password)});
 const unverified=await db.createUser({...details('unverified-active@example.invalid','+639171110003'),accountStatus:'ACTIVATED',passwordHash:await backendHash(password)});
 const pending=await db.createUser({...details('unfinished@example.invalid','+639171110004'),accountStatus:'PENDING_VERIFICATION',emailVerifiedAt:new Date(),passwordHash:await backendHash(password)});
 // This database is exclusively owned by this test process: replay the upgrade on old account fixtures.
 assert.equal(process.env.DB_NAME,database);await db.pool.query("DELETE FROM feature_migrations WHERE version='20261019_legacy_verified_access'");
 const {migrateLegacyContactAccess}=await import('../backend/database/migrations.ts');const connection=await db.pool.getConnection();try{await migrateLegacyContactAccess(connection);await migrateLegacyContactAccess(connection)}finally{connection.release()}
 const workerLogin=await legacyWorker.request('/auth/login',{identifier:'legacy-worker@example.invalid',password});assert.equal(workerLogin.status,200);assert.equal(workerLogin.body.user.phoneVerified,false);assert.equal(workerLogin.body.user.contactAccessPolicy,'LEGACY_VERIFIED');
 const visitorLogin=await legacyVisitor.request('/auth/login',{identifier:'legacy-visitor@example.invalid',password});assert.equal(visitorLogin.status,200);legacyProfile=visitorLogin.body.user;assert.equal(legacyProfile.phoneVerified,false);
 for(const user of [unverified,pending]){assert.equal((await db.getUserById(user.id)).contactAccessPolicy,'ALL_REGISTERED');assert.equal((await new Browser().request('/auth/login',{identifier:user.email,password})).status,403)}
 const fresh=await db.createUser({...details('new-secondary@example.invalid','+639171110005'),accountStatus:'ACTIVATED',emailVerifiedAt:new Date(),passwordHash:await backendHash(password)});
 const connection2=await db.pool.getConnection();try{await migrateLegacyContactAccess(connection2)}finally{connection2.release()}
 assert.equal((await db.getUserById(fresh.id)).contactAccessPolicy,'ALL_REGISTERED');assert.equal((await new Browser().request('/auth/login',{identifier:fresh.email,password})).status,403);
 assert.equal((await new Browser().request('/auth/login',{identifier:legacyProfile.email,password:'wrong'})).status,401);
 assert.equal((await legacyVisitor.request('/visitor/pdls')).status,200);assert.equal((await legacyVisitor.request('/users')).status,403);assert.equal((await legacyWorker.request('/worker/visitors/today')).status,200);
});
test('worker intake creates records and preserves existing PDL status when editing',async()=>{
 const roster=await legacyWorker.request('/worker/pdls');assert.equal(roster.status,200);
 const template=roster.body.find((p:any)=>p.pdlNumber.startsWith('DEMO-FICTIONAL-'));
 const created=await legacyWorker.request('/worker/pdls',{...template,id:undefined,pdlNumber:'CRUA-SYNTHETIC-001',firstName:'Synthetic',lastName:'Intake'});assert.equal(created.status,200);workerPdl=created.body.pdl;
 await db.pool.query("UPDATE pdls SET status='On Trial' WHERE id=?",[workerPdl.id]);
 const updated=await legacyWorker.request('/worker/pdls',{...workerPdl,firstName:'Updated Synthetic',status:'In Custody'});assert.equal(updated.status,200);assert.equal(updated.body.pdl.status,'On Trial');assert.equal(updated.body.pdl.firstName,'Updated Synthetic');
 assert.equal((await legacyWorker.request('/worker/pdls',{...workerPdl,status:'Released'})).status,403);
 assert.equal((await legacyWorker.request(`/admin/archive/PDLS/${workerPdl.id}`,{reason:'Unauthorized test'})).status,403);
 assert.equal((await legacyVisitor.request('/worker/pdls')).status,403);
});
test('visitor booking, own-record listing and cancellation work after legacy login',async()=>{
 await db.pool.query("UPDATE users SET biometric_scanned_at=NOW() WHERE id=?",[legacyProfile.id]);
 const pdl=(await db.getAllPdls()).find((p:any)=>p.status==='In Custody');
 const date='2099-03-15',day=new Date(date+'T00:00:00Z').getUTCDay();
 await admin.request(`/visitation/pdls/${pdl.id}/day`,{weekday:day,reason:'Synthetic legacy-account test'},'PUT');
 assert.equal((await admin.request(`/visitation/pdls/${pdl.id}/visitors`,{userId:legacyProfile.id,relationship:'Spouse'})).status,201);
 const result=await legacyVisitor.request('/appointments',{pdlId:pdl.id,visitType:'Contact Visit',relationshipToPDL:'Spouse',visitDate:'2099-03-15',timeSlot:'Visiting hours (08:00 AM - 04:00 PM)',companions:[]});assert.equal(result.status,201);legacyVisit=result.body.appointment;
 const own=await legacyVisitor.request('/appointments');assert.ok(own.body.some((a:any)=>a.id===legacyVisit.id));assert.ok(own.body.every((a:any)=>String(a.userId)===legacyProfile.id));
 const cancelled=await legacyVisitor.request(`/appointments/${legacyVisit.id}/status`,{status:'Cancelled'},'PATCH');assert.equal(cancelled.status,200);assert.equal(cancelled.body.appointment.status,'Cancelled');
});
test('archive detail/history and restoration accept the canonical record types sent by the interface',async()=>{
 const incidentResult=await admin.request('/incidents',{visitorName:'Synthetic',facility:'Test',incidentType:'Dress Code Non-Compliance',description:'Synthetic test incident',actionTaken:'Recorded',reportingOfficer:'Synthetic'});assert.equal(incidentResult.status,201);const incident=incidentResult.body.incident;
 const announcementResult=await admin.request('/announcements',{title:'Synthetic test',content:'Fictional test notice',level:'warning'});assert.equal(announcementResult.status,201);const announcement=announcementResult.body.announcement;
 const account=await db.createUser({firstName:'Synthetic',lastName:'Archived',email:'archive-fixture@example.invalid',passwordHash:await backendHash('ArchiveSynthetic!123'),accountStatus:'PENDING_VERIFICATION'});
 for(const [type,id,table] of [['PDL',workerPdl.id,'pdls'],['APPOINTMENT',legacyVisit.id,'appointments'],['SECURITY_INCIDENT',incident.id,'security_incidents'],['ANNOUNCEMENT',announcement.id,'announcements'],['USER',account.id,'users']]){
  assert.equal((await admin.request(`/admin/archive/${type}/${id}`,{reason:'Synthetic archive test'})).status,200);
  const listed=await admin.request(`/admin/archive?type=${type}`);assert.ok(listed.body.some((r:any)=>String(r.record_id)===String(id)));
  assert.equal((await admin.request(`/admin/archive/${type}/${id}`)).status,200);assert.equal((await admin.request(`/admin/archive/${type}/${id}/history`)).status,200);
  assert.equal((await admin.request(`/admin/archive/${type}/${id}/restore`,{})).status,200);
  const [rows]=await db.pool.query(`SELECT is_archived FROM ${table} WHERE id=?`,[id]);assert.equal(rows[0].is_archived,0);
 }
});
test('capacity settings persist and concurrent distinct visitor bookings count primary visitors and companions',async()=>{
 const capacities={capacities:[{id:'imus-city-jail-male',capacity:10}]};assert.equal((await legacyWorker.request('/admin/facility-capacities',capacities,'PUT')).status,403);
 assert.equal((await admin.request('/admin/facility-capacities',{capacities:[{id:'imus-city-jail-male',capacity:0}]},'PUT')).status,400);assert.equal((await admin.request('/admin/facility-capacities',capacities,'PUT')).status,200);
 assert.equal((await legacyVisitor.request('/facilities')).body[0].capacityPerSlot,10);
 const pdl=(await legacyVisitor.request('/visitor/pdls')).body.find((p:any)=>p.jailFacilityId==='imus-city-jail-male'),visitDate='2099-03-18';
 await admin.request('/visitation/policy',{visitorLimit:20},'PUT');await admin.request(`/visitation/pdls/${pdl.id}/day`,{weekday:new Date(visitDate+'T00:00:00Z').getUTCDay(),reason:'Capacity test date'},'PUT');
 const members:any[]=[];for(let i=0;i<10;i++){const email=`capacity-${i}@example.invalid`;const u=await db.createUser({...details(email),firstName:'Capacity',middleName:'',lastName: 'Member'+i,suffix:'',dateOfBirth:'1980-01-01',passwordHash:await backendHash('Synthetic!Password123'),accountStatus:'ACTIVATED',emailVerifiedAt:new Date(),biometricScannedAt:new Date()});await admin.request(`/visitation/pdls/${pdl.id}/visitors`,{userId:u.id,relationship:'Sibling'});members.push(u);}
 const booking={pdlId:pdl.id,visitType:'Contact Visit',relationshipToPDL:'Sibling',visitDate,timeSlot:'Visiting hours (08:00 AM - 04:00 PM)'};
 const companions=members.slice(0,2).map(u=>({fullName:u.firstName+' '+u.lastName,dateOfBirth:u.dateOfBirth,relationshipToPdl:'Sibling'}));
 assert.equal((await legacyVisitor.request('/appointments',{...booking,companions})).status,201);
 const browsers=await Promise.all(members.slice(2).map(async u=>{const b=new Browser();assert.equal((await b.request('/auth/login',{identifier:u.email,password:'Synthetic!Password123'})).status,200);return b;}));
 const race=await Promise.all(browsers.map(b=>b.request('/appointments',{...booking,companions:[]})));assert.equal(race.filter(r=>r.status===201).length,7);assert.equal(race.filter(r=>r.status===400).length,1);assert.match(race.find(r=>r.status===400)!.body.error,/full/);
 assert.equal((await admin.request('/admin/facility-capacities',{capacities:[{id:'imus-city-jail-male',capacity:40}]},'PUT')).status,200);
});
test('security notice publishes publicly, updates one record, and clears by archiving without deletion',async()=>{
 assert.equal((await legacyWorker.request('/admin/security-notice',{content:'Unauthorized'},'PUT')).status,403);
 assert.equal((await admin.request('/admin/security-notice',{content:'Synthetic facility notice'},'PUT')).status,200);assert.equal((await new Browser().request('/security-notice')).body.content,'Synthetic facility notice');
 assert.equal((await admin.request('/admin/security-notice',{content:'Updated synthetic notice'},'PUT')).status,200);
 const [counts]=await db.pool.query("SELECT COUNT(*) AS count FROM announcements WHERE id='facility-security-notice'");assert.equal(counts[0].count,1);
 assert.equal((await admin.request('/admin/security-notice',{content:''},'PUT')).status,200);assert.equal((await new Browser().request('/security-notice')).body.content,'');
 assert.equal((await admin.request('/admin/archive/ANNOUNCEMENT/facility-security-notice')).status,200);
});
test('verified profile changes never mark an unchanged unverified legacy phone as verified',async()=>{
 const requested=await legacyVisitor.request('/auth/profile-change',{...legacyProfile,middleName:'Updated'});assert.equal(requested.status,200);
 const result=await legacyVisitor.request('/auth/profile-change/verify',{code:mailCode()});assert.equal(result.status,200);assert.equal(result.body.complete,true);
 const [rows]=await db.pool.query('SELECT phone_verified_at,email_verified_at FROM users WHERE id=?',[legacyProfile.id]);assert.equal(rows[0].phone_verified_at,null);assert.ok(rows[0].email_verified_at);
});

test('logout closes only that account session live and hardware connections',async()=>{
 const browser=new Browser();assert.equal((await browser.request('/auth/login',{identifier:'legacy-worker@example.invalid',password:'LegacySynthetic!Password123'})).status,200);
 const headers={Cookie:[...browser.cookies].map(([k,v])=>`${k}=${v}`).join('; ')};
 const live=new WebSocket(base.replace('http:','ws:').replace('/api','/ws'),{headers});
 const hardware=new WebSocket(base.replace('http:','ws:').replace('/api','/hardware'),{headers});
 try{
  await Promise.all([nextEvent(live,e=>e.type==='CONNECTED'),nextEvent(hardware,e=>e.type==='AUTHENTICATED')]);
  const closed=[once(live,'close',{signal:AbortSignal.timeout(5000)}),once(hardware,'close',{signal:AbortSignal.timeout(5000)})];
  assert.equal((await browser.request('/auth/logout',{})).status,200);await Promise.all(closed);
  assert.equal((await browser.request('/auth/me')).status,401);assert.equal((await legacyWorker.request('/auth/me')).status,200,'another existing session retains its own access');
 }finally{live.close();hardware.close()}
});

test('duplicate PDL numbers cannot overwrite another record or create an orphan profile',async()=>{
 const original=(await db.getAllPdls()).find((p:any)=>p.id===workerPdl.id);
 const duplicate=await legacyWorker.request('/worker/pdls',{...original,id:undefined,firstName:'Must Never Replace Owner',status:'In Custody'});assert.equal(duplicate.status,400);
 const unchanged=(await db.getAllPdls()).find((p:any)=>p.id===workerPdl.id);assert.equal(unchanged.firstName,original.firstName);assert.equal(unchanged.status,original.status);
 const [orphans]=await db.pool.query('SELECT COUNT(*) AS count FROM pdl_form_records r LEFT JOIN pdls p ON p.id=r.pdl_id WHERE p.id IS NULL');assert.equal(orphans[0].count,0);
});
