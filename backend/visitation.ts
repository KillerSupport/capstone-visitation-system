import {Router} from 'express';
import {randomBytes,randomUUID} from 'node:crypto';
import type {PoolConnection} from 'mysql2/promise';
import {pool,getAllAppointments} from './database/db.js';
import {admin} from './auth.js';
import {manilaDate,validateCompanions} from './validation.js';
import {appointmentConfirmation,deliverMessage,DeliveryUnavailable} from './messaging.js';

export const VISITING_HOURS='Visiting hours (08:00 AM - 04:00 PM)';
export const WEEKDAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export function dateWeekday(value:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Choose a valid visit date.');
  const date=new Date(value+'T00:00:00Z');
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw Error('Choose a valid visit date.');
  return date.getUTCDay();
}
const dayOnly=(value:any)=>value instanceof Date?`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`:String(value||'').slice(0,10);
async function audit(conn:PoolConnection,actor:any,action:string,type:string,id:string,details:any){
  await conn.query('INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details) VALUES(?,?,?,?,?,?,?)',[actor.id,actor.role,action,type,id,'SUCCESS',JSON.stringify(details)]);
}
export async function queueScheduleNotice(conn:PoolConnection,pdlId:string,eventKey:string,userId?:string){
  const [rows]=await conn.query<any[]>(`SELECT u.id,u.email,u.mobile_number,u.email_verified_at,u.phone_verified_at,
    CONCAT_WS(' ',p.first_name,p.middle_name,p.last_name,p.suffix) AS pdl_name,s.weekday
    FROM pdl_visitor_links l JOIN users u ON u.id=l.user_id JOIN pdls p ON p.id=l.pdl_id
    LEFT JOIN pdl_visitation_schedules s ON s.pdl_id=p.id
    WHERE l.pdl_id=? AND l.is_active=1 AND u.is_archived=0 AND p.is_archived=0 ${userId?'AND u.id=?':''}`,[pdlId,...(userId?[userId]:[])]);
  for(const row of rows){
    const message=`BJMP Imus City Jail: You are on the approved visitor list for ${row.pdl_name}. ${row.weekday===null?'The weekly visitation day has not yet been assigned.':`Assigned day: ${WEEKDAYS[row.weekday]}, 8:00 a.m. to 4:00 p.m. Select an eligible upcoming date in your account.`} If a previous date was cancelled after a schedule change, select a new eligible date. Bring your original ID. Account activation, fingerprint and QR checks are still required for entry.`;
    for(const [channel,destination] of [['email',row.email_verified_at?row.email:null],['sms',row.phone_verified_at?row.mobile_number:null]])if(destination){
      await conn.query('INSERT IGNORE INTO pdl_schedule_notifications(event_key,user_id,pdl_id,channel,destination,message) VALUES(?,?,?,?,?,?)',[eventKey,row.id,pdlId,channel,destination,message]);
    }
  }
}
type VisitConfirmation = {
  id: string;
  pdlId: string;
  userId: string;
  visitDate: string;
  timeSlot: string;
  appointmentReference: string;
  jailFacilityName: string;
};

export async function queueVisitConfirmation(conn: PoolConnection, visit: VisitConfirmation, changed: boolean) {
  const [users] = await conn.query<any[]>(
    'SELECT email,mobile_number,email_verified_at,phone_verified_at FROM users WHERE id=? AND is_archived=0', [visit.userId],
  );
  const user = users[0];
  const message = appointmentConfirmation(visit, changed);
  const eventKey = randomUUID();
  if (changed) {
    await conn.query("UPDATE pdl_schedule_notifications SET status='CANCELLED',updated_at=NOW() WHERE appointment_id=? AND status IN ('PENDING','NOT_CONFIGURED')", [visit.id]);
  }
  for (const [channel, destination] of [
    ['email', user?.email_verified_at && user.email],
    ['sms', user?.phone_verified_at && user.mobile_number],
  ]) {
    if (destination) {
      await conn.query('INSERT INTO pdl_schedule_notifications(event_key,user_id,pdl_id,appointment_id,channel,destination,message) VALUES(?,?,?,?,?,?,?)',
        [eventKey, visit.userId, visit.pdlId, visit.id, channel, destination, message]);
    }
  }
}

