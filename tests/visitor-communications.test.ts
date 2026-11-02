import {geographicOptions,validateAddress} from '../backend/geography.ts';
import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({quiet:true});
const database=`bjmp_sms_test_${Date.now()}_${randomBytes(3).toString('hex')}`;
const adminPassword=`TestOnly!${randomBytes(12).toString('hex')}`;
const messages:string[]=[];
let root:any,db:any,backend:any,base='',smtp:net.Server,owned=false;

before(async()=>{
 root=await mysql.createConnection({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT)||3306,user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||''});
 assert.match(database,/^bjmp_sms_test_\d+_[a-f0-9]{6}$/);
 await root.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`);owned=true;
 smtp=net.createServer(socket=>{
  let input='',data=false,content='';socket.setEncoding('utf8');socket.write('220 localhost test SMTP\r\n');
  socket.on('data',chunk=>{
   input+=chunk;let pos:number;
   while((pos=input.indexOf('\r\n'))>=0){const line=input.slice(0,pos);input=input.slice(pos+2);
    if(data){if(line==='.'){messages.push(content);content='';data=false;socket.write('250 queued for local test\r\n');}else content+=line+'\n';continue;}
    if(/^EHLO|^HELO/i.test(line))socket.write('250-localhost\r\n250 AUTH PLAIN\r\n');
    else if(/^AUTH/i.test(line))socket.write('235 authenticated\r\n');
    else if(/^DATA/i.test(line)){data=true;socket.write('354 End with a dot\r\n');}
    else if(/^QUIT/i.test(line)){socket.end('221 bye\r\n');}
    else socket.write('250 OK\r\n');
   }
  });
 });
 smtp.listen(0,'127.0.0.1');await once(smtp,'listening');
 Object.assign(process.env,{DB_NAME:database,NODE_ENV:'test',PORT:'0',SESSION_SECRET:randomBytes(32).toString('hex'),INITIAL_ADMIN_EMAIL:'test-admin@example.invalid',INITIAL_ADMIN_PASSWORD:adminPassword,INITIAL_WORKER_PASSWORD:'',SMS_PROVIDER:'mock',SMTP_HOST:'127.0.0.1',SMTP_PORT:String((smtp.address() as net.AddressInfo).port),SMTP_SECURE:'false',SMTP_USER:'test@example.invalid',SMTP_PASS:'test-only',SMTP_FROM:'test@example.invalid'});
 backend=await import('../backend/index.ts');db=await import('../backend/database/db.ts');
 if(!backend.server.listening)await once(backend.server,'listening');
 backend.app.set('trust proxy','loopback');
 base=`http://127.0.0.1:${(backend.server.address() as net.AddressInfo).port}/api`;
});
after(async()=>{
 if(backend?.server?.listening)await new Promise<void>((resolve,reject)=>backend.server.close((error:any)=>error?reject(error):resolve()));
 if(db?.pool)await db.pool.end();
 if(smtp?.listening)await new Promise<void>(resolve=>smtp.close(()=>resolve()));
 if(owned&&root){assert.match(database,/^bjmp_sms_test_\d+_[a-f0-9]{6}$/);await root.query(`DROP DATABASE \`${database}\``);}
 await root?.end();
});
class Browser {
 cookies=new Map<string,string>();
 constructor(public ip:string){}
 async request(path:string,body?:any,method=body?'POST':'GET'){
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Forwarded-For':this.ip,Cookie:[...this.cookies].map(([key,value])=>`${key}=${value}`).join('; ')},...(body?{body:JSON.stringify(body)}:{})});
  for(const cookie of response.headers.getSetCookie()){const [pair]=cookie.split(';'),index=pair.indexOf('='),key=pair.slice(0,index),value=pair.slice(index+1);if(/Max-Age=0(?:;|$)/.test(cookie))this.cookies.delete(key);else this.cookies.set(key,value);}
  return {status:response.status,body:await response.json(),response};
 }
}
function details(phone:string,email=''){const region=geographicOptions('regions').find(x=>x.code==='0400000000'),province=geographicOptions('provinces',region.code).find(x=>x.name==='Cavite'),city=geographicOptions('cities',province.code).find(x=>x.name==='City of Imus'),barangay=geographicOptions('barangays',city.code)[0];return {firstName:'Synthetic',lastName:'Visitor',dateOfBirth:'1970-01-01',email,mobileNumber:phone,password:'Synthetic!Password123',address:validateAddress({regionCode:region.code,provinceCode:province.code,cityCode:city.code,barangayCode:barangay.code,houseNumber:'1',streetName:'Test only',zipCode:'4103'})};}
function readableMail(raw:string){
 const [headers,...body]=raw.split('\n\n');const text=body.join('\n\n');
 if(/Content-Transfer-Encoding: base64/i.test(headers))return Buffer.from(text.replace(/\s/g,''),'base64').toString('utf8');
 return text.replace(/=\n/g,'').replace(/=([A-F0-9]{2})/g,(_,hex)=>String.fromCharCode(parseInt(hex,16)));
}
function mailCode(){const match=messages.at(-1)?.match(/code is (\d{6})/);assert.ok(match,'local SMTP captured a verification code');return match[1];}
let phoneUser:any,bothUser:any;

