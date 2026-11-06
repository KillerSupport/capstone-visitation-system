import {requireDuty} from './auth.js';
import {assertPdlEligibility} from './visitation.js';
import {Router} from 'express';
import {createHash,randomBytes} from 'node:crypto';
import {pool,logGateScan} from './database/db.js';
import {withinVisitWindow} from './validation.js';
const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
const denyVisitor=(message:string):never=>{const error:any=new Error(message);error.visitorPolicy=true;throw error;};
async function checkVisitorRecordEligibility(conn:any,userId:string,pdlId:string,legacyQr:string){
 const [rows]=await conn.query(`SELECT v.id,v.status,v.is_archived,q.qr_token,
   EXISTS(SELECT 1 FROM pdl_visitor_assignments a WHERE a.visitor_record_id=v.id AND a.pdl_id=? AND a.status='APPROVED') AS is_approved,
   EXISTS(SELECT 1 FROM visitor_restrictions r WHERE r.visitor_record_id=v.id AND r.scope='FACILITY' AND r.status='ACTIVE' AND r.effective_at<=NOW() AND (r.expires_at IS NULL OR r.expires_at>NOW())) AS facility_restricted,
   EXISTS(SELECT 1 FROM visitor_restrictions r WHERE r.visitor_record_id=v.id AND r.scope='PDL' AND r.pdl_id=? AND r.status='ACTIVE' AND r.effective_at<=NOW() AND (r.expires_at IS NULL OR r.expires_at>NOW())) AS pdl_restricted
   FROM visitor_records v LEFT JOIN visitor_qr_identities q ON q.visitor_record_id=v.id WHERE v.legacy_user_id=? FOR UPDATE`,[pdlId,pdlId,userId]);
 const visitor=rows[0];
 if(!visitor||visitor.is_archived||visitor.status!=='ACTIVE')denyVisitor('UNREGISTERED: No active visitor record is linked to this account.');
 if(!visitor.qr_token||visitor.qr_token!==legacyQr)denyVisitor('The scanned QR identity does not match the active visitor record.');
 if(visitor.facility_restricted)denyVisitor('FACILITY-WIDE RESTRICTION: Entry is not permitted.');
 if(!visitor.is_approved)denyVisitor('UNAUTHORIZED: No active approval for this PDL.');
 if(visitor.pdl_restricted)denyVisitor('RESTRICTED: This visitor is prohibited from visiting this specific PDL.');
 return visitor;
}
export async function createGateProof(staffId:string,visitorId:string,appointmentId:string,templateId:string){
 const [rows]=await pool.query<any[]>(`SELECT u.id,u.biometric_reference_number,u.biometric_scanned_at,u.account_status,a.status,a.checked_in_at FROM users u JOIN appointments a ON a.user_id=u.id WHERE u.id=? AND a.id=? AND u.is_archived=0 AND a.is_archived=0`,[visitorId,appointmentId]);
 const r=rows[0];if(!r||!templateId||!r.biometric_scanned_at||r.biometric_reference_number!==templateId||!['ACTIVE','ACTIVATED'].includes(r.account_status)||r.status!=='Approved'||r.checked_in_at)throw Error('Fingerprint identity is not enrolled or this visit is not authorized.');
 const token=randomBytes(32).toString('hex');
 await pool.query('INSERT INTO gate_verification_sessions(token_hash,staff_id,visitor_id,appointment_id,expires_at) VALUES(?,?,?,?,?)',[digest(token),staffId,visitorId,appointmentId,new Date(Date.now()+60000)]);return token;
}
export const gateRouter=Router();
gateRouter.post('/scan',requireDuty('GATE'),async(req,res)=>{
 const proof=String(req.body.proof||''),code=String(req.body.code||'').trim(),staff=(req as any).user;
 const conn=await pool.getConnection();try{await conn.beginTransaction();
 const [sessions]=await conn.query<any[]>('SELECT * FROM gate_verification_sessions WHERE token_hash=? AND staff_id=? FOR UPDATE',[digest(proof),staff.id]);const session=sessions[0];
 if(!session||session.consumed_at||new Date(session.expires_at).getTime()<=Date.now()){await conn.rollback();return res.status(403).json({error:'Fingerprint verification must succeed first. The verification session lasts 60 seconds.'})}
 const [rows]=await conn.query<any[]>(`SELECT a.*,u.permanent_qr_token,u.account_status,u.is_archived AS user_archived,(SELECT status FROM kyc_submissions k WHERE k.user_id=u.id ORDER BY submitted_at DESC,k.id DESC LIMIT 1) AS kyc_status FROM appointments a JOIN users u ON u.id=a.user_id JOIN pdls p ON p.id=a.pdl_id WHERE a.id=? AND a.is_archived=0 AND p.is_archived=0 AND p.status='In Custody' FOR UPDATE`,[session.appointment_id]);const r=rows[0];
 let token=code;try{const parsed=JSON.parse(code);token=String(parsed.qrToken||'')}catch{}
 if(!r||r.permanent_qr_token!==token||String(r.user_id)!==String(session.visitor_id)){await conn.rollback();return res.status(403).json({error:'QR code does not belong to the fingerprint-verified visitor and appointment.'})}
 await checkVisitorRecordEligibility(conn,String(r.user_id),String(r.pdl_id),String(r.permanent_qr_token||''));
 const date=r.visit_date instanceof Date?new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(r.visit_date):String(r.visit_date).slice(0,10);
 if(r.user_archived||!['ACTIVE','ACTIVATED'].includes(r.account_status)||r.kyc_status!=='VERIFIED'||r.status!=='Approved'||r.checked_in_at||!withinVisitWindow(date,r.time_slot)){await conn.rollback();return res.status(409).json({error:'Visit is not approved, is outside its permitted date/time, has already checked in, or account verification is incomplete.'})}
 await assertPdlEligibility(conn,r.pdl_id,String(r.user_id),date,Number(r.schedule_version),JSON.parse(r.companions||'[]'));
  const companions=JSON.parse(r.companions||'[]');if(companions.some((x:any)=>x.verificationStatus!=='AUTHORIZED')){await conn.rollback();return res.status(409).json({error:'Every declared companion requires separate identity and entry authorization by an administrator.'})}
 await conn.query('UPDATE gate_verification_sessions SET qr_verified_at=NOW() WHERE token_hash=?',[digest(proof)]);await conn.commit();
 res.json({result:{id:r.id,appointmentReference:r.appointment_reference,visitor:{id:String(r.user_id),name:r.visitor_name},visit:{status:r.status,scheduledDate:date,scheduledTime:r.time_slot},pdl:{name:r.pdl_name,pdlId:r.pdl_number},companions},canProceed:true});
 }catch(error:any){await conn.rollback();res.status(error?.visitorPolicy?403:409).json({error:error?.visitorPolicy?error.message:'The approved PDL connection or assigned visitation day no longer matches this visit.'})}finally{conn.release()}
});
gateRouter.post('/visits/:id/admit',requireDuty('GATE'),async(req,res)=>{
 const conn=await pool.getConnection(),staff=(req as any).user;
 try{await conn.beginTransaction();const [sessions]=await conn.query<any[]>('SELECT * FROM gate_verification_sessions WHERE token_hash=? AND staff_id=? AND appointment_id=? FOR UPDATE',[digest(String(req.body.requestId||'')),staff.id,req.params.id]);const session=sessions[0];
 if(!session||!session.qr_verified_at||session.consumed_at||new Date(session.expires_at).getTime()<=Date.now()){await conn.rollback();return res.status(403).json({error:'Complete fingerprint verification, then QR verification within 60 seconds.'})}
 const [rows]=await conn.query<any[]>(`SELECT a.*,u.permanent_qr_token,u.account_status,u.is_archived AS user_archived,(SELECT status FROM kyc_submissions k WHERE k.user_id=u.id ORDER BY submitted_at DESC,k.id DESC LIMIT 1) AS kyc_status FROM appointments a JOIN users u ON u.id=a.user_id JOIN pdls p ON p.id=a.pdl_id WHERE a.id=? AND a.is_archived=0 AND p.is_archived=0 AND p.status='In Custody' FOR UPDATE`,[req.params.id]);const a=rows[0];
 const date=a?.visit_date instanceof Date?new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(a.visit_date):String(a?.visit_date||'').slice(0,10);
 if(!a||a.user_archived||a.checked_in_at||a.status!=='Approved'||a.kyc_status!=='VERIFIED'||!['ACTIVE','ACTIVATED'].includes(a.account_status)||!withinVisitWindow(date,a.time_slot)||String(a.user_id)!==String(session.visitor_id)||JSON.parse(a.companions||'[]').some((x:any)=>x.verificationStatus!=='AUTHORIZED')){await conn.rollback();return res.status(409).json({error:'Visit no longer meets admission requirements or has already checked in.'})}
 await checkVisitorRecordEligibility(conn,String(a.user_id),String(a.pdl_id),String(a.permanent_qr_token||''));
 await assertPdlEligibility(conn,a.pdl_id,String(a.user_id),date,Number(a.schedule_version),JSON.parse(a.companions||'[]'));
  const attendees=[String(a.user_id),...JSON.parse(a.companions||'[]').map((c:any)=>String(c.userId||''))].filter(Boolean).sort();
  await conn.query('SELECT id FROM users WHERE id IN (?) ORDER BY id FOR UPDATE',[attendees]);
  const [inside]=await conn.query<any[]>("SELECT id FROM visitor_log_entries WHERE visitor_id IN (?) AND log_type='PDL_VISITOR' AND time_out IS NULL",[attendees]);
  if(inside.length){await conn.rollback();return res.status(409).json({error:'A declared visitor or companion already has an active entry. Record their departure first.'});}
  await conn.query('UPDATE appointments SET checked_in_at=NOW() WHERE id=?',[a.id]);
 await conn.query('UPDATE gate_verification_sessions SET consumed_at=NOW() WHERE token_hash=?',[session.token_hash]);
 const log=await logGateScan({appointmentId:a.id,userId:String(a.user_id),visitorName:a.visitor_name,pdlName:a.pdl_name,facilityId:a.jail_facility_id,guardOfficer:`${staff.firstName} ${staff.lastName}`,action:'ADMITTED',notes:'Fingerprint verified before authentic QR; separate companion authorization checked.'},conn);
 await conn.query("INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details) VALUES(?,?,'VISIT_ADMITTED','APPOINTMENT',?,'SUCCESS',?)",[staff.id,staff.role,a.id,JSON.stringify({gateLogId:log.id})]);
 await conn.commit();req.app.emit('visit-admitted',{appointmentId:a.id,userId:String(a.user_id),log});res.json({success:true,message:'Fingerprint and QR verified. Check-in recorded.'});
 }catch(error:any){await conn.rollback();res.status(error?.visitorPolicy?403:409).json({error:error?.visitorPolicy?error.message:'Check-in blocked. Confirm the approved PDL connection, current assigned day and selected visit date.'})}finally{conn.release()}
});
