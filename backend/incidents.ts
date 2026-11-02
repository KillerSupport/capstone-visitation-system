import {Router} from 'express';
import {pool} from './database/db.js';
import {admin} from './auth.js';
export function validateIncident(body:any){
  const value:any={};
  for(const [field,max] of [['visitorName',255],['facility',200],['description',5000],['actionTaken',5000]] as const){
    if(typeof body[field]!=='string'||!body[field].trim()||body[field].length>max)throw Error('Provide the visitor, facility, description and action taken within the field limits.');
    value[field]=body[field].trim();
  }
  if(!['Contraband Interception','Dress Code Non-Compliance','Fake/Expired ID','Unauthorized Relationship'].includes(body.incidentType))throw Error('Choose a valid incident classification.');
  return {...value,incidentType:body.incidentType};
}
export const incidentRouter=Router();incidentRouter.use(admin);
incidentRouter.get('/:id/history',async(req,res)=>{
  const [rows]=await pool.query<any[]>("SELECT a.id,a.action,a.details,a.created_at,CONCAT_WS(' ',u.first_name,u.last_name) AS officer FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id WHERE a.target_type='SECURITY_INCIDENT' AND a.target_id=? ORDER BY a.id DESC",[req.params.id]);res.json(rows);
});
incidentRouter.patch('/:id',async(req,res)=>{
  let data:any;const reason=String(req.body.reason||'').trim();
  try{data=validateIncident(req.body);if(!reason||reason.length>1000)throw Error('Provide the correction or follow-up reason.');}catch(error:any){return res.status(400).json({error:error.message});}
  const conn=await pool.getConnection(),actor=(req as any).user;
  try{await conn.beginTransaction();const [rows]=await conn.query<any[]>('SELECT * FROM security_incidents WHERE id=? AND is_archived=0 FOR UPDATE',[req.params.id]);
    if(!rows[0]){await conn.rollback();return res.status(404).json({error:'Active incident not found.'});}
    await conn.query('UPDATE security_incidents SET visitor_name=?,facility=?,incident_type=?,description=?,action_taken=? WHERE id=?',[data.visitorName,data.facility,data.incidentType,data.description,data.actionTaken,req.params.id]);
    await conn.query("INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details) VALUES(?,?,'INCIDENT_UPDATED','SECURITY_INCIDENT',?,'SUCCESS',?)",[actor.id,actor.role,req.params.id,JSON.stringify({before:rows[0],after:data,reason})]);
    await conn.commit();const [saved]=await pool.query<any[]>('SELECT * FROM security_incidents WHERE id=?',[req.params.id]);res.json({success:true,incident:saved[0]});
  }catch{await conn.rollback();res.status(500).json({error:'Could not save the incident follow-up.'});}finally{conn.release();}
});
