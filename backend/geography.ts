import {readFileSync} from 'node:fs';
import {Router} from 'express';
// Local, versioned PSGC snapshot: available even when upstream services are offline.
const data=JSON.parse(readFileSync(new URL('./data/psgc.json',import.meta.url),'utf8'));
const administrativeGroups=new Set(data.provinces.filter((x:any)=>['PseudoProvince','SpecialGroup'].includes(x.level)).map((x:any)=>x.code));
data.provinces=data.provinces.filter((x:any)=>!administrativeGroups.has(x.code));
for(const city of data.cities)if(administrativeGroups.has(city.provinceCode))city.provinceCode='';
export function geographicOptions(kind:string,parent=''){
 if(kind==='regions')return data.regions;
 if(kind==='provinces')return data.provinces.filter((x:any)=>x.regionCode===parent);
 if(kind==='cities')return data.cities.filter((x:any)=>x.provinceCode===parent||(x.regionCode===parent&&!x.provinceCode));
 if(kind==='barangays')return data.barangays.filter((x:any)=>x.cityCode===parent||(parent==='1380600000'&&x.cityCode.startsWith('13806')));
 throw Error('Invalid geographic level.');
}
export function zipSuggestions(cityCode:string,barangayCode=''){
 const city=data.cities.find((x:any)=>x.code===cityCode);if(!city)return [];
 const province=data.provinces.find((x:any)=>x.code===city.provinceCode);
 const normalized=(name:string)=>String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const cityName=(name:string)=>normalized(name).replace(/^city of /,'').replace(/ city$/,'');
 const entries=Object.entries(data.zip_codes).filter(([,x]:any)=>cityName(x.city||x.area)===cityName(city.name)&&(!province||normalized(x.province)===normalized(province.name)));
 const suggestions=entries.map(([code,x]:any)=>({code,area:x.area}));
 const barangay=geographicOptions('barangays',cityCode).find((x:any)=>x.code===barangayCode);
 if(!barangay)return suggestions;
 // Use exact area names from the snapshot rather than guessing within a city.
 const matches=entries.filter(([,x]:any)=>{
  const locations=[x,x.source_location,...(x.locations||[])].filter(Boolean);
  return locations.some((location:any)=>String(location.area||'').split(/[/,&]/).some(area=>normalized(area)===normalized(barangay.name)));
 }).map(([code,x]:any)=>({code,area:x.area}));
 return matches.length?matches:suggestions;
}
export function validateAddress(a:any){
 if(!a||typeof a!=='object')throw Error('Enter your residential address.');
 const region=data.regions.find((x:any)=>x.code===a.regionCode);
 const city=data.cities.find((x:any)=>x.code===a.cityCode&&x.regionCode===a.regionCode);
 const province=data.provinces.find((x:any)=>x.code===a.provinceCode&&x.regionCode===a.regionCode);
 const barangay=geographicOptions('barangays',a.cityCode).find((x:any)=>x.code===a.barangayCode);
 if(!region||!city||!barangay||(city.provinceCode&&!province)||(province&&province.code!==city.provinceCode))throw Error('Choose a matching region, province (when applicable), city/municipality, and barangay.');
 if(!city.provinceCode&&a.provinceCode)throw Error('This city has no province in PSGC.');
 for(const key of ['houseNumber','streetName'])if(typeof a[key]!=='string'||!a[key].trim()||a[key].length>200)throw Error('House/building number and street are required (maximum 200 characters).');
 if(!/^\d{4}$/.test(String(a.zipCode||'')))throw Error('Enter a four-digit Philippine ZIP code.');
 if(String(a.subdivision||'').length>200)throw Error('Subdivision is too long.');
 const houseNumber=a.houseNumber.trim(),streetName=a.streetName.trim(),subdivision=String(a.subdivision||'').trim();
 const completeAddress=[houseNumber,streetName,subdivision,barangay.name,city.name,province?.name,region.name,a.zipCode].filter(Boolean).join(', ');
 return {houseNumber,streetName,subdivision,regionCode:region.code,region:region.name,provinceCode:province?.code||'',province:province?.name||'',cityCode:city.code,municipality:city.name,barangayCode:barangay.code,barangay:barangay.name,zipCode:a.zipCode,houseUnitStreet:[houseNumber,streetName,subdivision,barangay.name].filter(Boolean).join(', '),completeAddress,maritalStatus:a.maritalStatus||'Single'};
}
export const geographyRouter=Router();
geographyRouter.get('/:kind', (q,s)=>{try{s.setHeader('Cache-Control','public, max-age=86400');s.json(q.params.kind==='zips'?zipSuggestions(String(q.query.parent||''),String(q.query.barangay||'')):geographicOptions(q.params.kind,String(q.query.parent||'')))}catch{s.status(400).json({error:'Geographic data is unavailable. Please retry.'})}});