test('phone-only registration verifies signup and permits immediate credential login without OTP',async()=>{
 const browser=new Browser('10.24.1.1');const signup=await browser.request('/auth/register',details('09171111111'));assert.equal(signup.status,201);assert.match(signup.body.developmentOtp,/^\d{6}$/);phoneUser=signup.body.user;
 const verified=await browser.request('/auth/verify-otp',{code:signup.body.developmentOtp});assert.equal(verified.status,200);assert.equal(verified.body.user.phoneVerified,true);assert.equal(verified.body.verificationComplete,true);
 await browser.request('/auth/logout',{});const login=await browser.request('/auth/login',{identifier:'09171111111',password:'Synthetic!Password123'});assert.equal(login.status,200);assert.equal(login.body.otpRequired,undefined);assert.equal(browser.cookies.has('bjmp_session'),true);assert.equal((await browser.request('/auth/me')).status,200);
 assert.equal((await browser.request('/auth/verify-login-otp',{code:'123456'})).status,410);
});

test('registration accepts both contacts and verifies them separately',async()=>{
 const browser=new Browser('10.24.2.1');
 const signup=await browser.request('/auth/register',details('09172222222','both@example.invalid'));assert.equal(signup.status,201);bothUser=signup.body.user;
 const phone=await browser.request('/auth/verify-otp',{code:signup.body.developmentOtp});assert.equal(phone.status,200);assert.equal(phone.body.user.phoneVerified,true);assert.equal(phone.body.user.emailVerified,false);assert.equal(phone.body.verificationComplete,false);
 const email=await browser.request('/auth/verify-otp',{code:mailCode()});assert.equal(email.status,200);assert.equal(email.body.user.emailVerified,true);assert.equal(email.body.verificationComplete,true);
 const duplicate=await new Browser('10.24.2.2').request('/auth/register',details('09172222222','other@example.invalid'));assert.equal(duplicate.status,409);
});
test('email-only visitors retain signup verification and sign in without login OTP',async()=>{
 const browser=new Browser('10.24.3.1');
 const signup=await browser.request('/auth/register',details('','email-only@example.invalid'));assert.equal(signup.status,201);assert.equal(signup.body.developmentOtp,undefined);
 assert.equal((await browser.request('/auth/verify-otp',{code:mailCode()})).status,200);
 await browser.request('/auth/logout',{});
 const login=await browser.request('/auth/login',{identifier:'email-only@example.invalid',password:'Synthetic!Password123'});assert.equal(login.status,200);assert.equal(login.body.otpRequired,undefined);assert.equal(browser.cookies.has('bjmp_session'),true);
});
test('linked schedules send independent email and SMS once per event, with channel-specific failure and retry states',async()=>{
 const admin=new Browser('10.24.4.1');assert.equal((await admin.request('/auth/login',{identifier:'test-admin@example.invalid',password:adminPassword})).status,200);
 await db.pool.query("INSERT INTO pdls(id,pdl_number,first_name,last_name,sex,jail_facility_id,cell_dormitory,status) VALUES('test-pdl','TEST-PDL','Synthetic','Linked PDL','Male','imus-city-jail-male','Test','In Custody')");
 const paper=await import('../backend/visitation.ts');
 await admin.request('/visitation/pdls/test-pdl/day',{weekday:2,reason:'Synthetic Tuesday'},'PUT');
 for(const user of [bothUser,phoneUser]){await db.pool.query("UPDATE users SET account_status='ACTIVATED',biometric_scanned_at=NOW() WHERE id=?",[user.id]);assert.equal((await admin.request('/visitation/pdls/test-pdl/visitors',{userId:user.id,relationship:'Relative'})).status,201);}
 await paper.dispatchScheduleNotifications();const [first]=await db.pool.query('SELECT channel,status FROM pdl_schedule_notifications WHERE user_id=?',[bothUser.id]);assert.deepEqual(first.map(j=>j.channel+':'+j.status).sort(),['email:ACCEPTED','sms:MOCK']);
 const mail=readableMail(messages.at(-1)!);assert.ok(mail.includes('Synthetic Linked PDL'));assert.ok(mail.includes('Tuesday'));const count=messages.length;await paper.dispatchScheduleNotifications();assert.equal(messages.length,count);
 const [phone]=await db.pool.query('SELECT channel,status FROM pdl_schedule_notifications WHERE user_id=?',[phoneUser.id]);assert.deepEqual(phone.map(j=>j.channel+':'+j.status),['sms:MOCK']);
 delete process.env.SMS_PROVIDER;await admin.request('/visitation/pdls/test-pdl/day',{weekday:3,reason:'Synthetic Wednesday'},'PUT');await paper.dispatchScheduleNotifications();
 const [partial]=await db.pool.query('SELECT channel,status FROM pdl_schedule_notifications WHERE user_id=? AND message LIKE ?',[bothUser.id,'%Wednesday%']);assert.deepEqual(partial.map(j=>j.channel+':'+j.status).sort(),['email:ACCEPTED','sms:NOT_CONFIGURED']);
 process.env.SMS_PROVIDER='mock';await db.pool.query("UPDATE pdl_schedule_notifications SET updated_at=DATE_SUB(NOW(),INTERVAL 2 MINUTE) WHERE status='NOT_CONFIGURED'");await paper.dispatchScheduleNotifications();
 const [retried]=await db.pool.query('SELECT channel,status FROM pdl_schedule_notifications WHERE user_id=? AND message LIKE ?',[bothUser.id,'%Wednesday%']);assert.deepEqual(retried.map(j=>j.channel+':'+j.status).sort(),['email:ACCEPTED','sms:MOCK']);assert.equal((await db.getAllAppointments()).length,0);
});
test('OTP verification is consumed atomically and incorrect attempts are bounded',async()=>{
 const purpose='TEST_ATOMIC',hash='a'.repeat(64);await db.saveOtp(phoneUser.id,purpose,hash,new Date(Date.now()+600000));
 const results=await Promise.all([db.checkOtp(phoneUser.id,purpose,hash),db.checkOtp(phoneUser.id,purpose,hash)]);assert.deepEqual(results.sort(),['INVALID','OK']);
 await db.saveOtp(phoneUser.id,'TEST_LIMIT',hash,new Date(Date.now()+600000));
 for(let i=0;i<5;i++)assert.equal(await db.checkOtp(phoneUser.id,'TEST_LIMIT','wrong'),'INVALID');
 assert.equal(await db.checkOtp(phoneUser.id,'TEST_LIMIT',hash),'LOCKED');
 await assert.rejects(()=>db.saveOtp(phoneUser.id,'TEST_LIMIT',hash,new Date(Date.now()+600000)));
 await db.saveOtp(phoneUser.id,'TEST_EXPIRED',hash,new Date(Date.now()-1000));assert.equal(await db.checkOtp(phoneUser.id,'TEST_EXPIRED',hash),'EXPIRED');
});