let activeDispatch:Promise<void>|null=null;
export function dispatchScheduleNotifications(){
  if(activeDispatch)return activeDispatch;
  activeDispatch=dispatchNotifications().finally(()=>{activeDispatch=null;});return activeDispatch;
}
async function dispatchNotifications(){

    const [jobs]=await pool.query<any[]>(`SELECT n.* FROM pdl_schedule_notifications n WHERE status='PENDING' OR (status='NOT_CONFIGURED' AND updated_at<DATE_SUB(NOW(),INTERVAL 1 MINUTE)) ORDER BY id LIMIT 40`);
    for(const job of jobs){
      const [claim]=await pool.query<any>("UPDATE pdl_schedule_notifications SET status='SENDING',updated_at=NOW() WHERE id=? AND status IN ('PENDING','NOT_CONFIGURED')",[job.id]);if(!claim.affectedRows)continue;
      const [current]=await pool.query<any[]>(`SELECT u.email,u.mobile_number,u.email_verified_at,u.phone_verified_at FROM users u JOIN pdl_visitor_links l ON l.user_id=u.id JOIN pdls p ON p.id=l.pdl_id WHERE u.id=? AND l.pdl_id=? AND l.is_active=1 AND u.is_archived=0 AND p.is_archived=0`,[job.user_id,job.pdl_id]);
      const contact=current[0],valid=job.channel==='email'?contact?.email_verified_at&&contact.email===job.destination:contact?.phone_verified_at&&contact.mobile_number===job.destination;
      const [visits] = job.appointment_id
        ? await pool.query<any[]>("SELECT id FROM appointments WHERE id=? AND status='Approved' AND is_archived=0 AND visit_date>=?", [job.appointment_id, manilaDate()])
        : [[]];
      if(!valid || (job.appointment_id && !visits.length)){await pool.query("UPDATE pdl_schedule_notifications SET status='CANCELLED',updated_at=NOW() WHERE id=?",[job.id]);continue;}
      try{
        const result=await deliverMessage({channel:job.channel,destination:job.destination},job.appointment_id?'BJMP visitation date confirmation':'BJMP linked PDL and visitation schedule',job.message);
        await pool.query('UPDATE pdl_schedule_notifications SET status=?,provider_id=?,attempts=attempts+1,last_error=NULL,updated_at=NOW() WHERE id=?',[result.status,result.providerId||null,job.id]);
      }catch(error){await pool.query('UPDATE pdl_schedule_notifications SET status=?,last_error=?,attempts=attempts+1,updated_at=NOW() WHERE id=?',[error instanceof DeliveryUnavailable?'NOT_CONFIGURED':'FAILED','Schedule notification delivery is unavailable.',job.id]);}
    }

}

// Called inside booking/check-in transactions; membership and day are checked again at entry.
export async function assertPdlEligibility(conn:PoolConnection,pdlId:string,userId:string,date:string,version?:number,companions:any[]=[]){
  const [pdls]=await conn.query<any[]>('SELECT id FROM pdls WHERE id=? AND is_archived=0 AND status=\'In Custody\' FOR UPDATE',[pdlId]);
  if(!pdls[0])throw Error('This PDL is not currently available for visits.');
  const [rows]=await conn.query<any[]>('SELECT s.weekday,s.version,l.relationship FROM pdl_visitation_schedules s JOIN pdl_visitor_links l ON l.pdl_id=s.pdl_id WHERE s.pdl_id=? AND l.user_id=? AND l.is_active=1',[pdlId,userId]);
  const row=rows[0];
  if(!row)throw Error('An approved PDL connection and an assigned visitation day are required.');
  if(dateWeekday(date)!==Number(row.weekday))throw Error(`Choose an eligible ${WEEKDAYS[row.weekday]} for this PDL.`);
  if(version!==undefined&&Number(version)!==Number(row.version))throw Error('The assigned schedule changed. Select a new eligible visit date.');
  const [allowed]=await conn.query<any[]>(`SELECT u.id,CONCAT_WS(' ',u.first_name,u.middle_name,u.last_name,u.suffix) AS name,u.date_of_birth,l.relationship,u.account_status FROM pdl_visitor_links l JOIN users u ON u.id=l.user_id WHERE l.pdl_id=? AND l.is_active=1 AND u.is_archived=0`,[pdlId]);
  const used=new Set([String(userId)]);
  for(const companion of companions){
    const person=allowed.find(p=>p.name.toLowerCase().replace(/\s+/g,' ').trim()===String(companion.fullName).toLowerCase().replace(/\s+/g,' ').trim()&&dayOnly(p.date_of_birth)===companion.dateOfBirth);
    if(!person||used.has(String(person.id))||!['ACTIVE','ACTIVATED'].includes(person.account_status))throw Error('Each companion must be a different active adult on this PDL’s approved visitor list.');
    used.add(String(person.id));companion.userId=String(person.id);
  }
  return row;
}

