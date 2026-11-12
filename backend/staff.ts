import {Router} from 'express';
import {pool,createUser,getAllUsers} from './database/db.js';
import {admin,hashPass,issueCode} from './auth.js';
import {normalizeEmail,normalizePhilippineMobileNumber} from './identity.js';
import {validatePerson,strongPassword} from './validation.js';
import {pendingContact} from './messaging.js';

export const DUTIES=['RECORDS','GATE'];
export const staffRouter=Router();
staffRouter.use(admin);
staffRouter.get('/',async(_req,res)=>res.json((await getAllUsers()).filter(u=>['OFFICER','WORKER','GUARD'].includes(u.role))));
function duties(value:any){if(!Array.isArray(value)||!value.length||new Set(value).size!==value.length||value.some(v=>!DUTIES.includes(v)))throw Error('Choose at least one valid Officer duty.');return value;}
staffRouter.post('/',async(req,res)=>{
  try{
    const b=req.body;validatePerson(b,false);const assigned=duties(b.officerDuties),email=normalizeEmail(b.email||''),phone=normalizePhilippineMobileNumber(b.mobileNumber||'');
    if((b.email&&!email)||(b.mobileNumber&&!phone)||(!email&&!phone))throw Error('Enter a valid email or Philippine mobile number.');
    if(!strongPassword(String(b.password||'')))throw Error('Use 8–128 password characters with uppercase, lowercase, a number and a symbol.');
    const badge=String(b.badgeNumber||'').trim();if(badge.length>100)throw Error('The official badge number cannot exceed 100 characters.');
    const user=await createUser({firstName:b.firstName.trim(),middleName:String(b.middleName||'').trim(),lastName:b.lastName.trim(),suffix:b.suffix||'',dateOfBirth:b.dateOfBirth,email,mobileNumber:phone,passwordHash:await hashPass(b.password),role:'WORKER',badgeNumber:badge||null,adminTitle:'Worker',accountStatus:'ACTIVE'});
    if(!user)throw Error('Could not create the Worker account.');
    await pool.query('UPDATE users SET officer_duties=? WHERE id=?',[JSON.stringify(assigned),user.id]);
    await pool.query("INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details) VALUES(?,?,'WORKER_CREATED','USER',?,'SUCCESS',?)",[(req as any).user.id,(req as any).user.role,user.id,JSON.stringify({duties:assigned})]);
    let deliveryError='';try{const contact=pendingContact(user);if(contact)await issueCode(user,contact,`VERIFY_${contact.channel.toUpperCase()}`);}catch{deliveryError='Worker created. Contact verification delivery is unavailable; configure messaging, then use Send code after first sign-in.';}
    res.status(201).json({success:true,workerId:`WRK-${String(user.id).padStart(6,'0')}`,deliveryError});
  }catch(error:any){res.status(error.code==='ER_DUP_ENTRY'?409:400).json({error:error.code==='ER_DUP_ENTRY'?'This email or mobile number is already registered.':error.message||'Could not create the Worker account.'});}
});
staffRouter.patch('/:id',async(req,res)=>{
  const actor=(req as any).user,conn=await pool.getConnection();
  try{
    const b=req.body,assigned=duties(b.officerDuties),status=String(b.status||''),badge=String(b.badgeNumber||'').trim();
    validatePerson(b,false);
    const email=normalizeEmail(b.email||''),phoneInput=String(b.mobileNumber||'').trim(),phone=phoneInput?normalizePhilippineMobileNumber(phoneInput):null;
    if((b.email&&!email)||(phoneInput&&!phone)||(!email&&!phone))throw Error('Enter a valid email or Philippine mobile number.');
    if(!['ACTIVE','SUSPENDED'].includes(status)||badge.length>100)throw Error('Choose Active or Suspended and enter a valid official badge number.');
    await conn.beginTransaction();const [rows]=await conn.query<any[]>('SELECT role,officer_duties,account_status,badge_number,email,mobile_number FROM users WHERE id=? AND is_archived=0 FOR UPDATE',[req.params.id]);
    if(!rows[0]||!['OFFICER','WORKER','GUARD'].includes(rows[0].role))throw Error('Worker account not found.');
    await conn.query("UPDATE profile_change_requests SET status='CANCELLED',new_password_hash=NULL,proofs='[]',review_reason='Cancelled by administrator account edit.' WHERE user_id=? AND status IN ('VERIFYING','PENDING_APPROVAL')",[req.params.id]);
    const emailChanged=email!==rows[0].email,phoneChanged=phone!==rows[0].mobile_number;
    await conn.query(`UPDATE users SET first_name=?,middle_name=?,last_name=?,suffix=?,date_of_birth=?,email=?,mobile_number=?,
      email_verified_at=IF(?,NULL,email_verified_at),phone_verified_at=IF(?,NULL,phone_verified_at),
      officer_duties=?,account_status=?,badge_number=? WHERE id=?`,[
        b.firstName.trim(),String(b.middleName||'').trim()||null,b.lastName.trim(),b.suffix||null,b.dateOfBirth,email,phone,
        emailChanged,phoneChanged,JSON.stringify(assigned),status,badge||null,req.params.id]);
    await conn.query('DELETE FROM auth_sessions WHERE user_id=?',[req.params.id]);
    await conn.query("INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details) VALUES(?,?,'WORKER_ACCOUNT_UPDATED','USER',?,'SUCCESS',?)",[actor.id,actor.role,req.params.id,JSON.stringify({before:{role:rows[0].role,accountStatus:rows[0].account_status,badgeNumber:rows[0].badge_number},duties:assigned,status,badgeNumber:badge,emailChanged,phoneChanged})]);
    await conn.commit();req.app.emit('sessions-invalidated',req.params.id);res.json({success:true,contactVerificationRequired:emailChanged||phoneChanged});
  }catch(error:any){await conn.rollback();res.status(400).json({error:error.message||'Could not update the worker account.'});}finally{conn.release();}
});
staffRouter.post('/:id/reset-password',async(req,res)=>{
  const password=String(req.body.password||''),actor=(req as any).user;
  if(!strongPassword(password))return res.status(400).json({error:'Use 8–128 password characters with uppercase, lowercase, a number and a symbol.'});
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const [rows]=await conn.query<any[]>('SELECT id,role FROM users WHERE id=? AND is_archived=0 FOR UPDATE',[req.params.id]);
    if(!rows[0]||!['OFFICER','WORKER','GUARD'].includes(rows[0].role)){await conn.rollback();return res.status(404).json({error:'Worker account not found.'});}
    await conn.query('UPDATE users SET password=? WHERE id=?',[await hashPass(password),req.params.id]);
    await conn.query('DELETE FROM auth_sessions WHERE user_id=?',[req.params.id]);
    await conn.query("UPDATE profile_change_requests SET status='CANCELLED',new_password_hash=NULL,proofs='[]',review_reason='Cancelled by administrator password reset.' WHERE user_id=? AND status IN ('VERIFYING','PENDING_APPROVAL')",[req.params.id]);
    await conn.query("UPDATE auth_otps SET used_at=NOW() WHERE user_id=? AND purpose IN ('PASSWORD_RESET','RESET_GRANT','LOGIN')",[req.params.id]);
    await conn.query("INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details) VALUES(?,?,'WORKER_PASSWORD_RESET','USER',?,'SUCCESS','{}')",[actor.id,actor.role,req.params.id]);
    await conn.commit();
    req.app.emit('sessions-invalidated',String(req.params.id));
    res.json({success:true});
  }catch(error:any){await conn.rollback();res.status(400).json({error:error.message||'Could not reset the worker password.'});}
  finally{conn.release();}
});
