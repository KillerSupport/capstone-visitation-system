import {dispatchScheduleNotifications} from './visitation.js';
import { pool } from './database/db.js';
import { deliverMessage, DeliveryUnavailable, type ContactChannel } from './messaging.js';
export interface NotificationStatus {channel:ContactChannel;status:string;}
export async function sendAppointmentNotifications(appointmentId:string):Promise<NotificationStatus[]> {
 const [jobs]=await pool.query<any[]>('SELECT n.*,a.status AS appointment_status,a.is_archived FROM appointment_notifications n JOIN appointments a ON a.id=n.appointment_id WHERE n.appointment_id=?',[appointmentId]);
 await Promise.all(jobs.map(async job=>{
  if(!['PENDING','NOT_CONFIGURED'].includes(job.status))return;
  const [claim]=await pool.query<any>('UPDATE appointment_notifications SET status=\'SENDING\',updated_at=NOW() WHERE id=? AND status IN (\'PENDING\',\'NOT_CONFIGURED\')',[job.id]);
  if(!claim.affectedRows)return;
  if(job.appointment_status!=='Approved'||job.is_archived){await pool.query('UPDATE appointment_notifications SET status=\'CANCELLED\',updated_at=NOW() WHERE id=?',[job.id]);return;}
  try {
   const result=await deliverMessage({channel:job.channel,destination:job.destination},'BJMP visitation appointment confirmed',job.message);
   await pool.query('UPDATE appointment_notifications SET status=?,provider_id=?,attempts=attempts+1,last_error=NULL,updated_at=NOW() WHERE id=?',[result.status,result.providerId||null,job.id]);
  } catch(error) {
   const status=error instanceof DeliveryUnavailable?'NOT_CONFIGURED':'FAILED';
   await pool.query('UPDATE appointment_notifications SET status=?,last_error=?,attempts=attempts+?,updated_at=NOW() WHERE id=?',[status,status==='NOT_CONFIGURED'?`${job.channel==='sms'?'SMS':'Email'} delivery is not configured.`:'The confirmation could not be sent. Check the delivery service before retrying.',status==='FAILED'?1:0,job.id]);
  }
 }));
 const [rows]=await pool.query<any[]>('SELECT channel,status FROM appointment_notifications WHERE appointment_id=?',[appointmentId]);
 return rows;
}
export function startNotificationDispatcher() {
 let busy=false;
 const dispatch=async()=>{if(busy)return;busy=true;try{await dispatchScheduleNotifications();}catch{console.error('Schedule notification dispatch is temporarily unavailable.');}finally{busy=false;}};
 const timer=setInterval(()=>void dispatch(),30000);timer.unref();void dispatch();return()=>clearInterval(timer);
}
