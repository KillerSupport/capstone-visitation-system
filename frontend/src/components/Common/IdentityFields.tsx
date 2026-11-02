import React,{useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
export const SUFFIXES=['','Jr.','Sr.','II','III','IV','V','VI','VII','VIII','IX','X'];
export function todayInManila(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
export function birthdateCutoff(minimumAge:number,today=todayInManila()){
 const [year,month,day]=today.split('-').map(Number),birthYear=year-minimumAge;
 const birthDay=Math.min(day,new Date(Date.UTC(birthYear,month,0)).getUTCDate());
 return `${birthYear}-${String(month).padStart(2,'0')}-${String(birthDay).padStart(2,'0')}`;
}
export function ageFromBirthdate(birth:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(birth)||birth>todayInManila())return null;const d=new Date(birth+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==birth)return null;const today=todayInManila();return Number(today.slice(0,4))-Number(birth.slice(0,4))-(today.slice(5)<birth.slice(5)?1:0)}
export function mobileDigits(phone:string){return phone.startsWith('+63')?phone.slice(3):phone.startsWith('0')?phone.slice(1):phone}
export function MobileInput({value,onChange,className='',required=false}:{value:string;onChange:(value:string)=>void;className?:string;required?:boolean}){
 return <span className="flex items-center gap-2"><span className="shrink-0 rounded border border-current/20 px-3 py-3" aria-label="Philippine country code">+63</span><input aria-label="Mobile number, 10 digits starting with 9" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} pattern="9[0-9]{9}" required={required} value={value} onChange={e=>{const next=e.target.value;if(/^\d{0,10}$/.test(next)&&(next===''||next.startsWith('9')))onChange(next)}} className={className} placeholder="9123456789"/></span>
}
export function SuffixSelect({value,onChange,className=''}:{value:string;onChange:(value:string)=>void;className?:string}){return <select aria-label="Suffix (optional)" className={className} value={value} onChange={e=>onChange(e.target.value)}>{SUFFIXES.map(x=><option key={x} value={x}>{x||'None / Not Applicable'}</option>)}</select>}
export function PasswordInput(props:React.InputHTMLAttributes<HTMLInputElement>){const [visible,setVisible]=useState(false);return <span className="relative block"><input {...props} type={visible?'text':'password'} style={{...props.style,paddingRight:'3rem'}}/><button type="button" aria-label={visible?'Hide password':'Show password'} aria-pressed={visible} onClick={()=>setVisible(!visible)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center">{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></span>}
