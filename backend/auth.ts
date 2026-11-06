import { Router, Request, Response, NextFunction } from 'express';
import { createHash, randomBytes, randomInt, scrypt as sc, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import rateLimit from 'express-rate-limit';
import { checkOtp, createSession, deleteSession, getSessionUser, getUserByLogin, getUserById, saveOtp, markContactVerified, recordLastLogin, pool } from './database/db.js';
import { classifyLoginIdentifier } from './identity.js';
import { deliverMessage, pendingContact, loginContact, maskContact, type Contact } from './messaging.js';
import { createLoginChallenge, readLoginChallenge } from './login-challenge.js';
import {strongPassword} from './validation.js';
const r=Router(), scrypt=promisify(sc), name='bjmp_session', challengeName='bjmp_login_challenge';
if (process.env.NODE_ENV==='production' && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required in production.');
const secret=process.env.SESSION_SECRET || randomBytes(32).toString('hex');
const sum=(x:string)=>createHash('sha256').update(secret+':'+x).digest('hex');
const limit=(count:number,message:string)=>rateLimit({windowMs:900000,limit:count,standardHeaders:true,legacyHeaders:false,message:{error:message}});
const loginLim=limit(10,'Too many sign-in attempts. Please try again later.');
const registerLim=limit(10,'Too many registration attempts. Please try again later.');
const verifyLim=limit(10,'Too many verification attempts. Please try again later.');
const resendLim=limit(3,'Too many verification requests. Please try again later.');
async function authAudit(q:Request,user:any,action:string,result:string){await pool.query('INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details,ip_address) VALUES(?,?,?,?,?,?,?,?)',[user?.id||null,user?.role||'ANONYMOUS',action,'AUTH',user?.id?String(user.id):null,result,JSON.stringify({}),q.ip||null]);}
function cookie(q:Request,key=name){return(q.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(key+'='))?.slice(key.length+1);}
function setCookie(s:Response,key:string,value:string,seconds:number,path='/') {s.append('Set-Cookie',`${key}=${value}; HttpOnly; SameSite=Lax; Path=${path}; Max-Age=${seconds}${process.env.NODE_ENV==='production'?'; Secure':''}`);}
function clear(s:Response){setCookie(s,name,'',0);}
function clearChallenge(s:Response){setCookie(s,challengeName,'',0,'/api/auth');}
async function issue(u:any,s:Response){const t=randomBytes(32).toString('hex'),seconds=Number(process.env.SESSION_TTL_HOURS||12)*3600;await createSession(sum(t),u.id,new Date(Date.now()+seconds*1000));setCookie(s,name,t,seconds);}
export async function resolveSocketSession(cookieHeader:string|undefined){const raw=(cookieHeader||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);if(!raw)return null;const user=await getSessionUser(sum(raw));return user&&user.role!=='VISITOR'&&!['SUSPENDED','REJECTED','INACTIVE'].includes(user.accountStatus)&&!pendingContact(user)?{id:String(user.id),role:user.role,officerDuties:user.officerDuties,sessionId:sum(raw)}:null;}
export async function auth(q:Request,s:Response,n:NextFunction){try{const t=cookie(q);if(!t)return s.status(401).json({error:'Please sign in to continue.'});const u=await getSessionUser(sum(t));if(!u||u.role==='VISITOR'||['SUSPENDED','REJECTED','INACTIVE'].includes(u.accountStatus)){clear(s);return s.status(401).json({error:'Session expired or account unavailable. Please sign in again.'});}(q as any).user=u;n();}catch{s.status(500).json({error:'Session validation failed.'});}}
export function admin(q:Request,s:Response,n:NextFunction){if(!['ADMIN','SUPER_ADMIN'].includes((q as any).user?.role))return s.status(403).json({error:'You do not have permission.'});n();}
export function hasDuty(user:any,duty:string){if(!user||pendingContact(user))return false;if(['ADMIN','SUPER_ADMIN'].includes(user.role))return true;if(user.role==='OFFICER')return user.officerDuties?.includes(duty)===true;return (duty==='GATE'&&['WORKER','GUARD'].includes(user.role))||(duty==='RECORDS'&&user.role==='WORKER')||(duty==='IDENTITY_REVIEW'&&user.role==='VERIFICATION_OFFICER');}
export function requireDuty(duty:string){return(q:Request,s:Response,n:NextFunction)=>hasDuty((q as any).user,duty)?n():s.status(403).json({error:'This task is outside your assigned duties.'});}
export function kycReviewer(q:Request,s:Response,n:NextFunction){if(!hasDuty((q as any).user,'IDENTITY_REVIEW'))return s.status(403).json({error:'You do not have permission.'});n();}
export function worker(q:Request,s:Response,n:NextFunction){if(!['ADMIN','WORKER','GUARD','OFFICER'].includes((q as any).user?.role)||pendingContact((q as any).user))return s.status(403).json({error:'You do not have permission.'});n();}
export function visitorActive(q:Request,s:Response,n:NextFunction){const u=(q as any).user;if(u?.role!=='VISITOR')return s.status(403).json({error:'You do not have permission.'});if(!['ACTIVE','ACTIVATED'].includes(u.accountStatus)||pendingContact(u))return s.status(403).json({error:'Complete account and contact verification before continuing.'});n();}
export async function hashPass(p:string){const salt=randomBytes(16),key=await scrypt(p,salt,64) as Buffer;return 'scrypt:'+salt.toString('hex')+':'+key.toString('hex');}
async function verify(p:string,v:string){const[,sa,ke]=v.split(':');if(!sa||!ke)return false;const a=Buffer.from(ke,'hex'),b=await scrypt(p,Buffer.from(sa,'hex'),a.length) as Buffer;return a.length===b.length&&timingSafeEqual(a,b);}
export const verifyPassword = verify;
function safeUser(u:any){const {passwordHash,...user}=u;return user;}
function deliveryError(e:any){return e?.message==='Verification request rate limit reached.'?'Wait at least one minute before requesting another code. You can request up to three codes in 15 minutes.':e?.message?.includes('not configured')?e.message:'Verification delivery is unavailable. Please try again later.';}
export async function issueCode(u:any,contact:Contact,purpose:string,binding='') {
 const code=String(randomInt(100000,1000000));
 await saveOtp(u.id,purpose,sum(`${binding}:${contact.destination}:${code}`),new Date(Date.now()+600000));
 const delivery=await deliverMessage(contact,'BJMP account verification',`BJMP Imus City Jail: Your ${purpose==='LOGIN'?'sign-in':'account verification'} code is ${code}. It expires in 10 minutes. Do not share this code.`);
 return delivery.status==='MOCK'?code:undefined;
}
function codeError(s:Response,result:string){return s.status(result==='LOCKED'?429:400).json({error:result==='EXPIRED'?'Code expired. Request a new code.':result==='LOCKED'?'Too many attempts. Request a new code later.':'Invalid or already used code.'});}

r.post('/login',loginLim,async(q,s)=>{
 try {
  const id=String(q.body.identifier||q.body.email||q.body.mobileNumber||'').trim(),p=String(q.body.password||''),parsed=classifyLoginIdentifier(id);
  if(!parsed||!p)return s.status(400).json({error:'Enter a valid email address or Philippine mobile number, and password.'});
  const u=await getUserByLogin(parsed.value,parsed.type);
  if(!u||u.role==='VISITOR'||!u.passwordHash.startsWith('scrypt:')||!await verify(p,u.passwordHash)||['INACTIVE','SUSPENDED','REJECTED'].includes(u.accountStatus)){await authAudit(q,null,'FAILED_LOGIN','FAILURE');return s.status(401).json({error:'Invalid email/mobile number or password.'});}
  if(['OFFICER','WORKER'].includes(u.role)&&pendingContact(u)){await issue(u,s);return s.json({success:true,user:safeUser(u)});}
  if(['INACTIVE','SUSPENDED','REJECTED'].includes(u.accountStatus)||pendingContact(u))return s.status(403).json({error:'Verify your registered contacts before signing in. If registration was interrupted, use account recovery to resume verification.'});
  clearChallenge(s);await recordLastLogin(u.id);await authAudit(q,u,'LOGIN','SUCCESS');await issue(u,s);s.json({success:true,user:safeUser(u)});
 } catch(e){s.status(503).json({error:deliveryError(e)});}
});
r.post(['/resend-login-otp','/verify-login-otp'],(_q,s)=>s.status(410).json({error:'Normal login no longer uses OTP.'}));
r.post('/register',registerLim,(_q,s)=>s.status(410).json({error:'Visitor self-registration is not available. Visitors are registered by authorized personnel.'}));
r.post('/resend-otp',resendLim,auth,async(q,s)=>{
 try{const u=(q as any).user,contact=pendingContact(u);if(!contact)return s.status(409).json({error:'Your registered contacts are already verified.'});const developmentOtp=await issueCode(u,contact,`VERIFY_${contact.channel.toUpperCase()}`);s.json({success:true,...(developmentOtp?{developmentOtp}:{})});}
 catch(e){s.status(503).json({error:deliveryError(e)});}
});
r.post('/verify-otp',verifyLim,auth,async(q,s)=>{
 try {
  const u=(q as any).user,contact=pendingContact(u),code=String(q.body.code||'');
  if(!contact)return s.status(409).json({error:'Your registered contacts are already verified.'});
  if(!/^\d{6}$/.test(code))return s.status(400).json({error:'Enter the 6-digit verification code.'});
  const result=await checkOtp(u.id,`VERIFY_${contact.channel.toUpperCase()}`,sum(`:${contact.destination}:${code}`));
  if(result!=='OK')return codeError(s,result);
  const user=await markContactVerified(u.id,contact.channel),next=pendingContact(user);
  let developmentOtp:string|undefined,failedDelivery:string|undefined;
  if(next){try{developmentOtp=await issueCode(user,next,`VERIFY_${next.channel.toUpperCase()}`);}catch(e){failedDelivery=deliveryError(e);}}
  s.json({success:true,user,verificationComplete:!next,...(developmentOtp?{developmentOtp}:{}),...(failedDelivery?{deliveryError:failedDelivery}:{})});
 } catch{s.status(500).json({error:'Verification failed.'});}
});
const recoveryMessage='If this contact is registered and verified, a recovery code will be sent. Check your email or SMS and try again after one minute if needed.';
function recoveryIdentifier(body:any){return classifyLoginIdentifier(String(body.identifier||body.email||body.mobileNumber||''));}
r.post('/forgot-password',resendLim,async(q,s)=>{
 const parsed=recoveryIdentifier(q.body);
 try{const u=parsed&&await getUserByLogin(parsed.value,parsed.type);if(u&&u.role!=='VISITOR'&&parsed&&(parsed.type==='email'?u.emailVerified:u.phoneVerified)){const code=String(randomInt(100000,1000000));await saveOtp(u.id,'PASSWORD_RESET',sum(`${parsed.value}:${code}`),new Date(Date.now()+600000));await deliverMessage({channel:parsed.type==='email'?'email':'sms',destination:parsed.value},'BJMP password recovery',`Your password recovery code is ${code}. It expires in 10 minutes. Do not share it.`);}}
 catch{/* Public response deliberately stays identical for absent accounts and delivery failures. */}
 s.json({success:true,message:recoveryMessage});
});
r.post('/verify-reset',verifyLim,async(q,s)=>{
 try{const parsed=recoveryIdentifier(q.body),code=String(q.body.code||''),u=parsed&&await getUserByLogin(parsed.value,parsed.type);
 if(!u||u.role==='VISITOR'||!/^\d{6}$/.test(code))return s.status(400).json({error:'Invalid or expired recovery code.'});
 const result=await checkOtp(u.id,'PASSWORD_RESET',sum(`${parsed!.value}:${code}`));if(result!=='OK')return codeError(s,result);
 const token=randomBytes(32).toString('hex');await saveOtp(u.id,'RESET_GRANT',sum(token),new Date(Date.now()+300000));
 s.json({success:true,token});
 }catch{s.status(400).json({error:'Recovery verification failed. Request a new code.'})}
});
r.post('/reset-password',verifyLim,async(q,s)=>{
 const parsed=recoveryIdentifier(q.body),p=String(q.body.password||'');
 if(!strongPassword(p)||p!==q.body.confirmPassword)return s.status(400).json({error:'Passwords must match and contain 8–128 characters, uppercase, lowercase, a number and a symbol.'});
 const u=parsed&&await getUserByLogin(parsed.value,parsed.type);if(!u||u.role==='VISITOR')return s.status(400).json({error:'Invalid or expired reset request.'});
 const hash=await hashPass(p),conn=await pool.getConnection();
 try{await conn.beginTransaction();const [rows]=await conn.query<any[]>("SELECT * FROM auth_otps WHERE user_id=? AND purpose='RESET_GRANT' ORDER BY id DESC LIMIT 1 FOR UPDATE",[u.id]);
 const grant=rows[0];if(!grant||grant.used_at||new Date(grant.expires_at).getTime()<=Date.now()||grant.code_hash!==sum(String(q.body.token||''))){await conn.rollback();return s.status(400).json({error:'Invalid or expired reset request.'})}
 await conn.query('UPDATE users SET password=? WHERE id=?',[hash,u.id]);
 await conn.query("UPDATE auth_otps SET used_at=NOW() WHERE user_id=? AND purpose IN ('PASSWORD_RESET','RESET_GRANT','LOGIN')",[u.id]);
 await conn.query('DELETE FROM auth_sessions WHERE user_id=?',[u.id]);await conn.query('DELETE FROM account_change_requests WHERE user_id=?',[u.id]);
 await conn.query("UPDATE profile_change_requests SET status='CANCELLED',new_password_hash=NULL,proofs='[]',review_reason='Cancelled by password recovery.' WHERE user_id=? AND status IN ('VERIFYING','PENDING_APPROVAL')",[u.id]);
 await conn.query("INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details) VALUES(?,?,'PASSWORD_RESET','USER',?,'SUCCESS','{}')",[u.id,u.role,u.id]);
 await conn.commit();q.app.emit('sessions-invalidated',String(u.id));clear(s);s.json({success:true});
 }catch{await conn.rollback();s.status(500).json({error:'Password reset failed.'})}finally{conn.release()}
});
// The account-changes router owns these flows. Retire the legacy immediate-apply routes
// so a direct API call cannot bypass email OTP or worker administrator approval.
r.post('/change-password',verifyLim,auth,(_q,s)=>s.status(410).json({error:'Use the email-verified password change flow.'}));
r.post('/profile-change',verifyLim,auth,(_q,s)=>s.status(410).json({error:'Use the email-verified profile change flow.'}));
r.post('/profile-change/verify',verifyLim,auth,(_q,s)=>s.status(410).json({error:'Use the account change verification flow.'}));
// Allows interrupted signup to resume only after proving ownership, without enabling ordinary login OTP.
r.post('/resume-verification',resendLim,(_q,s)=>s.status(410).json({error:'Visitor registration verification is not available.'}));
r.post('/logout',auth,async(q,s)=>{const t=cookie(q),u=(q as any).user;if(t){await deleteSession(sum(t));q.app.emit('session-ended',sum(t));}await authAudit(q,u,'LOGOUT','SUCCESS');clear(s);clearChallenge(s);s.json({success:true});});
r.get('/me',auth,(q,s)=>s.json({user:(q as any).user}));
export default r;
