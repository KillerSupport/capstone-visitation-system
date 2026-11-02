import {Router} from 'express';
import {pool,createUser,getAllUsers} from './database/db.js';
import {admin,hashPass,issueCode} from './auth.js';
import {normalizeEmail,normalizePhilippineMobileNumber} from './identity.js';
import {validatePerson,strongPassword} from './validation.js';
import {pendingContact} from './messaging.js';

export const DUTIES=['RECORDS','GATE','IDENTITY_REVIEW','ENROLLMENT'];
export const staffRouter=Router();
staffRouter.use(admin);
staffRouter.get('/',async(_req,res)=>res.json((await getAllUsers()).filter(u=>u.role!=='VISITOR')));
function duties(value:any){if(!Array.isArray(value)||!value.length||new Set(value).size!==value.length||value.some(v=>!DUTIES.includes(v)))throw Error('Choose at least one valid Officer duty.');return value;}
staffRouter.post('/',async(req,res)=>{
  try{
    const b=req.body;validatePerson(b,false);const assigned=duties(b.officerDuties),email=normalizeEmail(b.email||''),phone=normalizePhilippineMobileNumber(b.mobileNumber||'');
    if((b.email&&!email)||(b.mobileNumber&&!phone)||(!email&&!phone))throw Error('Enter a valid email or Philippine mobile number.');
    if(!strongPassword(String(b.password||'')))throw Error('Use 8–128 password characters with uppercase, lowercase, a number and a symbol.');
    const badge=String(b.badgeNumber||'').trim();if(!badge||badge.length>100)throw Error('Enter the Officer’s badge or staff identifier.');
    const user=await createUser({firstName:b.firstName.trim(),middleName:String(b.middleName||'').trim(),lastName:b.lastName.trim(),suffix:b.suffix||'',dateOfBirth:b.dateOfBirth,email,mobileNumber:phone,passwordHash:await hashPass(b.password),role:'OFFICER',badgeNumber:badge,adminTitle:'Officer',accountStatus:'ACTIVE'});
    if(!user)throw Error('Could not create the Officer account.');
    await pool.query('UPDATE users SET officer_duties=? WHERE id=?',[JSON.stringify(assigned),user.id]);
    await pool.query("INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details) VALUES(?,?,'OFFICER_CREATED','USER',?,'SUCCESS',?)",[(req as any).user.id,(req as any).user.role,user.id,JSON.stringify({duties:assigned})]);
    let deliveryError='';try{const contact=pendingContact(user);if(contact)await issueCode(user,contact,`VERIFY_${contact.channel.toUpperCase()}`);}catch{deliveryError='Officer created. Contact verification delivery is unavailable; configure messaging, then use Send code after first sign-in.';}
    res.status(201).json({success:true,deliveryError});
  }catch(error:any){res.status(error.code==='ER_DUP_ENTRY'?409:400).json({error:error.code==='ER_DUP_ENTRY'?'This email or mobile number is already registered.':error.message||'Could not create the Officer account.'});}
});
staffRouter.patch('/:id',async(req,res)=>{
  const actor=(req as any).user,conn=await pool.getConnection();
  try{const assigned=duties(req.body.officerDuties),status=String(req.body.status||''),badge=String(req.body.badgeNumber||'').trim();
    if(!['ACTIVE','SUSPENDED'].includes(status)||!badge||badge.length>100)throw Error('Choose Active or Suspended and enter a valid staff identifier.');
    await conn.beginTransaction();const [rows]=await conn.query<any[]>('SELECT role,officer_duties,account_status,badge_number FROM users WHERE id=? AND is_archived=0 FOR UPDATE',[req.params.id]);
    if(!rows[0]||!['OFFICER','WORKER','GUARD','VERIFICATION_OFFICER'].includes(rows[0].role))throw Error('Only Officer accounts can be managed here.');
    await conn.query("UPDATE users SET role='OFFICER',officer_duties=?,account_status=?,badge_number=? WHERE id=?",[JSON.stringify(assigned),status,badge,req.params.id]);
    await conn.query('DELETE FROM auth_sessions WHERE user_id=?',[req.params.id]);
    await conn.query("INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details) VALUES(?,?,'OFFICER_ASSIGNMENT_UPDATED','USER',?,'SUCCESS',?)",[actor.id,actor.role,req.params.id,JSON.stringify({before:rows[0],duties:assigned,status,badgeNumber:badge})]);
    await conn.commit();req.app.emit('sessions-invalidated',req.params.id);res.json({success:true});
  }catch(error:any){await conn.rollback();res.status(400).json({error:error.message||'Could not update the Officer.'});}finally{conn.release();}
});
