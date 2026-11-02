export const SUFFIXES=['','Jr.','Sr.','II','III','IV','V','VI','VII','VIII','IX','X'];
export const strongPassword=(value:string)=>/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,128}$/.test(value);
export function manilaDate(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function ageOn(birth:string,today=manilaDate()):number|null {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(birth)||birth>today)return null;
 const parsed=new Date(`${birth}T00:00:00Z`);
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==birth)return null;
 const age=Number(today.slice(0,4))-Number(birth.slice(0,4))-(today.slice(5)<birth.slice(5)?1:0);
 return age>=0&&age<=125?age:null;
}
export function validatePerson(data:any,visitor=true){
 for(const field of ['firstName','lastName'])if(typeof data[field]!=='string'||!data[field].trim()||data[field].length>100)throw Error('Enter your first and last name (maximum 100 characters each).');
 if(String(data.middleName||'').length>100)throw Error('Middle name is too long.');
 if(!SUFFIXES.includes(data.suffix||''))throw Error('Choose a valid suffix.');
 const age=ageOn(String(data.dateOfBirth||''));
 if(age===null)throw Error('Enter a valid birthdate that is not in the future.');
 if(visitor&&age<18)throw Error('You must be at least 18 years old to register.');
}
const FAMILY=['Spouse','Parent','Sibling','Adult Child','Grandparent','Grandchild','Aunt','Uncle','Cousin','Common-Law Partner'];
export function companionPolicy(){
 const allowed=(process.env.COMPANION_RELATIONSHIPS||'Spouse,Parent,Sibling,Adult Child').split(',').map(x=>x.trim()).filter(x=>FAMILY.includes(x));
 const configured=Number(process.env.COMPANION_LIMIT??1);
 return {maxCompanions:Number.isInteger(configured)?Math.max(0,Math.min(configured,10)):1,relationships:allowed,minAge:20};
}
export function validateCompanions(input:any){
 if(input===undefined)return [];
 const policy=companionPolicy();
 if(!Array.isArray(input)||input.length>policy.maxCompanions)throw Error(`A maximum of ${policy.maxCompanions} companion(s) is allowed.`);
 return input.map(x=>{
  if(typeof x.fullName!=='string'||!x.fullName.trim()||x.fullName.length>255)throw Error('Enter the companion full name.');
  const age=ageOn(String(x.dateOfBirth||''));if(age===null||age<20)throw Error('Companions must be at least 20 years old.');
  if(!policy.relationships.includes(x.relationshipToPdl))throw Error('Only approved family companions are allowed.');
  if(String(x.relationshipToVisitor||'').length>100)throw Error('Companion relationship is too long.');
  return {fullName:x.fullName.trim(),dateOfBirth:x.dateOfBirth,relationshipToPdl:x.relationshipToPdl,relationshipToVisitor:String(x.relationshipToVisitor||'').trim(),verificationStatus:'PENDING'};
 });
}
export function withinVisitWindow(date:string,slot:string,now=new Date()){
 const day=manilaDate(now);const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Manila',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now).split(':').map(Number);
 const minute=parts[0]*60+parts[1];
 return day===date&&(slot==='Visiting hours (08:00 AM - 04:00 PM)'?minute>=480&&minute<960:slot==='Morning Batch (09:00 AM - 11:30 AM)'?minute>=540&&minute<=690:slot==='Afternoon Batch (01:00 PM - 03:30 PM)'?minute>=780&&minute<=930:false);
}
