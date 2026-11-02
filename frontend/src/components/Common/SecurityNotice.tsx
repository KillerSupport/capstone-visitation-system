import {useEffect,useState} from 'react';
import {api} from '../../services/api';
import {realtimeWS} from '../../services/websocket';
import {AnnouncementTicker} from './AnnouncementTicker';

export function SecurityNotice(){
 const [content,setContent]=useState('');
 useEffect(()=>{
  const load=()=>{void api.getSecurityNotice().then(r=>setContent(r.content)).catch(()=>{});};
  load();const unsubscribe=realtimeWS.on('ANNOUNCEMENT_BROADCAST',load);
  window.addEventListener('focus',load);
  return()=>{unsubscribe();window.removeEventListener('focus',load);};
 },[]);
 return <AnnouncementTicker messages={content.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}/>;
}