export const visitationRouter=Router();
visitationRouter.get('/admin',admin,async(_req,res)=>{
  try{
    const [policy]=await pool.query<any[]>('SELECT visitor_limit FROM visitation_policy WHERE id=1');
    const [schedules]=await pool.query<any[]>('SELECT * FROM pdl_visitation_schedules');
    const [links]=await pool.query<any[]>('SELECT l.*,CONCAT_WS(\' \',u.first_name,u.middle_name,u.last_name,u.suffix) AS visitor_name,u.account_status FROM pdl_visitor_links l JOIN users u ON u.id=l.user_id ORDER BY l.approved_at DESC');
    const [notifications]=await pool.query<any[]>('SELECT id,user_id,pdl_id,channel,status,attempts,last_error,created_at FROM pdl_schedule_notifications ORDER BY id DESC LIMIT 100');
    res.json({visitorLimit:policy[0].visitor_limit,schedules,links,notifications});
  }catch{res.status(500).json({error:'Could not load visitor authorization settings.'});}
});
visitationRouter.put('/policy',admin,async(req,res)=>{
  const limit=Number(req.body.visitorLimit);if(!Number.isInteger(limit)||limit<1||limit>100)return res.status(400).json({error:'Choose a visitor-list limit from 1 to 100.'});
  const conn=await pool.getConnection();try{await conn.beginTransaction();await conn.query('SELECT id FROM visitation_policy WHERE id=1 FOR UPDATE');
    const [over]=await conn.query<any[]>('SELECT pdl_id FROM pdl_visitor_links WHERE is_active=1 GROUP BY pdl_id HAVING COUNT(*)>?',[limit]);
    if(over.length)throw Error('Archive excess approved connections before lowering the limit.');
    await conn.query('UPDATE visitation_policy SET visitor_limit=? WHERE id=1',[limit]);await audit(conn,(req as any).user,'VISITOR_LIMIT_UPDATED','POLICY','1',{limit});await conn.commit();res.json({success:true});
  }catch(error:any){await conn.rollback();res.status(400).json({error:error.message||'Could not update the visitor limit.'});}finally{conn.release();}
});
visitationRouter.put('/pdls/:id/day',admin,async(req,res)=>{
  const day=Number(req.body.weekday),reason=String(req.body.reason||'').trim();if(!Number.isInteger(day)||day<0||day>6||!reason||reason.length>1000)return res.status(400).json({error:'Choose a weekly day and provide the schedule-change reason.'});
  const conn=await pool.getConnection();try{await conn.beginTransaction();
    const [p]=await conn.query<any[]>('SELECT id FROM pdls WHERE id=? AND is_archived=0 FOR UPDATE',[req.params.id]);if(!p[0])throw Error('PDL record not found.');
    const [old]=await conn.query<any[]>('SELECT * FROM pdl_visitation_schedules WHERE pdl_id=?',[req.params.id]);
    if(old[0]?.weekday===day){await conn.rollback();return res.json({success:true,unchanged:true});}
    await conn.query('INSERT INTO pdl_visitation_schedules(pdl_id,weekday,updated_by) VALUES(?,?,?) ON DUPLICATE KEY UPDATE weekday=VALUES(weekday),version=version+1,updated_by=VALUES(updated_by),updated_at=NOW()',[req.params.id,day,(req as any).user.id]);
    // Historical entry records remain intact. Upcoming selections must follow the new day.
    await conn.query("UPDATE appointments SET status='Cancelled' WHERE pdl_id=? AND is_archived=0 AND checked_in_at IS NULL AND visit_date>=? AND status IN ('Approved','Pending Review')",[req.params.id,manilaDate()]);
    await conn.query('DELETE g FROM gate_verification_sessions g JOIN appointments a ON a.id=g.appointment_id WHERE a.pdl_id=? AND g.consumed_at IS NULL',[req.params.id]);
    await queueScheduleNotice(conn,req.params.id,'schedule:'+randomUUID());
    await audit(conn,(req as any).user,'PDL_VISITATION_DAY_UPDATED','PDL',req.params.id,{previousDay:old[0]?.weekday??null,weekday:day,reason});await conn.commit();req.app.emit('visitation-changed');res.json({success:true});
  }catch(error:any){await conn.rollback();res.status(400).json({error:error.message||'Could not assign the visitation day.'});}finally{conn.release();}
});
visitationRouter.post('/pdls/:id/visitors',admin,async(req,res)=>{
  const userId=String(req.body.userId||''),relationship=String(req.body.relationship||'').trim();
  if(!['Spouse','Parent','Child','Sibling','Legal Counsel','Relative','Common-Law Partner'].includes(relationship))return res.status(400).json({error:'Choose a valid relationship to the PDL.'});
  const conn=await pool.getConnection();try{await conn.beginTransaction();const [policy]=await conn.query<any[]>('SELECT visitor_limit FROM visitation_policy WHERE id=1 FOR UPDATE');
    const [p]=await conn.query<any[]>('SELECT id FROM pdls WHERE id=? AND is_archived=0 FOR UPDATE',[req.params.id]);if(!p[0])throw Error('PDL record not found.');
    const [u]=await conn.query<any[]>("SELECT id FROM users WHERE id=? AND role='VISITOR' AND is_archived=0 AND account_status IN ('ACTIVE','ACTIVATED') AND biometric_scanned_at IS NOT NULL",[userId]);if(!u[0])throw Error('Choose an activated visitor with recorded fingerprint enrollment.');
    const [existing]=await conn.query<any[]>('SELECT is_active FROM pdl_visitor_links WHERE pdl_id=? AND user_id=?',[req.params.id,userId]);if(existing[0]?.is_active)throw Error('This visitor is already on the approved list.');
    const [count]=await conn.query<any[]>('SELECT COUNT(*) AS n FROM pdl_visitor_links WHERE pdl_id=? AND is_active=1',[req.params.id]);if(Number(count[0].n)>=Number(policy[0].visitor_limit))throw Error('This PDL’s approved visitor list is full.');
    await conn.query('INSERT INTO pdl_visitor_links(pdl_id,user_id,relationship,approved_by) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE relationship=VALUES(relationship),approved_by=VALUES(approved_by),approved_at=NOW(),is_active=1,archived_at=NULL,archived_by=NULL,archive_reason=NULL',[req.params.id,userId,relationship,(req as any).user.id]);
    await queueScheduleNotice(conn,req.params.id,'link:'+randomUUID(),userId);await audit(conn,(req as any).user,'PDL_VISITOR_APPROVED','PDL',req.params.id,{userId,relationship});await conn.commit();req.app.emit('visitation-changed');res.status(201).json({success:true});
  }catch(error:any){await conn.rollback();res.status(400).json({error:error.message||'Could not approve this connection.'});}finally{conn.release();}
});
visitationRouter.post('/pdls/:id/visitors/:userId/archive',admin,async(req,res)=>{
  const reason=String(req.body.reason||'').trim();if(!reason||reason.length>1000)return res.status(400).json({error:'Provide an archive reason.'});
  const conn=await pool.getConnection();try{await conn.beginTransaction();await conn.query('SELECT id FROM pdls WHERE id=? FOR UPDATE',[req.params.id]);
    const [r]=await conn.query<any>('UPDATE pdl_visitor_links SET is_active=0,archived_at=NOW(),archived_by=?,archive_reason=? WHERE pdl_id=? AND user_id=? AND is_active=1',[(req as any).user.id,reason,req.params.id,req.params.userId]);if(!r.affectedRows)throw Error('Active connection not found.');
    await conn.query("UPDATE appointments SET status='Cancelled' WHERE pdl_id=? AND user_id=? AND checked_in_at IS NULL AND visit_date>=? AND status IN ('Approved','Pending Review')",[req.params.id,req.params.userId,manilaDate()]);
    await audit(conn,(req as any).user,'PDL_VISITOR_ARCHIVED','PDL',req.params.id,{userId:req.params.userId,reason});await conn.commit();req.app.emit('visitation-changed');res.json({success:true});
  }catch(error:any){await conn.rollback();res.status(400).json({error:error.message||'Could not archive this connection.'});}finally{conn.release();}
});
